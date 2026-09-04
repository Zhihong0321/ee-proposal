const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const { generatePdf, generateQuotationHtml } = require("./pdf-generator");
const { getSql } = require("./queries");

const root = __dirname;
const port = Number(process.env.PORT || 4175);
const host = process.env.HOST || "0.0.0.0";
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl:
        process.env.DATABASE_SSL === "false" || process.env.PGSSLMODE === "disable"
          ? false
          : { rejectUnauthorized: false },
    })
  : null;

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const proposalPages = new Set(["proposal.html", "tiger-neo3.html", "why-eternalgy.html", "quotation.html"]);
const activityWindows = new Map();

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((item) => item.trim().split(/=(.*)/s, 2))
      .filter(([key]) => key)
      .map(([key, value]) => [key, decodeURIComponent(value || "")]),
  );
}

function getVisitorId(req, res) {
  const existing = parseCookies(req).ee_proposal_visitor;
  if (/^[0-9a-f-]{36}$/i.test(existing || "")) return existing;

  const visitorId = crypto.randomUUID();
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const isSecure = Boolean(req.socket.encrypted) || forwardedProto === "https";
  res.setHeader(
    "Set-Cookie",
    `ee_proposal_visitor=${visitorId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${isSecure ? "; Secure" : ""}`,
  );
  return visitorId;
}

function requestIp(req) {
  const cloudflareIp = String(req.headers["cf-connecting-ip"] || "").trim();
  const forwardedIp = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return cloudflareIp || forwardedIp || req.socket.remoteAddress || null;
}

function browserDetails(userAgent) {
  const ua = String(userAgent || "");
  const browser = /edg\//i.test(ua)
    ? "Edge"
    : /opr\//i.test(ua)
      ? "Opera"
      : /firefox\//i.test(ua)
        ? "Firefox"
        : /chrome\//i.test(ua) || /crios\//i.test(ua)
          ? "Chrome"
          : /safari\//i.test(ua)
            ? "Safari"
            : "Unknown";
  const androidModel = ua.match(/;\\s*([^;()]+?)\\s+Build\\//i)?.[1]?.trim();
  const device = /ipad/i.test(ua)
    ? "iPad"
    : /iphone/i.test(ua)
      ? "iPhone"
      : /android/i.test(ua)
        ? androidModel || (/mobile/i.test(ua) ? "Android phone" : "Android tablet")
        : /windows nt/i.test(ua)
          ? "Windows PC"
          : /macintosh/i.test(ua)
            ? "Mac"
            : /linux/i.test(ua)
              ? "Linux device"
              : "Unknown device";
  return { browser, device };
}

function cleanIdentifier(value, maxLength = 80) {
  const normalized = String(value || "").trim().toLowerCase();
  return /^[a-z0-9:_-]{1,80}$/.test(normalized) && normalized.length <= maxLength ? normalized : "";
}

function allowActivityEvent(visitorId) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxEvents = 120;
  const recent = (activityWindows.get(visitorId) || []).filter((timestamp) => timestamp > now - windowMs);
  if (recent.length >= maxEvents) return false;
  recent.push(now);
  activityWindows.set(visitorId, recent);
  return true;
}

