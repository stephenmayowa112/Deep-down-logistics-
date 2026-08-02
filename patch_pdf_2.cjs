const fs = require('fs');

let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

// Move the calculation block to before the header text
const calcBlock = `  let totalFreightUsd = 0;
  let totalClearingNaira = 0;

  const tableRows = shipments.map(s => {
    const freightRate = s.freight_usd_per_cbm || 0;
    const clearingRate = s.clearing_naira_per_cbm || 0;
    
    totalFreightUsd += s.cbm * freightRate;
    totalClearingNaira += s.cbm * clearingRate;

    return [
      \`\${s.shipping_mark}\\n\${s.phone_number || ""}\`,
      "", // DESCRIPTION
      s.ctn,
      s.cbm.toFixed(2),
      freightRate > 0 ? \`$$$\{freightRate}\` : "$0",
      clearingRate > 0 ? \`N\${clearingRate.toLocaleString()}\` : "N",
      "" // REMARK
    ];
  });

  tableRows.push([
    "TOTAL",
    "",
    "",
    "",
    totalFreightUsd > 0 ? \`$$$\{totalFreightUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}\` : "$0",
    totalClearingNaira > 0 ? \`N\${totalClearingNaira.toLocaleString()}\` : "N",
    ""
  ]);`;

content = content.replace(/  let totalFreightUsd = 0;[\s\S]*?  \]\);/, "");

const headerReplacement = `  doc.text(\`CONTAINER NUMBER NO: \${containerNo}\`, 195, 66, { align: "right" });
  doc.text(\`DATE: \${dateStr}\`, 195, 71, { align: "right" });
  doc.text(\`LOADED DATE: \_________________________\`, 195, 76, { align: "right" });
  doc.text(\`DEPARTURE DATE: \_________________________\`, 195, 81, { align: "right" });
  doc.text(\`TIME STAMP: \${format(new Date(), "hh:mm:ss a")}\`, 195, 86, { align: "right" });
  doc.text(\`TOTAL FREIGHT (USD): \${totalFreightUsd > 0 ? \`$$$\{totalFreightUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}\` : '\_________________________'}\`, 195, 91, { align: "right" });
  doc.text(\`EXCHANGE RATE (USD/NGN): \_________________________\`, 195, 96, { align: "right" });`;

content = content.replace(/  doc\.text\(`CONTAINER NUMBER NO[\s\S]*?align: "right" \}\);/, calcBlock + "\n\n" + headerReplacement);

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
