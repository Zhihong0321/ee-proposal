(() => {
  const currentFile = window.location.pathname.split("/").pop() || "proposal.html";
  const params = new URLSearchParams(window.location.search);
  const currentLang = params.get("lang") === "zh" ? "zh" : "en";
  const pageLabels = {
    en: [
      ["proposal.html", "PROPOSAL"],
      ["tiger-neo3.html", "WHY JINKO"],
      ["marcap.html", "JINKO LEADERSHIP"],
      ["why-eternalgy.html", "WHY ETERNALGY"],
      ["quotation.html", "QUOTATION"],
    ],
    zh: [
      ["proposal.html", "方案"],
      ["tiger-neo3.html", "晶科 NEO3"],
      ["marcap.html", "晶科领先"],
      ["why-eternalgy.html", "为什么我们"],
      ["quotation.html", "报价"],
    ],
  };
  const pages = pageLabels[currentLang];

  const hrefFor = (file, nextLang = currentLang) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("lang", nextLang);
    const query = nextParams.toString();
    return query ? `${file}?${query}` : file;
  };

  if (document.querySelector("[data-native-site-nav]")) {
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    .native-site-nav {
      position: fixed;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      z-index: 1000;
      width: min(100%, 430px);
      margin: 0 auto;
      padding: 0 10px max(10px, env(safe-area-inset-bottom));
      background: transparent;
    }

    .native-site-nav__chrome {
      display: grid;
      gap: 8px;
      padding: 8px;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(18px);
      box-shadow: 0 12px 28px rgba(17, 24, 39, 0.08);
    }

    .native-site-nav__row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 6px;
      width: 100%;
    }

    .native-site-nav__language {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
    }

    .native-site-nav__language a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 24px;
      border: 1px solid rgba(17, 24, 39, 0.08);
      padding: 0 10px;
      color: rgba(17, 24, 39, 0.62);
      background: rgba(17, 24, 39, 0.03);
      font-family: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 0.64rem;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
    }

    .native-site-nav__language a:first-child {
      border-radius: 999px 0 0 999px;
    }

    .native-site-nav__language a:last-child {
      border-radius: 0 999px 999px 0;
    }

    .native-site-nav__language a.is-active {
      color: #ffffff;
      background: #1050d0;
      border-color: #1050d0;
    }

    .native-site-nav__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
      min-height: 42px;
      border: 1px solid rgba(17, 24, 39, 0.08);
      border-radius: 9px;
      padding: 4px 4px;
      color: rgba(17, 24, 39, 0.68);
      background: rgba(17, 24, 39, 0.03);
      box-shadow: none;
      font-family: "Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 0.54rem;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1.05;
      text-decoration: none;
      text-align: center;
      text-transform: uppercase;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    .native-site-nav__button.is-active {
      border-color: rgba(16, 80, 208, 0.22);
      color: #ffffff;
      background: #1050d0;
    }

    .native-site-nav__button:focus-visible {
      outline: 2px solid #1050d0;
      outline-offset: 2px;
    }

    @media (max-width: 360px) {
      .native-site-nav {
        padding-left: 8px;
        padding-right: 8px;
      }

      .native-site-nav__button {
        min-height: 40px;
        padding-left: 3px;
        padding-right: 3px;
        font-size: 0.5rem;
      }
    }
  `;

  const nav = document.createElement("nav");
  nav.className = "native-site-nav";
  nav.dataset.nativeSiteNav = "";
  nav.setAttribute("aria-label", "Proposal site navigation");

  const chrome = document.createElement("div");
  chrome.className = "native-site-nav__chrome";

  const row = document.createElement("div");
  row.className = "native-site-nav__row";

  const language = document.createElement("div");
  language.className = "native-site-nav__language";
  language.setAttribute("aria-label", "Language");

  [
    ["en", "EN"],
    ["zh", "中文"],
  ].forEach(([lang, label]) => {
    const link = document.createElement("a");
    link.href = hrefFor(currentFile, lang);
    link.textContent = label;

    if (lang === currentLang) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "true");
    }

    language.append(link);
  });

  pages.forEach(([file, label]) => {
    const link = document.createElement("a");
    link.className = "native-site-nav__button";
    link.href = hrefFor(file);
    link.textContent = label;

    if (file === currentFile || (currentFile === "index.html" && file === "proposal.html")) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }

    row.append(link);
  });

  chrome.append(language, row);
  nav.append(chrome);
  document.head.append(style);
  document.body.prepend(nav);

  const reserveBottomSpace = () => {
    document.body.style.paddingBottom = `${nav.offsetHeight + 10}px`;
  };

  requestAnimationFrame(() => {
    reserveBottomSpace();
    window.addEventListener("resize", reserveBottomSpace);
  });
})();
