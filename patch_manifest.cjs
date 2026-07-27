const fs = require('fs');

const content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');

const regex = /export function generateClientManifestPDF\([\s\S]*?\n\}/;

const newFunction = `export function generateClientManifestPDF(
  shippingMark: string,
  phoneNumber: string,
  shipments: Shipment[]
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const totalCBM = shipments.reduce((sum, s) => sum + (s.cbm || 0), 0);
  const totalCTN = shipments.reduce((sum, s) => sum + (s.ctn || 0), 0);
  const dateStr = format(new Date(), "dd/M/yyyy");
  
  // Use a common container ID if all match, else "VARIOUS"
  const containerIds = [...new Set(shipments.map(s => s.container_id).filter(Boolean))];
  const containerNo = containerIds.length === 1 ? containerIds[0] : (containerIds.length > 1 ? "VARIOUS" : "PENDING");

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 210, 297, "F");

  // Times font for the classic look
  doc.setFont("times", "bold");
  doc.setTextColor(0, 0, 0);

  // Header texts
  doc.setFontSize(22);
  doc.text("DEEP DOWN LOGISTICS LIMITED", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.text("....AIR CARGO,SEA SHIPPING,GROUPAGE,FULL CONTAINER AND CLEARING....", 105, 26, { align: "center" });
  
  doc.setFontSize(9);
  doc.text("China Office: No.111 JUNCTURE NORTH STATION ROAD AND SHA YONG SOUTH RDYUEIXIU DISTRICT GUANGZHOU", 105, 32, { align: "center" });
  doc.text("TEL: BISHOP +86 13250277859 OFFICE LINE +8613048001610", 105, 37, { align: "center" });
  
  doc.text("Warehouse: WAREHOUSE NO.111 JUNCTURE NORTH STATION SOUTH ROAD AND SHA YONG SOUTH RDYUEIXIU DISTRICT", 105, 43, { align: "center" });
  doc.text("CONTACT-PERSON: BISHOP +86 1325077859 OFFICE LINE: +86 13048001610", 105, 48, { align: "center" });

  doc.setFontSize(18);
  doc.text("GUANGZHOU PACKING LIST", 105, 58, { align: "center" });

  doc.setFontSize(9);
  doc.text("NIGERIA OFFICE: ONYEMCO 08033085846", 15, 66);
  doc.text("LAGOS OFFICE EMAIL: deepdownlogisticsltd@gmail.com", 15, 71);
  doc.text("B77 PLAZA A.P.T. TRADEFAIR INTERNATIONAL", 15, 76);
  doc.text("MARKET, BADAGRY EXPRESS WAY, LAGOS", 15, 81);

  doc.text(\`CONTAINER NUMBER NO: \${containerNo}\`, 195, 76, { align: "right" });
  doc.text(\`DATE: \${dateStr}\`, 195, 81, { align: "right" });

  let totalFreightUsd = 0;
  let totalClearingNaira = 0;

  const tableRows = shipments.map(s => {
    const freightRate = s.freight_usd_per_cbm || 0;
    const clearingRate = s.clearing_naira_per_cbm || 0;
    
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
  });

  tableRows.push([
    "TOTAL",
    "",
    "",
    "",
    totalFreightUsd > 0 ? \`$\${totalFreightUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}\` : "$0",
    totalClearingNaira > 0 ? \`N\${totalClearingNaira.toLocaleString()}\` : "N",
    ""
  ]);

  autoTable(doc, {
    startY: 88,
    head: [["SHIPPING MARK", "DESCRIPTION", "QTN\\n(CTN)", "CBM", "FREIGHT\\n(USD/CBM)", "CLEARING\\n(NAIRA/CBM)", "REMARK"]],
    body: tableRows,
    theme: "plain",
    styles: {
      font: "times",
      fontSize: 9,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      halign: "center",
      valign: "middle",
      minCellHeight: 12
    },
    headStyles: {
      fontStyle: "bold",
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 35 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
      6: { cellWidth: 25 },
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.text("DEAR CUSTOMER:", 15, finalY);
  
  const rules = [
    "1. Cost of freight, custom formalities and other chargers shall be paid within TWO WEEKS FROM the date our agent inform",
    "   you to carry the goods in our warehouse.",
    "2. Goods left in our warehouse for ONE MONTH from the date our agent inform to carry without being paid and collected",
    "   by our customer will be at owner's risk and may be disposed auction, so as to recover our money and avoid congestion",
    "   in our warehouse.",
    "3. Please all copies, various and fragile items are at owners risk.",
    "4. Before you collect the goods from our warehouse, please check the package list, be sure all the package is well and",
    "   complete.",
    "Thanks for co-operating with us! Remain Blessed."
  ];

  doc.setFontSize(8.5);
  let currentY = finalY + 5;
  rules.forEach((line) => {
    if (line.startsWith("Thanks")) {
      doc.setFont("times", "bold");
    } else if (line.startsWith("1.") || line.startsWith("2.") || line.startsWith("3.") || line.startsWith("4.")) {
      doc.setFont("times", "bold");
    } else {
      doc.setFont("times", "bold");
    }
    doc.text(line, 15, currentY);
    currentY += 4.5;
  });

  doc.save(\`DDL_Manifest_\${shippingMark}_\${format(new Date(), "yyyyMMdd")}.pdf\`);
}`;

const newContent = content.replace(regex, newFunction);
fs.writeFileSync('src/utils/pdfGenerator.ts', newContent);
