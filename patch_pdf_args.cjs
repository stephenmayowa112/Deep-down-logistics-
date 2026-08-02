const fs = require('fs');

let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

content = content.replace('export function generateClientManifestPDF(\n  shippingMark: string,\n  phoneNumber: string,\n  shipments: Shipment[]\n) {', 'export function generateClientManifestPDF(\n  shippingMark: string,\n  phoneNumber: string,\n  shipments: Shipment[],\n  settings?: any\n) {');

content = content.replace('doc.text(`EXCHANGE RATE (USD/NGN): _________________________`, 195, 96, { align: "right" });', 'doc.text(`EXCHANGE RATE (USD/NGN): ${settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toLocaleString() : \'_________________________\'}`, 195, 96, { align: "right" });');
content = content.replace('doc.text(`EXCHANGE RATE (USD/NGN): _________________________`, 195, 106, { align: "right" });', 'doc.text(`EXCHANGE RATE (USD/NGN): ${settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toLocaleString() : \'_________________________\'}`, 195, 106, { align: "right" });');

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
