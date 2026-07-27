const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

content = content.replace(
  /\(containerShipments\)\.length/g,
  '(containerShipments as Shipment[]).length'
);
content = content.replace(
  /containerShipments\.length/g,
  '(containerShipments as Shipment[]).length'
);
content = content.replace(
  /containerShipments\.map/g,
  '(containerShipments as Shipment[]).map'
);

fs.writeFileSync('src/pages/AdminDashboard.tsx', content);
