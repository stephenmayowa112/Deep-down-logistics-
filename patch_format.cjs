const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target1 = `function formatFreight(cbm: number | string, freightUsdPerCbm?: number): string {
  const cbmValue = typeof cbm === "string" ? parseFloat(cbm) : cbm;
  
  if (!freightUsdPerCbm || freightUsdPerCbm <= 0 || !cbmValue || isNaN(cbmValue)) {
    return "Not yet quoted";
  }

  const total = cbmValue * freightUsdPerCbm;
  return \`\\$\${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`;
}`;

const replace1 = `function formatFreight(cbm: number | string, freightUsdPerCbm?: number, clearingNairaPerCbm?: number): string {
  const cbmValue = typeof cbm === "string" ? parseFloat(cbm) : cbm;
  
  if (!cbmValue || isNaN(cbmValue)) {
    return "Not yet quoted";
  }

  const parts = [];
  if (freightUsdPerCbm && freightUsdPerCbm > 0) {
    const totalUsd = cbmValue * freightUsdPerCbm;
    parts.push(\`\\$\${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`);
  }
  if (clearingNairaPerCbm && clearingNairaPerCbm > 0) {
    const totalNgn = cbmValue * clearingNairaPerCbm;
    parts.push(\`NGN \${totalNgn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\`);
  }

  return parts.length > 0 ? parts.join(" + ") : "Not yet quoted";
}`;

content = content.replace(target1, replace1);

const target2 = `const { phoneNumber, shippingMark, trackingId, containerNumber, ctn, cbm, freightUsdPerCbm, status } = details;`;
const replace2 = `const { phoneNumber, shippingMark, trackingId, containerNumber, ctn, cbm, freightUsdPerCbm, clearingNairaPerCbm, status } = details;`;
content = content.replace(target2, replace2);

const target3 = `const freightLabel = status === "ready_for_pickup" ? formatFreight(cbm, freightUsdPerCbm) : "Pending";`;
const replace3 = `const freightLabel = status === "ready_for_pickup" ? formatFreight(cbm, freightUsdPerCbm, clearingNairaPerCbm) : "Pending";`;
content = content.replace(target3, replace3);

const target4 = `const { phone_number, shipping_mark, tracking_id, container_number, ctn, cbm, freight_usd_per_cbm, status } = req.body || {};`;
const replace4 = `const { phone_number, shipping_mark, tracking_id, container_number, ctn, cbm, freight_usd_per_cbm, clearing_naira_per_cbm, status } = req.body || {};`;
content = content.replace(target4, replace4);

const target5 = `      freightUsdPerCbm: freight_usd_per_cbm,
      status,`;
const replace5 = `      freightUsdPerCbm: freight_usd_per_cbm,
      clearingNairaPerCbm: clearing_naira_per_cbm,
      status,`;
content = content.replace(target5, replace5);

fs.writeFileSync('server.ts', content);
