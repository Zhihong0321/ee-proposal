/** Named SQL only. The browser must never send a raw sql string. */
const SQL = {
  invoice: `
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
    left join package p on p.id::text = i.linked_package or p.bubble_id = i.linked_package
      or p.id::text = i.package_id or p.bubble_id = i.package_id
    left join invoice_template it on it.bubble_id = i.template_id
      or (lower(coalesce(i.template_id, '')) = 'default' and it.is_default is true and it.active is distinct from false)
    where (i.bubble_id = $1 or i.id::text = $1 or i.invoice_number = $1)
      and i.is_deleted is distinct from true
    order by i.is_latest desc nulls last, i.updated_at desc nulls last, i.id desc
    limit 1
  `,
  products: `
    select *
    from product
    where id::text = any($1::text[])
       or bubble_id = any($1::text[])
       or unique_id = any($1::text[])
  `,
  customer: `
    select *
    from customer
    where id::text = $1
       or customer_id = $1
    limit 1
  `,
  agent: `
    select name, contact, email, user_signature
    from "user"
    where linked_agent_profile = $1
    limit 1
  `,
};

function getSql(name) {
  return SQL[name] || null;
}

module.exports = { SQL, getSql };
