const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const root = path.resolve(__dirname);
const pdfDir = path.join(root, "html_to_pdf");

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

// ── helpers ──
const nonEmpty = (value, fallback = "") => {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text && text.toLowerCase() !== "null" ? text : fallback;
};

const numberValue = (...values) => {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return 0;
};

const findField = (row, candidates) => {
  if (!row) return "";
  for (const key of candidates) {
    if (nonEmpty(row[key])) return row[key];
  }
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const lowered = candidate.toLowerCase();
    const match = entries.find(([key, value]) => key.toLowerCase().includes(lowered) && nonEmpty(value));
    if (match) return match[1];
  }
  return "";
};

// ── SQL ──
async function runSql(sql, params = []) {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  const result = await pool.query(sql, params);
  return result.rows || [];
}

async function fetchOptionalProducts(references) {
  const refs = [...new Set(references.map(nonEmpty).filter(Boolean))];
  if (!refs.length) return [];
  try {
    return await runSql(
      `select * from product where id::text = any($1::text[]) or bubble_id = any($1::text[]) or unique_id = any($1::text[])`,
      [refs]
    );
  } catch (_) {
    return [];
  }
}

async function fetchOptionalCustomer(reference) {
  const ref = nonEmpty(reference);
  if (!ref) return null;
  try {
    const rows = await runSql(
      `select * from customer where id::text = $1 or customer_id = $1 limit 1`,
      [ref]
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

async function fetchOptionalAgent(reference) {
  const ref = nonEmpty(reference);
  if (!ref) return null;
  try {
    const rows = await runSql(
      `select name, contact, email, user_signature from "user" where linked_agent_profile = $1 limit 1`,
      [ref]
    );
    return rows[0] || null;
  } catch (_) {
    return null;
  }
}

function productByReference(products, reference) {
  const ref = nonEmpty(reference);
  if (!ref) return null;
  return products.find(
    (p) => String(p.id) === ref || nonEmpty(p.bubble_id) === ref || nonEmpty(p.unique_id) === ref
  ) || null;
}

function productName(product, fallback) {
  return nonEmpty(findField(product, ["product_name", "name", "model", "title", "description", "product"]), fallback);
}

function productWarranty(product, fallback) {
  return nonEmpty(findField(product, ["product_warranty", "product_warranty_desc", "warranty", "warranty_year", "warranty_years", "linear_power_warranty", "power_warranty"]), fallback);
}

// ── fetch invoice bundle ──
async function fetchInvoiceBundle(uid) {
  const invoiceUid = nonEmpty(uid);
  if (!invoiceUid) throw new Error("Invoice UID is required");

  const rows = await runSql(
    `select i.*, p.id as package_db_id, p.bubble_id as package_bubble_id, p.package_name,
      p.panel_qty as package_panel_qty, p.panel as package_panel,
      p.inverter_1 as package_inverter_1, p.inverter_2 as package_inverter_2,
      p.inverter_3 as package_inverter_3, p.inverter_4 as package_inverter_4,
      p.price as package_price, p.linked_package_item as package_items,
      it.terms_and_conditions as template_terms_and_conditions
    from invoice i
    left join package p on p.id::text = i.linked_package or p.bubble_id = i.linked_package
      or p.id::text = i.package_id or p.bubble_id = i.package_id
    left join invoice_template it on it.bubble_id = i.template_id
      or (lower(coalesce(i.template_id, '')) = 'default' and it.is_default is true and it.active is distinct from false)
    where (i.bubble_id = $1 or i.id::text = $1 or i.invoice_number = $1)
      and i.is_deleted is distinct from true
    order by i.is_latest desc nulls last, i.updated_at desc nulls last, i.id desc
    limit 1`,
    [invoiceUid]
  );

  if (!rows[0]) throw new Error(`Invoice not found for UID ${invoiceUid}`);

  const row = rows[0];
  const productRefs = [row.package_panel, row.package_inverter_1, row.package_inverter_2, row.package_inverter_3, row.package_inverter_4];
  const [products, customer, agent] = await Promise.all([
    fetchOptionalProducts(productRefs),
    fetchOptionalCustomer(row.linked_customer),
    fetchOptionalAgent(row.linked_agent),
  ]);

  const DEFAULT_PANEL_MODEL = "650W JinkoSolar Panel N-Type TOPCon";
  const DEFAULT_PANEL_WARRANTY = "12 Years Product Warranty\n30 Years Linear Power Warranty";
  const DEFAULT_INVERTER_MODEL = "SAJ String Inverter";
  const DEFAULT_INVERTER_WARRANTY = "10 Years Product Warranty";

  const packageName = nonEmpty(row.package_name, row.package_name_snapshot || `Package ${row.linked_package || ""}`);
  const panelProduct = productByReference(products, row.package_panel);
  const inverterRefs = [row.package_inverter_1, row.package_inverter_2, row.package_inverter_3, row.package_inverter_4].filter(Boolean);
  const inverters = inverterRefs.map((ref) => productByReference(products, ref)).filter(Boolean);
  const panelQty = numberValue(row.panel_qty, row.package_panel_qty);
  const panelRating = numberValue(row.panel_rating, panelProduct?.solar_output_rating, 650);
  const packagePrice = numberValue(row.package_price);
  const totalAmount = numberValue(row.total_amount, row.amount, packagePrice);
  const invoiceDate = row.invoice_date || row.created_date || row.created_at || row.updated_at;
  const termsAndConditions = nonEmpty(row.template_terms_and_conditions, row.terms_and_conditions || row.tnc || "");
  const customerName = nonEmpty(row.customer_name_snapshot, findField(customer, ["customer_name", "name", "full_name", "company_name"]) || "Customer Name Pending");
  const customerAddress = nonEmpty(row.customer_address_snapshot, findField(customer, ["customer_address", "address", "installation_address", "site_address"]) || "Installation address pending");

  const inverterRows = (inverters.length ? inverters : [null]).map((product, index) => {
    const model = productName(product, index === 0 ? DEFAULT_INVERTER_MODEL : "");
    return {
      model,
      rating: numberValue(product?.inverter_rating),
      warranty: productWarranty(product, DEFAULT_INVERTER_WARRANTY),
    };
  }).filter((item) => nonEmpty(item.model) && !/installation|workmanship|roof\s*leak/i.test(`${item.model} ${item.warranty}`));

  const panelModel = productName(panelProduct, DEFAULT_PANEL_MODEL);
  const panelWarranty = productWarranty(panelProduct, DEFAULT_PANEL_WARRANTY);
  const inverterModel = inverterRows[0]?.model || DEFAULT_INVERTER_MODEL;
  const inverterRating = inverterRows[0]?.rating || "";
  const inverterWarranty = inverterRows[0]?.warranty || DEFAULT_INVERTER_WARRANTY;
  const systemKw = (panelQty * panelRating) / 1000;
  const systemSizeStr = `${systemKw.toFixed(2)} kW DC`;

  return {
    invoice: {
      ...row,
      uid: nonEmpty(row.bubble_id, String(row.id)),
      invoice_number: nonEmpty(row.invoice_number, row.bubble_id || String(row.id)),
      customer_name: customerName,
      customer_address: customerAddress,
      invoice_date: invoiceDate,
      total_amount: totalAmount,
      terms_and_conditions: termsAndConditions,
      solar_sun_peak_hour: numberValue(row.solar_sun_peak_hour, 3.4),
    },
    package: {
      package_name: packageName,
      panel_qty: panelQty,
      panel_model: panelModel,
      panel_rating: panelRating,
      panel_warranty: panelWarranty,
      inverter_model: inverterModel,
      inverter_rating: inverterRating,
      inverter_warranty: inverterWarranty,
      price: totalAmount || packagePrice,
    },
    agent: {
      name: nonEmpty(agent?.name, ""),
      contact: nonEmpty(agent?.contact, ""),
      email: nonEmpty(agent?.email, ""),
      signature: nonEmpty(agent?.user_signature, ""),
    },
    systemKw,
    systemSizeStr,
    panelQty,
    panelRating,
  };
}

// ── date formatting ──
function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
  return date.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "Pending final pricing";
  return new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" });
}

// ── tiger-neo3 calculations ──
function buildCumulativeSeries(years, getYearValues) {
  let jinkoCumulative = 0;
  let competitorCumulative = 0;
  return Array.from({ length: years }, (_, index) => {
    const year = index + 1;
    const values = getYearValues(year);
    jinkoCumulative += values.jinko;
    competitorCumulative += values.competitor;
    return { year, jinko: jinkoCumulative, competitor: competitorCumulative, difference: jinkoCumulative - competitorCumulative };
  });
}

function computeTigerNeo3Data(bundle) {
  const panelQty = bundle.panelQty;
  const panelWattage = bundle.panelRating;
  const psh = bundle.invoice.solar_sun_peak_hour || 3.4;
  const rate = 0.55;
  const systemKw = bundle.systemKw;
  const baseAnnualKwh = systemKw * psh * 365;

  const sectionDefs = [
    { id: "heat", buildSeries: (bak) => buildCumulativeSeries(10, () => ({ jinko: bak * 0.857, competitor: bak * 0.8405 })) },
    { id: "lowLight", buildSeries: (bak) => buildCumulativeSeries(10, () => ({ jinko: bak * 1.025, competitor: bak })) },
    { id: "bifacial", buildSeries: (bak) => buildCumulativeSeries(10, () => ({ jinko: bak * 1.085, competitor: bak * 1.07 })) },
    { id: "shading", buildSeries: (bak) => buildCumulativeSeries(10, () => ({ jinko: bak * 0.984, competitor: bak * 0.963 })) },
    { id: "degradation", buildSeries: (bak) => buildCumulativeSeries(10, (year) => ({ jinko: bak * (1 - 0.01 - (year - 1) * 0.0035), competitor: bak * (1 - 0.02 - (year - 1) * 0.0055) })) },
  ];

  let totalExtraRm = 0;
  const sections = {};
  sectionDefs.forEach((def) => {
    const series = def.buildSeries(baseAnnualKwh);
    const last = series[series.length - 1] || { jinko: 0, competitor: 0 };
    const extraKwh = last.jinko - last.competitor;
    const extraRm = extraKwh * rate;
    totalExtraRm += extraRm;
    
    // Generate yearly breakdown table
    const yearlyTable = series.map(s => ({
      year: s.year,
      advantage: Math.round(s.difference),
      cumulative: Math.round(s.jinko - s.competitor)
    })).map(row => `Y${row.year}: +${row.advantage}kWh`).join(' | ');
    
    sections[def.id] = { extraKwh, extraRm, yearlyTable };
  });

  const wholeFormatter = (v) => Math.round(v).toLocaleString("en-US");
  const decimalFormatter = (v) => Number(v).toFixed(2);

  return {
    system_size: `${decimalFormatter(systemKw)} kW DC`,
    base_annual_kwh: `${wholeFormatter(baseAnnualKwh)} kWh`,
    total_extra_savings: `RM ${wholeFormatter(totalExtraRm)}`,
    panel_qty: String(panelQty),
    panel_wattage: String(panelWattage),
    peak_sun_hours: decimalFormatter(psh),
    electricity_rate: "0.55",
    heat_extra_kwh: `${wholeFormatter(sections.heat.extraKwh)} kWh`,
    heat_extra_rm: `RM ${wholeFormatter(sections.heat.extraRm)}`,
    heat_yearly_table: sections.heat.yearlyTable,
    lowlight_extra_kwh: `${wholeFormatter(sections.lowLight.extraKwh)} kWh`,
    lowlight_extra_rm: `RM ${wholeFormatter(sections.lowLight.extraRm)}`,
    lowlight_yearly_table: sections.lowLight.yearlyTable,
    bifacial_extra_kwh: `${wholeFormatter(sections.bifacial.extraKwh)} kWh`,
    bifacial_extra_rm: `RM ${wholeFormatter(sections.bifacial.extraRm)}`,
    bifacial_yearly_table: sections.bifacial.yearlyTable,
    shading_extra_kwh: `${wholeFormatter(sections.shading.extraKwh)} kWh`,
    shading_extra_rm: `RM ${wholeFormatter(sections.shading.extraRm)}`,
    shading_yearly_table: sections.shading.yearlyTable,
    degradation_extra_kwh: `${wholeFormatter(sections.degradation.extraKwh)} kWh`,
    degradation_extra_rm: `RM ${wholeFormatter(sections.degradation.extraRm)}`,
    degradation_yearly_table: sections.degradation.yearlyTable,
    system_basis: `${decimalFormatter(systemKw)} kWp (${wholeFormatter(panelWattage)} W x ${wholeFormatter(panelQty)} panels)`,
    system_size_kwp: `${decimalFormatter(systemKw)} kWp`,
  };
}

// ── template loading & replacement ──
function loadTemplate(filename) {
  const filePath = path.join(pdfDir, filename);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

function fillTemplate(template, data) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, String(value ?? ""));
  }
  return result;
}

