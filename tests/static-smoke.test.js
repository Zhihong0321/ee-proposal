const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class MockElement {
  constructor({ value = "", textContent = "", dataset = {} } = {}) {
    this.value = value;
    this.dataset = dataset;
    this.parentElement = null;
    this._textContent = textContent;
    this._innerHTML = textContent;
    this.listeners = new Map();
    this.childrenBySelector = new Map();
    this.attributes = new Map();
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(handler);
  }

  dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach((handler) => handler({ target: this, currentTarget: this, type: event.type }));
    return true;
  }

  querySelector(selector) {
    return this.childrenBySelector.get(selector) || null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  set textContent(value) {
    this._textContent = String(value);
    this._innerHTML = String(value);
  }

  get textContent() {
    return this._textContent;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this._textContent = String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  get innerHTML() {
    return this._innerHTML;
  }
}

class MockDocument {
  constructor() {
    this.inputs = {
      "#panel-count": new MockElement({ value: "15" }),
      "#panel-watt": new MockElement({ value: "650" }),
      "#peak-sun-hours": new MockElement({ value: "3.4" }),
      "#electricity-rate": new MockElement({ value: "0.55" }),
    };
    this.systemSize = new MockElement({ textContent: "9.75 kW DC" });
    this.baseAnnualKwh = new MockElement({ textContent: "12,100 kWh" });
    this.videos = Array.from({ length: 5 }, () => new MockElement());
    this.sections = ["heat", "lowLight", "bifacial", "shading", "degradation"].map((id) => {
      const section = new MockElement({ dataset: { section: id } });
      section.childrenBySelector.set("[data-extra-kwh]", new MockElement());
      section.childrenBySelector.set("[data-extra-rm]", new MockElement());
      section.childrenBySelector.set("[data-system-basis] strong", new MockElement());
      section.childrenBySelector.set("[data-chart]", new MockElement());
      return section;
    });
  }

  querySelector(selector) {
    if (selector in this.inputs) {
      return this.inputs[selector];
    }
    if (selector === "[data-system-size]") {
      return this.systemSize;
    }
    if (selector === "[data-base-annual-kwh]") {
      return this.baseAnnualKwh;
    }
    return null;
  }

  querySelectorAll(selector) {
    if (selector === "[data-section]") {
      return this.sections;
    }
    if (selector === ".video-header video") {
      return this.videos;
    }
    return [];
  }
}

assert(fs.existsSync(path.join(root, "index.html")), "index.html must exist at the repo root");
assert(!fs.existsSync(path.join(root, "styles.css")), "styles.css should be folded into index.html");
assert(!fs.existsSync(path.join(root, "script.js")), "script.js should be folded into index.html");
assert(!indexHtml.includes("styles.css"), "index.html must not link external CSS");
assert(!indexHtml.includes("script.js"), "index.html must not link external JS");
assert(!indexHtml.toLowerCase().includes("chart.js"), "index.html must not depend on Chart.js");
assert(!indexHtml.includes("<script src="), "index.html must not load external scripts");
assert(indexHtml.includes("<style>"), "index.html must include inline CSS");
assert(indexHtml.includes("<script>"), "index.html must include inline JavaScript");

[
  "mobile-shell",
  "Tune the roof",
  "Heat Co-efficiency",
  "Low Light Response",
  "Bi-Facial Gain",
  "Anti-Shading",
  "Degradation Rate",
  "Cumulative difference",
  "Canadian Solar TOPHiKu6",
  "LONGi Hi-MO X6 Explorer (BC Tech)",
  "LONGi Hi-MO X6 Guardian Bifacial",
  "Trina Solar Vertex (Standard Half-Cut)",
  "JA Solar DeepBlue 3.0 (P-type PERC)",
].forEach((text) => {
  assert(indexHtml.includes(text), `Missing required page copy: ${text}`);
});

assert(indexHtml.includes('value="15"'), "Panel quantity default must be 15");
assert(indexHtml.includes('value="650"'), "Panel wattage default must be 650");
assert(indexHtml.includes('value="3.4"'), "Peak sun hours default must be 3.4");
assert(indexHtml.includes('value="0.55"'), "Electricity rate default must be 0.55");
assert((indexHtml.match(/<strong data-extra-kwh/g) || []).length === 5, "Every section must expose a 10-year extra kWh header");
assert((indexHtml.match(/<strong data-extra-rm/g) || []).length === 5, "Every section must expose a 10-year extra RM header");
assert((indexHtml.match(/<p class="system-basis" data-system-basis/g) || []).length === 5, "Every chart must show the system-size basis");
assert((indexHtml.match(/<div data-chart/g) || []).length === 5, "Every section must expose a chart target");
assert((indexHtml.match(/<video/g) || []).length === 5, "Every section must include a header video");

[
  "video/jinko-heat-coefficiency.mp4",
  "video/jinko-low-light.mp4",
  "video/jinko-bificial.mp4",
  "video/jinko-anti-shading.mp4",
  "video/jinko-degradation.mp4",
].forEach((videoPath) => {
  assert(fs.existsSync(path.join(root, videoPath)), `Missing header video asset: ${videoPath}`);
  assert(indexHtml.includes(`./${videoPath}`), `index.html must reference header video: ${videoPath}`);
});

["autoplay", "muted", "loop", "playsinline", 'preload="metadata"'].forEach((attribute) => {
  assert(indexHtml.includes(attribute), `Header videos must include mobile-friendly attribute: ${attribute}`);
});

[
  "#0C0C0C",
  "#1050D0",
  "#B0B0B0",
  "width: min(100%, 430px)",
  "overflow-x: auto",
  ".video-header",
  "aspect-ratio: 16 / 9",
  "object-fit: cover",
  ".competitor span",
  "box-decoration-break: clone",
  "rgba(217, 119, 6, 0.08)",
  ".system-basis",
  "height: 220px",
].forEach((term) => {
  assert(indexHtml.includes(term), `Inline CSS should include mobile style term: ${term}`);
});

assert((indexHtml.match(/<p class="competitor">vs <span>/g) || []).length === 5, "Every competitor line must use highlighted vs styling");

[
  "baseAnnualKwh",
  "0.857",
  "0.8405",
  "1.025",
  "1.085",
  "1.07",
  "0.984",
  "0.963",
  "0.0035",
  "0.0055",
  "buildCumulativeSeries",
  "difference",
  "renderChart",
  "muteHeaderVideos",
].forEach((term) => {
  assert(indexHtml.includes(term), `Inline JavaScript must include required logic term: ${term}`);
});

const scriptBlocks = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert(scriptBlocks.length === 1, "index.html should contain exactly one inline app script");
const appScript = scriptBlocks[0];

const document = new MockDocument();
const window = { document };
window.window = window;
document.defaultView = window;

const context = vm.createContext({
  window,
  document,
  console,
  Intl,
  Math,
  Number,
  String,
  Array,
  Map,
});

vm.runInContext(appScript, context, { filename: "inline-index-script.js" });

assert(window.EternalgyLanding && typeof window.EternalgyLanding.refreshDerivedMetrics === "function", "refreshDerivedMetrics must be attached to window.EternalgyLanding");
assert(typeof window.EternalgyLanding.muteHeaderVideos === "function", "muteHeaderVideos must be attached to window.EternalgyLanding");

document.videos.forEach((video) => {
  assert(video.muted === true, "Header video must be muted at runtime");
  assert(video.defaultMuted === true, "Header video must be defaultMuted at runtime");
  assert(video.volume === 0, "Header video volume must be zero at runtime");
});

const defaultDashboard = window.EternalgyLanding.refreshDerivedMetrics();
const baseAnnualKwh = (15 * 650 / 1000) * 3.4 * 365;

assert(defaultDashboard.panelQty === 15, "Default panel quantity should be 15");
assert(defaultDashboard.panelWattage === 650, "Default panel wattage should be 650");
assert(defaultDashboard.psh === 3.4, "Default peak sun hours should be 3.4");
assert(defaultDashboard.rate === 0.55, "Default rate should be 0.55");
assert(defaultDashboard.systemKw === 9.75, "System kW should equal panelQty * panelWattage / 1000");
assert(Math.abs(defaultDashboard.baseAnnualKwh - baseAnnualKwh) < 1e-9, "baseAnnualKwh must use the requested formula");
assert(document.systemSize.textContent === "9.75 kW DC", "System size text must stay synced");
assert(document.baseAnnualKwh.textContent === "12,100 kWh", "Base annual kWh readout must use the default formula");
document.sections.forEach((section) => {
  assert(
    section.querySelector("[data-system-basis] strong").textContent === "9.75 kWp (650 W x 15 panels)",
    "Every chart basis must show panel wattage x panel quantity"
  );
});

const expected = {
  heat: {
    extraKwh: baseAnnualKwh * (0.857 - 0.8405) * 10,
    yearOneJinko: baseAnnualKwh * 0.857,
    yearOneCompetitor: baseAnnualKwh * 0.8405,
  },
  lowLight: {
    extraKwh: baseAnnualKwh * (1.025 - 1) * 10,
    yearOneJinko: baseAnnualKwh * 1.025,
    yearOneCompetitor: baseAnnualKwh,
  },
  bifacial: {
    extraKwh: baseAnnualKwh * (1.085 - 1.07) * 10,
    yearOneJinko: baseAnnualKwh * 1.085,
    yearOneCompetitor: baseAnnualKwh * 1.07,
  },
  shading: {
    extraKwh: baseAnnualKwh * (0.984 - 0.963) * 10,
    yearOneJinko: baseAnnualKwh * 0.984,
    yearOneCompetitor: baseAnnualKwh * 0.963,
  },
  degradation: {
    extraKwh: Array.from({ length: 10 }, (_, index) => {
      const year = index + 1;
      return baseAnnualKwh * ((1 - 0.01 - (year - 1) * 0.0035) - (1 - 0.02 - (year - 1) * 0.0055));
    }).reduce((sum, value) => sum + value, 0),
    yearOneJinko: baseAnnualKwh * 0.99,
    yearOneCompetitor: baseAnnualKwh * 0.98,
  },
};

Object.entries(expected).forEach(([id, values]) => {
  const summary = defaultDashboard.sections[id];
  assert(summary, `Missing section summary for ${id}`);
  assert(summary.series.length === 10, `${id} must produce 10 years`);
  assert(Math.abs(summary.series[0].jinko - values.yearOneJinko) < 1e-9, `${id} year-one Jinko value is wrong`);
  assert(Math.abs(summary.series[0].competitor - values.yearOneCompetitor) < 1e-9, `${id} year-one competitor value is wrong`);
  assert(Math.abs(summary.series[0].difference - (values.yearOneJinko - values.yearOneCompetitor)) < 1e-9, `${id} year-one difference value is wrong`);
  assert(Math.abs(summary.extraKwh - values.extraKwh) < 1e-9, `${id} 10-year extra kWh is wrong`);
  assert(Math.abs(summary.extraRm - values.extraKwh * 0.55) < 1e-9, `${id} 10-year extra RM is wrong`);
});

document.sections.forEach((section) => {
  const chartMarkup = section.querySelector("[data-chart]").innerHTML;
  assert(chartMarkup.includes("<svg"), "Each chart target must render inline SVG");
  assert(chartMarkup.includes("stroke=\"#1050D0\""), "Each chart must render the blue advantage line");
  assert(chartMarkup.includes("stroke=\"rgba(0,0,0,0.18)\""), "Each chart must render the grey baseline");
});

const heatBefore = defaultDashboard.sections.heat.extraKwh;
document.inputs["#panel-count"].value = "20";
document.inputs["#panel-count"].dispatchEvent({ type: "input" });
document.inputs["#panel-watt"].value = "700";
document.inputs["#panel-watt"].dispatchEvent({ type: "input" });
const capacityDashboard = window.EternalgyLanding.refreshDerivedMetrics();

assert(capacityDashboard.systemKw === 14, "Changing panel count and wattage must update system kW");
assert(capacityDashboard.sections.heat.extraKwh > heatBefore, "Increasing system size must increase 10-year extra kWh");
document.sections.forEach((section) => {
  assert(
    section.querySelector("[data-system-basis] strong").textContent === "14.00 kWp (700 W x 20 panels)",
    "Every chart basis must update when panel count and wattage change"
  );
});

document.inputs["#electricity-rate"].value = "0.42";
document.inputs["#electricity-rate"].dispatchEvent({ type: "input" });
const rateDashboard = window.EternalgyLanding.refreshDerivedMetrics();
assert(Math.abs(rateDashboard.sections.lowLight.extraRm - rateDashboard.sections.lowLight.extraKwh * 0.42) < 1e-9, "Electricity rate must affect 10-year savings");

document.inputs["#panel-count"].value = "abc";
document.inputs["#panel-watt"].value = "-1";
document.inputs["#peak-sun-hours"].value = "not-a-number";
document.inputs["#electricity-rate"].value = "";
const zeroDashboard = window.EternalgyLanding.refreshDerivedMetrics();
assert(zeroDashboard.baseAnnualKwh === 0, "Invalid inputs should clamp to zero base annual kWh");
Object.values(zeroDashboard.sections).forEach((summary) => {
  assert(summary.extraKwh === 0, "Zero-state extra kWh must be zero");
  assert(summary.extraRm === 0, "Zero-state extra RM must be zero");
});

console.log("static smoke test passed");
