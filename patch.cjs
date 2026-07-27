const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /function formatFreight[\s\S]*?return `\$\$\{total\.toLocaleString.*?`[^}]*}/;

const replace = `function formatFreight(cbm: number | string, freightUsdPerCbm?: number, clearingNairaPerCbm?: number): string {
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

content = content.replace(regex, replace);
fs.writeFileSync('server.ts', content);
