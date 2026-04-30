(() => {
  const SQL_ENDPOINT = "/api/sql";

  const DEFAULT_PANEL_MODEL = "650W JinkoSolar Panel N-Type TOPCon";
  const DEFAULT_PANEL_WARRANTY = "12 Years Product Warranty\n30 Years Linear Power Warranty";
  const DEFAULT_INVERTER_MODEL = "SAJ String Inverter";
  const DEFAULT_INVERTER_WARRANTY = "10 Years Product Warranty";

  const getSearchParams = () => {
    const params = new URLSearchParams(window.location.search);

    try {
      if (window.parent && window.parent !== window) {
        const parentParams = new URLSearchParams(window.parent.location.search);
        parentParams.forEach((value, key) => {
          if (!params.has(key)) {
            params.set(key, value);
          }
        });
      }
    } catch (_error) {
      // Cross-origin parents are ignored; local iframe pages are same-origin.
    }

    return params;
  };

  const getInvoiceUid = () => {
    const params = getSearchParams();
    return (
      params.get("uid") ||
      params.get("invoice_uid") ||
      params.get("invoice") ||
      params.get("invoice_id") ||
      ""
    ).trim();
  };

  async function runSql(sql, params = []) {
    const response = await fetch(SQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || `Database request failed with HTTP ${response.status}`);
    }

    return payload.rows || [];
  }

  const nonEmpty = (value, fallback = "") => {
    const text = value === null || value === undefined ? "" : String(value).trim();
    return text && text.toLowerCase() !== "null" ? text : fallback;
  };

  const numberValue = (...values) => {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) {
        return number;
      }
    }

    return 0;
  };

  const arrayValue = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

  const matchNumber = (value, pattern) => {
    const match = nonEmpty(value).match(pattern);
    return match ? Number(match[1]) : 0;
  };

  const findField = (row, candidates) => {
    if (!row) {
      return "";
    }

    for (const key of candidates) {
      if (nonEmpty(row[key])) {
        return row[key];
      }
    }

    const entries = Object.entries(row);
    for (const candidate of candidates) {
      const lowered = candidate.toLowerCase();
      const match = entries.find(([key, value]) => key.toLowerCase().includes(lowered) && nonEmpty(value));
      if (match) {
        return match[1];
      }
    }

    return "";
  };

  const productName = (product, fallback) =>
    nonEmpty(
      findField(product, [
        "product_name",
        "name",
        "model",
        "title",
        "description",
        "product",
      ]),
      fallback,
    );

  const productWarranty = (product, fallback) =>
    nonEmpty(
      findField(product, [
        "product_warranty",
        "product_warranty_desc",
        "warranty",
        "warranty_year",
        "warranty_years",
        "linear_power_warranty",
        "power_warranty",
      ]),
      fallback,
    );

  const isInstallationCoverage = (value) =>
    /installation|workmanship|roof\s*leak/i.test(nonEmpty(value, ""));

  function productByReference(products, reference) {
    const ref = nonEmpty(reference);
    if (!ref) {
      return null;
    }

    return (
      products.find((product) => String(product.id) === ref || nonEmpty(product.bubble_id) === ref || nonEmpty(product.unique_id) === ref) ||
      null
    );
  }

  async function fetchOptionalProducts(references) {
    const refs = [...new Set(references.map(nonEmpty).filter(Boolean))];

    if (!refs.length) {
      return [];
    }

    try {
      return await runSql(
        `
          select *
          from product
          where id::text = any($1::text[])
             or bubble_id = any($1::text[])
             or unique_id = any($1::text[])
        `,
        [refs],
      );
    } catch (_error) {
      return [];
    }
  }

  async function fetchOptionalCustomer(reference) {
    const ref = nonEmpty(reference);

    if (!ref) {
      return null;
    }

    try {
      const rows = await runSql(
        `
          select *
          from customer
          where id::text = $1
             or customer_id = $1
          limit 1
        `,
        [ref],
      );
      return rows[0] || null;
    } catch (_error) {
      return null;
    }
  }

  function normalizeBundle(row, products, customer) {
    const packageName = nonEmpty(row.package_name, row.package_name_snapshot || `Package ${row.linked_package || ""}`);
    const panelProduct = productByReference(products, row.package_panel);
    const inverterRefs = [
      row.package_inverter_1,
      row.package_inverter_2,
      row.package_inverter_3,
      row.package_inverter_4,
    ].filter(Boolean);
    const inverters = inverterRefs.map((ref) => productByReference(products, ref)).filter(Boolean);
    const panelQty = numberValue(row.panel_qty, row.package_panel_qty, matchNumber(packageName, /(\d+)\s*(?:pcs|pieces|panel)/i));
    const panelRating = numberValue(row.panel_rating, panelProduct?.solar_output_rating, matchNumber(packageName, /(\d{3,4})\s*w/i), 650);
    const packagePrice = numberValue(row.package_price);
    const totalAmount = numberValue(row.total_amount, row.amount, packagePrice);
    const invoiceDate = row.invoice_date || row.created_date || row.created_at || row.updated_at;
    const termsAndConditions = nonEmpty(
      row.template_terms_and_conditions,
      row.terms_and_conditions || row.tnc || "",
    );
    const customerName = nonEmpty(
      row.customer_name_snapshot,
      findField(customer, ["customer_name", "name", "full_name", "company_name"]) || "Customer Name Pending",
    );
    const customerAddress = nonEmpty(
      row.customer_address_snapshot,
      findField(customer, ["customer_address", "address", "installation_address", "site_address"]) || "Installation address pending",
    );

    const inverterRows = (inverters.length ? inverters : [null]).map((product, index) => {
      const model = productName(product, index === 0 ? DEFAULT_INVERTER_MODEL : "");
      return {
        model,
        rating: numberValue(product?.inverter_rating, matchNumber(model, /(\d+(?:\.\d+)?)\s*kw/i)),
        warranty: productWarranty(product, DEFAULT_INVERTER_WARRANTY),
      };
    }).filter((item) => nonEmpty(item.model) && !isInstallationCoverage(`${item.model} ${item.warranty}`));

    return {
      invoice: {
        ...row,
        uid: nonEmpty(row.bubble_id, String(row.id)),
        customer_name: customerName,
        customer_address: customerAddress,
        invoice_date: invoiceDate,
        total_amount: totalAmount,
        terms_and_conditions: termsAndConditions,
      },
      package: {
        id: row.package_db_id,
        bubble_id: row.package_bubble_id,
        package_name: packageName,
        panel_qty: panelQty,
        panel_model: productName(panelProduct, DEFAULT_PANEL_MODEL),
        panel_rating: panelRating,
        panel_warranty: productWarranty(panelProduct, DEFAULT_PANEL_WARRANTY),
        inverter_1_model: inverterRows[0]?.model || DEFAULT_INVERTER_MODEL,
        inverter_1_rating: inverterRows[0]?.rating || "",
        inverter_1_warranty: inverterRows[0]?.warranty || DEFAULT_INVERTER_WARRANTY,
        price: totalAmount || packagePrice,
      },
      inverters: inverterRows,
      products,
      sourceLabel: "Direct Postgres invoice UID",
    };
  }

  async function fetchInvoiceBundle(uid = getInvoiceUid()) {
    const invoiceUid = nonEmpty(uid);

    if (!invoiceUid) {
      return null;
    }

    const rows = await runSql(
      `
        select
          i.*,
          p.id as package_db_id,
          p.bubble_id as package_bubble_id,
          p.package_name,
          p.panel_qty as package_panel_qty,
          p.panel as package_panel,
          p.inverter_1 as package_inverter_1,
          p.inverter_2 as package_inverter_2,
          p.inverter_3 as package_inverter_3,
          p.inverter_4 as package_inverter_4,
          p.price as package_price,
          p.linked_package_item as package_items,
          it.terms_and_conditions as template_terms_and_conditions
        from invoice i
        left join package p
          on p.id::text = i.linked_package
          or p.bubble_id = i.linked_package
          or p.id::text = i.package_id
          or p.bubble_id = i.package_id
        left join invoice_template it
          on it.bubble_id = i.template_id
          or (
            lower(coalesce(i.template_id, '')) = 'default'
            and it.is_default is true
            and it.active is distinct from false
          )
        where (i.bubble_id = $1 or i.id::text = $1 or i.invoice_number = $1)
          and i.is_deleted is distinct from true
        order by i.is_latest desc nulls last, i.updated_at desc nulls last, i.id desc
        limit 1
      `,
      [invoiceUid],
    );

    if (!rows[0]) {
      throw new Error(`Invoice not found for UID ${invoiceUid}`);
    }

    const row = rows[0];
    const productRefs = [
      row.package_panel,
      row.package_inverter_1,
      row.package_inverter_2,
      row.package_inverter_3,
      row.package_inverter_4,
    ];
    const [products, customer] = await Promise.all([
      fetchOptionalProducts(productRefs),
      fetchOptionalCustomer(row.linked_customer),
    ]);

    return normalizeBundle(row, products, customer);
  }

  function formatDate(value) {
    const date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date());
    }

    return new Intl.DateTimeFormat("en-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  const currency = new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  window.EternalgyInvoiceData = {
    getInvoiceUid,
    fetchInvoiceBundle,
    formatDate,
    formatCurrency: (value) => (numberValue(value) ? currency.format(Number(value)) : "Pending final pricing"),
    helpers: {
      arrayValue,
      nonEmpty,
      numberValue,
    },
  };
})();