async function handleProposalActivity(req, res) {
  try {
    if (!pool) {
      sendJson(res, 503, { error: "DATABASE_URL is not configured" });
      return;
    }

    const payload = JSON.parse((await readBody(req)) || "{}");
    const event = payload.event === "view" || payload.event === "interact" ? payload.event : "";
    const page = String(payload.page || "").trim();
    const interaction = cleanIdentifier(payload.interaction);
    const entityId = String(payload.uid || "").trim().slice(0, 128);
    const durationSeconds = Number(payload.duration_seconds);
    const safeDuration = Number.isFinite(durationSeconds)
      ? Math.max(0, Math.min(Math.round(durationSeconds), 86_400))
      : null;

    if (!event || !proposalPages.has(page) || (event === "interact" && !interaction)) {
      sendJson(res, 400, { error: "Invalid proposal activity event" });
      return;
    }

    const visitorId = getVisitorId(req, res);
    if (!allowActivityEvent(visitorId)) {
      sendJson(res, 429, { error: "Too many activity events" });
      return;
    }

    const userAgent = String(req.headers["user-agent"] || "").slice(0, 2_000);
    const sourceUrl = new URL(req.headers.referer || "/shell.html", "http://proposal.local").pathname;
    const metadata = {
      page,
      ...(interaction ? { interaction } : {}),
      ...(safeDuration !== null ? { duration_seconds: safeDuration } : {}),
      ...browserDetails(userAgent),
      language: String(payload.language || "").slice(0, 10) || null,
    };

    await pool.query(
      `insert into public.activity_log (
        app, app_env, source_url, actor_kind, actor_ref, action,
        entity_type, entity_id, entity_label, description, fields, status,
        request_id, ip, user_agent, metadata
      ) values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16::jsonb
      )`,
      [
        "agent-os",
        process.env.NODE_ENV || "production",
        sourceUrl,
        "visitor",
        visitorId,
        event,
        "proposal",
        entityId || "public",
        page,
        event === "view" ? `Viewed ${page}` : `Interacted with ${page}`,
        event === "view" ? ["page"] : ["interaction"],
        "success",
        crypto.randomUUID(),
        requestIp(req),
        userAgent || null,
        JSON.stringify(metadata),
      ],
    );

    sendJson(res, 202, { recorded: true });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Unable to record proposal activity" });
  }
}

async function handleQuery(req, res) {
  try {
    if (!pool) {
      sendJson(res, 503, { error: "DATABASE_URL is not configured" });
      return;
    }

    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const name = typeof payload.name === "string" ? payload.name : "";
    const sql = getSql(name);
    const params = Array.isArray(payload.params) ? payload.params : [];

    if (!sql) {
      sendJson(res, 404, { error: "Unknown query" });
      return;
    }

    const result = await pool.query(sql, params);
    sendJson(res, 200, {
      rows: result.rows || [],
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Database request failed" });
  }
}

async function handleGeneratePdf(req, res) {
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const uid = typeof payload.uid === "string" ? payload.uid.trim() : "";
    const lang = payload.lang === "zh" ? "zh" : "en";

    if (!uid) {
      sendJson(res, 400, { error: "Invoice UID is required" });
      return;
    }

    const pdf = await generatePdf(uid, lang);

    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="eternalgy-proposal-${uid}.pdf"`,
      "Content-Length": pdf.length,
      "Cache-Control": "no-store",
    });
    res.end(pdf);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "PDF generation failed" });
  }
}

async function handleGenerateQuotationHtml(req, res) {
  try {
    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const uid = typeof payload.uid === "string" ? payload.uid.trim() : "";

    if (!uid) {
      sendJson(res, 400, { error: "Invoice UID is required" });
      return;
    }

    const html = await generateQuotationHtml(uid);
    const buf = Buffer.from(html, "utf-8");

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="quotation-${uid}.html"`,
      "Content-Length": buf.length,
      "Cache-Control": "no-store",
    });
    res.end(buf);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "HTML generation failed" });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/proposal.html" : decodeURIComponent(url.pathname);
  const resolved = path.resolve(root, `.${requested}`);

  if (path.extname(resolved).toLowerCase() === ".html") {
    getVisitorId(req, res);
  }

  if (!resolved.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(resolved, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": types[path.extname(resolved).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/activity/proposal") {
    handleProposalActivity(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate-pdf") {
    handleGeneratePdf(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate-quotation-html") {
    handleGenerateQuotationHtml(req, res);
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/api/query")) {
    handleQuery(req, res);
    return;
  }

  if (req.url.startsWith("/api/sql")) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, host, () => {
  console.log(`Eternalgy mobile site running at http://${host}:${port}/index.html`);
});
