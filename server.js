const http = require("http");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const { generatePdf, generateQuotationHtml } = require("./pdf-generator");

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

async function handleSql(req, res) {
  try {
    if (!pool) {
      sendJson(res, 503, { error: "DATABASE_URL is not configured" });
      return;
    }

    const body = await readBody(req);
    const payload = JSON.parse(body || "{}");
    const sql = typeof payload.sql === "string" ? payload.sql : "";
    const params = Array.isArray(payload.params) ? payload.params : [];

    if (!sql.trim()) {
      sendJson(res, 400, { error: "SQL statement is required" });
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
  if (req.method === "POST" && req.url === "/api/generate-pdf") {
    handleGeneratePdf(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/generate-quotation-html") {
    handleGenerateQuotationHtml(req, res);
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/api/sql")) {
    handleSql(req, res);
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
