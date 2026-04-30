(() => {
  const lang = new URLSearchParams(window.location.search).get("lang") === "zh" ? "zh" : "en";
  const file = window.location.pathname.split("/").pop();

  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  if (lang === "en" && file !== "why-eternalgy.html") {
    return;
  }

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const set = (selector, text) => {
    const target = $(selector);
    if (target && target.textContent !== text) {
      target.textContent = text;
    }
  };
  const setAll = (selector, texts) => {
    $$(selector).forEach((target, index) => {
      if (texts[index] !== undefined && target.textContent !== texts[index]) {
        target.textContent = texts[index];
      }
    });
  };

  function applyWhyEternalgyEnglish() {
    if (lang !== "en") {
      return;
    }

    document.title = "Why Eternalgy";
    set(".hero h1", "Why Eternalgy");
    set(".hero-copy", "Five core strengths that protect your solar investment.");
    setAll(".block-content h2", [
      "Exceptional Efficiency",
      "Proven Experience",
      "No Compromise",
      "Roof Expertise",
      "Trusted by Leading Institutions",
    ]);
    const blocks = $$(".block-content");
    const quote = blocks[2]?.querySelector(".quote-box");
    if (quote) {
      quote.textContent = "True value is safety. The real cost is risk.";
    }

    const englishBodies = [
      "<strong>Systemized operations and service attitude, proven by results.</strong> Our efficiency is not about rushing through work. It reflects a highly organized operation and a team that works with discipline, precision, and accountability. With a fully in-house team, we have completed 140 projects in a single month. We see service speed as a direct promise to our clients: the faster we deliver, the sooner you can maximize the green returns from solar.",
      "<strong>Experience is a valuable asset that goes beyond the product itself.</strong> From terrace houses and bungalows to large farms and heavy industrial facilities, Eternalgy's installation and design teams have been tested across countless real-world scenarios. What we deliver is more than a solar system. It is the result of hands-on work, continuous refinement, and proven engineering standards. That depth of experience is one of the most valuable hidden assets you gain when choosing Eternalgy.",
      "A solar project is a long-term investment that can last 20 years or more. Over that lifespan, safety and reliability matter more than cutting corners on price. Choosing the cheapest option often leads to greater costs later. That is why we use premium components designed for long-term durability and extra safety margins. We do not compete on low price alone. We deliver peace of mind throughout the entire system lifecycle.",
      "<strong>Dedicated in-house roofing specialists.</strong> Solar begins with the building itself. At Eternalgy, we understand both solar and roofing. Our in-house roof specialists minimize installation risk and provide roof repair and reinforcement capability, helping the system work naturally with your building.",
      "<strong>National certifications and industry leaders' choice.</strong> Our commitment to quality and compliance has earned recognition from respected organizations and industry leaders. From government certifications to major industry awards, we build trust through proven capability and consistent standards.",
    ];

    blocks.forEach((block, index) => {
      const paragraph = block.querySelector("p");
      if (paragraph && englishBodies[index] && paragraph.innerHTML !== englishBodies[index]) {
        paragraph.innerHTML = englishBodies[index];
      }
    });

    setAll(".cert-badge", [
      "SEDA",
      "CIDB",
      "Maybank Exclusive Partner",
      "SAJ Sole Distributor of Malaysia",
      "SHRDC CoE Partner",
      "Malaysia Golden Bull Award",
    ]);
  }

  function applyTigerNeoChinese() {
    if (lang !== "zh") {
      return;
    }

    set(".hero .eyebrow", "Eternalgy 对比实验室");
    set(".hero h1", "Tiger Neo 3.0 年年赢更多。");
    set(".hero-copy", "以真实系统容量计算，比较 10 年累计发电差异与电费节省。");
    setAll(".hero-stats span", ["系统容量", "基础年发电"]);
    setAll(".section-rail a", ["高温", "弱光", "双面", "遮挡", "衰减"]);
    set(".dock-head .eyebrow", "假设参数");
    set("#controls-title", "调整屋顶数据");
    set(".dock-head > span", "RM 节省实时更新");
    setAll(".control span", ["片数", "瓦数", "日照小时", "RM / kWh"]);
    setAll(".comparison-card h2", ["高温系数", "弱光响应", "双面增益", "抗遮挡", "衰减率"]);
    setAll(".section-kicker strong", ["80°C 屋顶模型", "2.5% 发电提升", "10% 屋顶反照率", "局部阴影模型", "30 年低衰减"]);
    $$(".competitor").forEach((item) => {
      item.childNodes[0].textContent = "对比 ";
    });
    setAll(".comparison-card .card-copy", [
      "在马来西亚炎热屋顶温度下，Tiger Neo 3.0 功率损失更少，优势逐年扩大。",
      "N 型 TOPCon 电池在清晨、傍晚、烟霾和雨季阴天仍能保持更强发电能力。",
      "透明背面可吸收更多屋顶反射光，把反照率转化为长期发电收益。",
      "优化电池结构在局部阴影下减少输出损失，提升真实屋顶表现。",
      "更低首年与年度衰减，让组件在长期严苛环境中保留更多额定输出。",
    ]);
    setAll(".metric-row div:first-child span", ["10年额外发电", "10年额外发电", "10年额外发电", "10年额外发电", "10年额外发电"]);
    setAll(".metric-row div:last-child span", ["额外节省", "额外节省", "额外节省", "额外节省", "额外节省"]);
    setAll(".chart-title span", ["累计差异", "累计差异", "累计差异", "累计差异", "累计差异"]);
    setAll(".chart-title strong", ["kWh 优势", "kWh 优势", "kWh 优势", "kWh 优势", "kWh 优势"]);
    setAll(".system-basis span", ["基于系统容量：", "基于系统容量：", "基于系统容量：", "基于系统容量：", "基于系统容量："]);
    setAll(".legend-row span:first-child", ["晶科优势", "晶科优势", "晶科优势", "晶科优势", "晶科优势"]);
    setAll(".legend-row span:last-child", ["基准线", "基准线", "基准线", "基准线", "基准线"]);
    set(".page-summary .eyebrow", "底部总结");
    set("#page-summary-title", "10 年节省总览");
    set("[data-page-summary-note]", "以上五个基准比较的合计。");

    const heroCopy = $(".hero-copy");
    if (heroCopy?.textContent.includes("Live Tiger Neo 3.0 comparison using")) {
      const match = heroCopy.textContent.match(/using\s+([^:]+):\s+(\d+)\s+panels\s+x\s+(\d+)\s+W/i);
      if (match) {
        heroCopy.textContent = `使用发票 ${match[1]} 的真实系统数据：${match[2]} 片 x ${match[3]} W。`;
      }
    }
  }

  function applyProposalChinese() {
    if (lang !== "zh") {
      return;
    }

    document.title = document.title.replace("Solar Proposal", "太阳能光伏方案");
    set(".hero .eyebrow", "太阳能光伏方案");
    set(".proposal-callout-label", "客户：");

    const address = $("[data-installation-address]");
    if (address?.textContent.startsWith("Prepared for ")) {
      address.textContent = address.textContent.replace("Prepared for ", "客户：");
    } else if (address?.textContent === "Fetching customer and installation address.") {
      address.textContent = "正在读取客户与安装地址。";
    }

    setAll(".meta-row span", ["发票来源", "配套", "方案日期"]);
    setAll(".metric span", ["建议系统容量", "太阳能板数量", "太阳能板功率", "逆变器容量"]);
    setAll(".metric em", ["数量 x 单片功率", "光伏组件", "每片功率", "来自配套"]);
    setAll(".grid .section-kicker", ["建议设备", "系统保修详情"]);
    setAll(".grid .section h2", ["系统详情", "保修"]);
    setAll(".spec-table th", ["太阳能板型号", "逆变器型号", "太阳能板数量", "太阳能板功率", "系统公式"]);
    set(".cert-section .section-kicker", "认证与安装商注册");
    set("#certification-title", "Eternalgy");
    set("#certification-subtitle", "已注册并获得以下认证");
    setAll(".cert-copy h3", [
      "CIDB 注册承包商",
      "SEDA 注册太阳能光伏服务商",
      "SEDA 注册太阳能光伏投资商",
      "MyHijau 设备认证",
    ]);
    setAll(".cert-copy dt", [
      "注册号码",
      "等级",
      "注册号码",
      "注册公司名称",
      "产品",
      "认证号码",
    ]);

    const status = $("[data-status]");
    if (status) {
      status.textContent = status.textContent
        .replace("Preparing database-backed proposal.", "正在准备数据库方案。")
        .replace("Loading invoice UID", "正在载入发票 UID")
        .replace("Invoice UID unavailable. Showing demo data.", "发票 UID 无法读取，正在显示示范数据。")
        .replace("Showing Direct Postgres invoice UID.", "正在显示直连 Postgres 发票 UID 数据。")
        .replace("Showing demo data.", "正在显示示范数据。");
      status.textContent = status.textContent.replace(/^Showing (.+)\.$/, "正在显示 $1。");
    }

    const reroll = $("[data-reroll]");
    if (reroll) {
      reroll.textContent = reroll.disabled ? "已载入发票 UID" : "随机方案";
    }

    const qtyDetail = $("[data-panel-qty-detail]");
    if (qtyDetail) {
      qtyDetail.textContent = qtyDetail.textContent.replace(" panels", " 片");
    }

    const ratingDetail = $("[data-panel-rating-detail]");
    if (ratingDetail) {
      ratingDetail.textContent = ratingDetail.textContent.replace(" W each", " W 每片");
    }

    const formula = $("[data-system-formula]");
    if (formula) {
      formula.textContent = formula.textContent
        .replace(" panels x ", " 片 x ")
        .replace(" W / 1000", " W / 1000");
    }

    $$(".warranty-copy span").forEach((item) => {
      item.textContent = item.textContent
        .replace("12 Years Product Warranty", "12 年产品保修")
        .replace("30 Years Linear Power Warranty", "30 年线性功率保修")
        .replace("10 Years Product Warranty", "10 年产品保修")
        .replace("1 Year Roof Leaking Warranty", "1 年屋顶漏水保修")
        .replace("3 Years Workmanship Warranty", "3 年施工保修")
        .replace("Warranty information pending", "保修信息待确认");
    });

    $$(".warranty-copy strong").forEach((item) => {
      if (item.textContent === "Installation") {
        item.textContent = "安装工程";
      }
    });
  }

  function applyMarcapChinese() {
    if (lang !== "zh") {
      return;
    }

    set(".hero .eyebrow", "晶科市场视角");
    set(".hero h1", "晶科市值与全球出货领导力。");
    set(".hero-copy", "结合 NYSE:JKS 实时市值与股价图，以及 2024-2025 全球前五太阳能组件出货对比。");
    setAll(".stat-board .metric span", ["晶科合计出货", "晶科 2025 出货", "前五合计", "前五全球占比"]);
    set("[data-refresh]", "刷新");
    set(".market-label", "晶科能源市值");
    set("#stock-title", "晶科能源控股有限公司");
    set(".fallback-note", "实时市场数据暂不可用，正在显示备用快照。");
    set(".shipment-card .eyebrow", "2024-2025 合计出货");
    set("#shipment-title", "全球前五太阳能组件制造商");
    set(".summary-copy", "排名结合 2024 年与 2025 年预估出货量。N 型技术是市场份额变化的主要推动力。");
    set("#shipment-table-title", "出货排名");
    set(".asof-pill", "截至 2025");
    setAll("th", ["排名", "制造商", "2024 出货", "2025 出货", "合计"]);
    set("#analysis-title", "领导者为何变化");
    set("section[aria-labelledby='analysis-title'] .eyebrow", "制造商详细分析");
    set("#observations-title", "关键市场观察");

    const observations = $$(".observations li");
    const observationText = [
      ["价格压力：", "部分地区组件价格跌破每瓦 0.10 美元，迫使部分二线制造商退出市场。"],
      ["N 型主导：", "到 2025 年底，TOPCon、HJT 与 BC 等 N 型组件成为行业标准，占这些出货量超过 85%。"],
      ["差距：", "JA Solar 第四名与 Tongwei 第五名之间仍有明显出货差距，形成头部四强与其他厂商的分界。"],
    ];
    observations.forEach((item, index) => {
      const row = observationText[index];
      if (row) {
        item.innerHTML = `<strong>${row[0]}</strong>${row[1]}`;
      }
    });

    const status = $("[data-status]");
    if (status) {
      status.textContent = status.textContent
        .replace("Loading live NYSE:JKS data...", "正在加载 NYSE:JKS 实时数据...")
        .replace("Refreshing NYSE:JKS data...", "正在刷新 NYSE:JKS 数据...")
        .replace("Live NYSE:JKS data loaded from TradingView. Refreshing every 3 seconds.", "NYSE:JKS 实时数据已从 TradingView 载入。3 秒自动刷新。")
        .replace("Live NYSE:JKS data loaded from TradingView.", "NYSE:JKS 实时数据已从 TradingView 载入。")
        .replace("NYSE closed. Refreshing every 60 seconds.", "NYSE 已收盘。60 秒自动刷新。")
        .replace("NYSE closed. Showing the fallback snapshot.", "NYSE 已收盘。正在显示备用快照。")
        .replace("NYSE is open, but live data is unavailable. Showing the fallback snapshot.", "NYSE 正在交易，但实时数据暂不可用。正在显示备用快照。")
        .replace("NYSE is closed. Showing the fallback snapshot.", "NYSE 已收盘。正在显示备用快照。");
    }
  }

  function applyGeneratedMarcapChinese() {
    if (lang !== "zh" || file !== "marcap.html") {
      return;
    }

    const meta = $("[data-meta]");
    if (meta?.textContent.includes("Volume")) {
      meta.textContent = meta.textContent.replace("Volume", "成交量").replace("ADS market cap basis", "ADS 市值口径");
    }

    const chartMeta = $("[data-chart-meta]");
    if (chartMeta?.textContent.includes("Live intraday line") || chartMeta?.textContent.includes("One-day line")) {
      chartMeta.textContent = chartMeta.textContent
        .replace(
          "Live intraday line generated from open, high, low, and the latest price. Auto-refreshing every 3 seconds.",
          "盘中线条基于开盘价、最高价、最低价与最新价生成，NYSE 交易时段每 3 秒刷新。"
        )
        .replace(
          "One-day line generated from the latest available open, high, low, and close.",
          "一日线条基于最新可用的开盘价、最高价、最低价与收盘价生成。"
        );
    } else if (chartMeta?.textContent.includes("Previous close")) {
      chartMeta.textContent = chartMeta.textContent
        .replace("Previous close", "前收")
        .replace("High", "最高")
        .replace("Low", "最低");
    }

    const liveLabel = $("[data-live-label]");
    if (liveLabel) {
      liveLabel.textContent = liveLabel.textContent
        .replace("NYSE open · 3s refresh", "NYSE 开盘 · 3 秒刷新")
        .replace("NYSE closed · 60s refresh", "NYSE 已收盘 · 60 秒刷新");
    }

    const status = $("[data-status]");
    if (status) {
      status.textContent = status.textContent
        .replace("Loading live NYSE:JKS data...", "正在加载 NYSE:JKS 实时数据...")
        .replace("Refreshing NYSE:JKS data...", "正在刷新 NYSE:JKS 数据...")
        .replace("Live NYSE:JKS data loaded from TradingView.", "已从 TradingView 载入 NYSE:JKS 实时数据。")
        .replace("Live NYSE:JKS data loaded from TradingView. Refreshing every 3 seconds.", "已从 TradingView 载入 NYSE:JKS 实时数据。3 秒自动刷新。")
        .replace("NYSE closed. Refreshing every 60 seconds.", "NYSE 已收盘。60 秒自动刷新。")
        .replace("NYSE closed. Showing the fallback snapshot.", "NYSE 已收盘。正在显示备用快照。")
        .replace("NYSE is open, but live data is unavailable. Showing the fallback snapshot.", "NYSE 正在交易，但实时数据暂不可用。正在显示备用快照。")
        .replace("NYSE is closed. Showing the fallback snapshot.", "NYSE 已收盘。正在显示备用快照。");
    }

    const names = {
      "Volume leader": "出货领导者",
      "Tech pivot": "技术转型",
      "Utility heavyweight": "大型电站强者",
      "Stability specialist": "稳健专家",
      "Vertical disruptor": "垂直整合挑战者",
    };
    $$(".company-meta").forEach((item) => {
      item.textContent = names[item.textContent.trim()] || item.textContent;
    });

    const analysis = {
      Strategy: "策略",
      "Key factor": "关键因素",
      Milestone: "里程碑",
      Status: "状态",
      Innovation: "创新",
      Advantage: "优势",
      Growth: "增长",
    };
    $$(".analysis-card p strong").forEach((item) => {
      const key = item.textContent.replace(":", "");
      if (analysis[key]) {
        item.textContent = `${analysis[key]}：`;
      }
    });

    const analysisText = {
      "Early and aggressive adoption of N-type TOPCon technology.": "较早并积极采用 N 型 TOPCon 技术。",
      "Leveraged a large Southeast Asia manufacturing base to maintain U.S. access while dominating China and Europe.": "依托东南亚大型制造基地，在保持美国市场准入的同时主导中国与欧洲市场。",
      "Became the first company to cross the 200 GW cumulative shipment mark during this period.": "在此期间成为首家累计出货突破 200 GW 的企业。",
      "A mid-period shift from TOPCon to BC Back Contact technology.": "期间从 TOPCon 转向 BC 背接触技术。",
      "Trailed Jinko in 2024 during the transition, then 2025 volumes surged as HPBC 2.0 lines reached full capacity.": "2024 年转型期间落后晶科，随后 2025 年 HPBC 2.0 产线满产后出货快速提升。",
      "Remains the world's most valuable solar company by market capitalization.": "仍是全球市值最高的太阳能企业。",
      "Championing the 210mm large-wafer standard.": "主推 210mm 大尺寸硅片标准。",
      "Highly successful in Middle East and Latin America utility-scale markets.": "在中东与拉丁美洲大型地面电站市场表现突出。",
      "Integrated Trina Storage into module sales, increasing contract value even as panel prices fell.": "将天合储能纳入组件销售，即使组件价格下跌也提升了合同价值。",
      "Balanced geographic distribution and conservative financial management.": "区域布局均衡，财务管理相对稳健。",
      "Maintained consistent vertical integration, producing nearly 80% of components internally.": "保持稳定垂直整合，近 80% 组件环节由内部生产。",
      "Supply-chain control helped shield the company against price volatility.": "供应链控制能力帮助公司抵御价格波动。",
      "Moving from cell supplier to module brand.": "从电池片供应商转型为组件品牌。",
      "Used polysilicon and cell dominance to undercut competitors on finished module pricing.": "利用多晶硅与电池片优势，在成品组件价格上压低竞争对手。",
      "Highest year-over-year growth rate among the top five.": "在前五名中拥有最高同比增长率。",
    };

    $$(".analysis-card p").forEach((item) => {
      const strong = item.querySelector("strong");
      if (!strong) {
        return;
      }

      const plain = item.textContent.replace(/^.*?[：:]\s*/, "").trim();
      const translated = analysisText[plain];
      if (translated) {
        item.innerHTML = `<strong>${strong.textContent}</strong> ${translated}`;
      }
    });
  }

  function apply() {
    if (file === "proposal.html") {
      applyProposalChinese();
    }

    if (file === "why-eternalgy.html") {
      applyWhyEternalgyEnglish();
    }

    if (file === "tiger-neo3.html") {
      applyTigerNeoChinese();
    }

    if (file === "marcap.html") {
      applyMarcapChinese();
      applyGeneratedMarcapChinese();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }

  const observer = new MutationObserver(() => {
    window.clearTimeout(observer._timer);
    observer._timer = window.setTimeout(apply, 30);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
})();
