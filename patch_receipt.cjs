const fs = require('fs');

const content = fs.readFileSync('src/pages/ClientDashboard.tsx', 'utf8');

const updated = content.replace(
  /generateConsignmentReceiptPDF\(shipment\)/g,
  'generateClientManifestPDF(shipment.shipping_mark || "UNMARKED", shipment.phone_number || "", [shipment])'
);

fs.writeFileSync('src/pages/ClientDashboard.tsx', updated);
