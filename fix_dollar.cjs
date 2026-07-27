const fs = require('fs');
let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

content = content.replace(
  /freightRate > 0 \? `\$\{freightRate\}` : "\$0"/g,
  'freightRate > 0 ? `$$${freightRate}` : "$0"'
);

content = content.replace(
  /totalFreightUsd > 0 \? `\$\{totalFreightUsd\.toLocaleString\(undefined, \{ minimumFractionDigits: 0, maximumFractionDigits: 2 \}\)\}` : "\$0"/g,
  'totalFreightUsd > 0 ? `$$${totalFreightUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "$0"'
);

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
