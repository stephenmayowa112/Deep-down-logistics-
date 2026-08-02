const fs = require('fs');

let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

content = content.replace(
  /export function generateClientManifestPDF\([\s\S]*?\)\s*\{/,
  `export function generateClientManifestPDF(
  shippingMark: string,
  phoneNumber: string,
  shipments: Shipment[],
  settings?: any,
  options?: { loadedDate?: string; departureDate?: string; exchangeRate?: string }
) {`
);

content = content.replace(
  'doc.text(`LOADED DATE: _________________________`, 195, 76, { align: "right" });',
  'doc.text(`LOADED DATE: ${options?.loadedDate || "_________________________"}`, 195, 76, { align: "right" });'
);

content = content.replace(
  'doc.text(`DEPARTURE DATE: _________________________`, 195, 81, { align: "right" });',
  'doc.text(`DEPARTURE DATE: ${options?.departureDate || "_________________________"}`, 195, 81, { align: "right" });'
);

content = content.replace(
  /doc\.text\(`EXCHANGE RATE \(USD\/NGN\): \$\{settings\?.exchangeRateUsdNgn \? settings.exchangeRateUsdNgn.toLocaleString\(\) : '_________________________'\}`\, 195, 96, \{ align: "right" \}\);/g,
  'doc.text(`EXCHANGE RATE (USD/NGN): ${options?.exchangeRate || (settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toLocaleString() : "_________________________")}`, 195, 96, { align: "right" });'
);

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
