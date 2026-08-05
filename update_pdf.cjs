const fs = require('fs');

let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

// Update function signature
content = content.replace(
  /export function generateClientManifestPDF\([\s\S]*?\)\s*\{/,
  `export function generateClientManifestPDF(
  shippingMark: string,
  phoneNumber: string,
  shipments: Shipment[],
  settings?: any,
  options?: { loadedDate?: string; departureDate?: string; exchangeRate?: string; freightRate?: string; clearingRate?: string }
) {`
);

// Update tableRows mapping
content = content.replace(
  /const tableRows = shipments\.map\(s => \{[\s\S]*?return \[\s*`\$\{s\.shipping_mark\}\\n\$\{s\.phone_number \|\| ""\}`,\s*"", \/\/ DESCRIPTION\s*s\.ctn,\s*s\.cbm\.toFixed\(2\),\s*freightRate > 0 \? `\$\$\{freightRate\}` : "\$0",\s*clearingRate > 0 \? `N\$\{clearingRate\.toLocaleString\(\)\}` : "N",\s*"" \/\/ REMARK\s*\];\s*\}\);/,
  `const tableRows = shipments.map(s => {
    let freightRate = s.freight_usd_per_cbm || 0;
    let clearingRate = s.clearing_naira_per_cbm || 0;
    
    if (options?.freightRate && !isNaN(Number(options.freightRate))) {
      freightRate = Number(options.freightRate);
    } else if (freightRate === 0 && settings?.seaFreightRateUsd) {
      freightRate = settings.seaFreightRateUsd;
    }
    
    if (options?.clearingRate && !isNaN(Number(options.clearingRate))) {
      clearingRate = Number(options.clearingRate);
    } else if (clearingRate === 0 && settings?.seaClearingRateNgn) {
      clearingRate = settings.seaClearingRateNgn;
    }
    
    totalFreightUsd += s.cbm * freightRate;
    totalClearingNaira += s.cbm * clearingRate;

    return [
      \`\${s.shipping_mark}\\n\${s.phone_number || ""}\`,
      "", // DESCRIPTION
      s.ctn,
      s.cbm.toFixed(2),
      freightRate > 0 ? \`$\${freightRate}\` : "$0",
      clearingRate > 0 ? \`N\${clearingRate.toLocaleString()}\` : "N",
      "" // REMARK
    ];
  });`
);

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
