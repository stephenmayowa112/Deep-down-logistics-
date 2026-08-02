const fs = require('fs');

let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

const regex = /doc\.text\(`CONTAINER NUMBER NO: \$\{containerNo\}`\, 195, 76, \{ align: "right" \}\);\s*doc\.text\(`DATE: \$\{dateStr\}`\, 195, 81, \{ align: "right" \}\);/;

const replacement = `doc.text(\`CONTAINER NUMBER NO: \${containerNo}\`, 195, 66, { align: "right" });
  doc.text(\`DATE: \${dateStr}\`, 195, 71, { align: "right" });
  doc.text(\`LOADED DATE: \_________________________\`, 195, 76, { align: "right" });
  doc.text(\`DEPARTURE DATE: \_________________________\`, 195, 81, { align: "right" });
  doc.text(\`TIME STAMP: \${format(new Date(), "hh:mm:ss a")}\`, 195, 86, { align: "right" });
  doc.text(\`TOTAL FREIGHT (USD): \_________________________\`, 195, 91, { align: "right" });
  doc.text(\`EXCHANGE RATE (USD/NGN): \_________________________\`, 195, 96, { align: "right" });`;

content = content.replace(regex, replacement);
content = content.replace(/startY: 88,/, 'startY: 105,');

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
