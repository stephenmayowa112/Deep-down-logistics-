const fs = require('fs');

let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

const regex = /  doc\.text\(`DATE: \$\{dateStr\}`\, 195, 71, \{ align: "right" \}\);\n  doc\.text\(`LOADED DATE: \_________________________\`, 195, 76, \{ align: "right" \}\);\n  doc\.text\(`DEPARTURE DATE: \_________________________\`, 195, 81, \{ align: "right" \}\);\n  doc\.text\(`TIME STAMP: \$\{format\(new Date\(\), "hh:mm:ss a"\)\}\`, 195, 86, \{ align: "right" \}\);\n  doc\.text\(`TOTAL FREIGHT \(USD\): \_________________________\`, 195, 91, \{ align: "right" \}\);\n  doc\.text\(`EXCHANGE RATE \(USD\/NGN\): \_________________________\`, 195, 96, \{ align: "right" \}\);/g;

content = content.replace(regex, "");

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
