(function (root, factory) {
  const defaults = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = defaults;
  }
  root.EternalgyDefaults = defaults;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const INSTALLATION_WARRANTY_LINES = [
    "1 Year Roof Leaking Warranty",
    "3 Years Workmanship Warranty",
  ];
  return {
    PANEL_MODEL: "650W JinkoSolar Panel N-Type TOPCon",
    PANEL_WARRANTY: "12 Years Product Warranty\n30 Years Linear Power Warranty",
    INVERTER_MODEL: "SAJ String Inverter",
    INVERTER_WARRANTY: "10 Years Product Warranty",
    MOUNTING_WARRANTY: "10 Years Warranty for Mounting Structure",
    INSTALLATION_WARRANTY_LINES,
    INSURANCE_LINE: "3 Years MSIG Solar Insurance",
    QUOTATION_VALID_DAYS: 30,
    PANEL_PRODUCT_WARRANTY_SHORT: "12 Years",
    PANEL_POWER_WARRANTY_SHORT: "30 Years Linear",
    MOUNTING_WARRANTY_SHORT: "10 Years",
    WORKMANSHIP_SHORT: "3 Years Workmanship, 1 Year Roof Leaking",
    COMPANY_NAME: "Eternalgy Sdn Bhd",
    COMPANY_REG: "202301029164 (1523087-A)",
    COMPANY_EMAIL: "pr@eternalgy.me",
    COMPANY_PR_URL: "https://ee-pr.up.railway.app/",
  };
});
