const fs = require('fs');
let content = fs.readFileSync('src/pages/Home.tsx', 'utf8');
content = content.replace('Package,', 'Package, MapPin, Box,');
fs.writeFileSync('src/pages/Home.tsx', content);