// ── main: build combined HTML ──
async function buildCombinedHtml(uid, lang) {
  const bundle = await fetchInvoiceBundle(uid);
  const isZh = lang === "zh";
  const suffix = isZh ? "-zh" : "-en";

  const inv = bundle.invoice;
  const pkg = bundle.package;
  const proposalDate = formatDate(inv.invoice_date);
  const invoiceDate = formatDate(inv.invoice_date);
  const validUntil = addDays(inv.invoice_date, 30);
  const systemKw = bundle.systemKw;

  // Common proposal data
  const proposalData = {
    customer_name: inv.customer_name,
    customer_address: inv.customer_address,
    invoice_number: inv.invoice_number,
    package_name: pkg.package_name,
    proposal_date: proposalDate,
    system_size: bundle.systemSizeStr,
    panel_qty: String(pkg.panel_qty),
    panel_rating: `${pkg.panel_rating}W`,
    inverter_rating: pkg.inverter_rating ? `${pkg.inverter_rating} kW` : "From package",
    panel_model: pkg.panel_model,
    inverter_model: pkg.inverter_model,
    panel_qty_detail: `${pkg.panel_qty} panels`,
    panel_rating_detail: `${pkg.panel_rating}W per panel`,
    system_formula: `${pkg.panel_qty} × ${pkg.panel_rating}W = ${systemKw.toFixed(2)} kW DC`,
    panel_warranty: pkg.panel_warranty,
    inverter_warranty: pkg.inverter_warranty,
  };

  // Quotation data
  const quotationData = {
    invoice_number: inv.invoice_number,
    invoice_date: invoiceDate,
    valid_until: validUntil,
    payment_terms: "See schedule below",
    customer_name: inv.customer_name,
    customer_address: inv.customer_address,
    system_size: bundle.systemSizeStr,
    panel_config: `${pkg.panel_qty} × ${pkg.panel_rating}W`,
    inverter_summary: pkg.inverter_model,
    roof_type: nonEmpty(inv.roof_type, "Pitched / Flat"),
    package_tag: pkg.package_name,
    package_label: pkg.package_name,
    package_subtext: `Complete solar PV system with ${pkg.panel_qty} panels and ${pkg.inverter_model}`,
    package_amount: formatCurrency(pkg.price),
    panel_model: pkg.panel_model,
    panel_count: String(pkg.panel_qty),
    inverter_model: pkg.inverter_model,
    subtotal: formatCurrency(pkg.price),
    discount: "RM 0.00",
    total_amount: formatCurrency(inv.total_amount),
    panel_product_warranty: "12 Years",
    panel_power_warranty: "30 Years Linear",
    inverter_warranty: pkg.inverter_warranty,
    workmanship_warranty: "3 Years Workmanship\n1 Year Roof Leaking",
    terms_and_conditions: inv.terms_and_conditions || "Standard terms and conditions apply.",
    authorised_name: nonEmpty(inv.sales_person, "Eternalgy Sales Team"),
    agent_name: bundle.agent.name,
    agent_contact: bundle.agent.contact,
    agent_signature: bundle.agent.signature,
  };

  // Tiger Neo 3 data
  const tigerData = computeTigerNeo3Data(bundle);

  // Marcap data (static for now, can be made dynamic)
  const marcapData = {
    market_cap: "~USD 2.8B",
    stock_price: "~$24.50",
    stock_change: "+2.3%",
    change_class: "positive",
    stock_meta: "As of latest filing",
  };

  // Load templates
  const proposalTemplate = loadTemplate(`proposal-pdf${suffix}.html`);
  const tigerTemplate = loadTemplate(`tiger-neo3-pdf${suffix}.html`);
  const marcapTemplate = loadTemplate(`marcap-pdf${suffix}.html`);
  const whyEternalgyTemplate = loadTemplate(`why-eternalgy-pdf${suffix}.html`);
  const quotationTemplate = loadTemplate("quotation-pdf.html");

  if (!proposalTemplate || !tigerTemplate || !marcapTemplate || !whyEternalgyTemplate || !quotationTemplate) {
    throw new Error("One or more PDF templates not found");
  }

  // Fill templates
  const proposalHtml = fillTemplate(proposalTemplate, proposalData);
  const tigerHtml = fillTemplate(tigerTemplate, { ...tigerData, ...proposalData });
  const marcapHtml = fillTemplate(marcapTemplate, marcapData);
  const whyEternalgyHtml = fillTemplate(whyEternalgyTemplate, {});
  const quotationHtml = fillTemplate(quotationTemplate, quotationData);

  // Convert relative image paths to base64 data URIs for puppeteer (works on Railway/server)
  const mimeTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };

  function toDataUri(relativePath) {
    const absolutePath = path.resolve(root, relativePath);
    if (!fs.existsSync(absolutePath)) return null;
    const ext = path.extname(absolutePath).toLowerCase();
    const mime = mimeTypes[ext] || "application/octet-stream";
    const data = fs.readFileSync(absolutePath).toString("base64");
    return `data:${mime};base64,${data}`;
  }

  function resolveImagePaths(html) {
    return html.replace(/src="\.\.\/([^"]+)"/g, (match, relativePath) => {
      const dataUri = toDataUri(relativePath);
      return dataUri ? `src="${dataUri}"` : match;
    });
  }

  function resolveStylePaths(html) {
    return html.replace(/url\(["']?\.\.\/([^"')]+)["']?\)/g, (match, relativePath) => {
      const dataUri = toDataUri(relativePath);
      return dataUri ? `url("${dataUri}")` : match;
    });
  }

  // Combine: wrap each page in a page-break container
  // Collect Google Fonts links from the first template (all use same font)
  const fontLinkMatch = proposalHtml.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/i);
  const fontLink = fontLinkMatch ? fontLinkMatch[0] : "";

  const combined = `<!doctype html>
<html lang="${isZh ? "zh-CN" : "en"}">
<head>
<meta charset="utf-8" />
${fontLink}
<style>
  @page { size: A4 portrait; margin: 0; }
  .pdf-page { page-break-after: always; }
  .pdf-page:last-child { page-break-after: auto; }
</style>
</head>
<body style="margin:0; padding:0;">
${[proposalHtml, tigerHtml, marcapHtml, whyEternalgyHtml, quotationHtml]
  .map((html) => {
    // Convert relative paths to absolute
    const resolved = resolveStylePaths(resolveImagePaths(html));
    // Extract body content
    const bodyMatch = resolved.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const content = bodyMatch ? bodyMatch[1] : resolved;
    // Extract styles from head
    const styleMatch = resolved.match(/<style[^>]*>([\s\S]*)<\/style>/i);
    const styles = styleMatch ? `<style>${styleMatch[1]}</style>` : "";
    return `<div class="pdf-page">${styles}${content}</div>`;
  })
  .join("\n")}
</body>
</html>`;

  return combined;
}

// ── generate PDF via puppeteer ──
async function generatePdf(uid, lang) {
  const puppeteer = require("puppeteer");
  const html = await buildCombinedHtml(uid, lang);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // Wait for fonts to load
    await page.evaluateHandle(() => {
      return document.fonts.ready;
    });

    // Additional wait to ensure fonts are fully rendered
    await page.waitForTimeout(3000);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    return pdf;
  } finally {
    await browser.close();
  }
}

module.exports = { generatePdf, buildCombinedHtml };
