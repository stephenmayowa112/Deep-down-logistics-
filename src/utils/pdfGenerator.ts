import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Shipment } from "../types";

// Helper to format status text beautifully
const formatStatus = (status: string): string => {
  return status.replace(/_/g, " ").toUpperCase();
};

/**
 * Generates a comprehensive PDF manifest for all of a client's shipments
 */
export function generateClientManifestPDF(
  shippingMark: string,
  phoneNumber: string,
  shipments: Shipment[],
  settings?: any,
  options?: { loadedDate?: string; departureDate?: string; exchangeRate?: string; freightRate?: string; clearingRate?: string }
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

  let totalFreightUsd = 0;
  let totalClearingNaira = 0;

  const tableRows = shipments.map(s => {
    let freightRate = s.freight_usd_per_cbm || 0;
    let clearingRate = s.clearing_naira_per_cbm || 0;
    
    if (options?.freightRate && !isNaN(Number(options.freightRate))) {
      freightRate = Number(options.freightRate);
    } else if (freightRate === 0 && settings?.seaFreightRateUsd) {
      freightRate = settings.seaFreightRateUsd;
    }
    
    if (options?.clearingRate && !isNaN(Number(options.clearingRate))) {
      clearingRate = Number(options.clearingRate);
    } else if (clearingRate === 0 && settings?.seaClearingRateNgn) {
      clearingRate = settings.seaClearingRateNgn;
    }
    
    totalFreightUsd += s.cbm * freightRate;
    totalClearingNaira += s.cbm * clearingRate;

    return [
      `${s.shipping_mark}\n${s.phone_number || ""}`,
      "", // DESCRIPTION
      s.ctn,
      s.cbm.toFixed(2),
      freightRate > 0 ? `${freightRate}` : "$0",
      clearingRate > 0 ? `N${clearingRate.toLocaleString()}` : "N",
      "" // REMARK
    ];
  });

  tableRows.push([
    "TOTAL",
    "",
    "",
    "",
    totalFreightUsd > 0 ? `$${totalFreightUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "$0",
    totalClearingNaira > 0 ? `N${totalClearingNaira.toLocaleString()}` : "N",
    ""
  ]);

  doc.text(`CONTAINER NUMBER NO: ${containerNo}`, 195, 66, { align: "right" });
  doc.text(`DATE: ${dateStr}`, 195, 71, { align: "right" });
  doc.text(`LOADED DATE: ${options?.loadedDate || "_________________________"}`, 195, 76, { align: "right" });
  doc.text(`DEPARTURE DATE: ${options?.departureDate || "_________________________"}`, 195, 81, { align: "right" });
  doc.text(`TIME STAMP: ${format(new Date(), "hh:mm:ss a")}`, 195, 86, { align: "right" });
  doc.text(`TOTAL FREIGHT (USD): ${totalFreightUsd > 0 ? `$${totalFreightUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '_________________________'}`, 195, 91, { align: "right" });
  doc.text(`EXCHANGE RATE (USD/NGN): ${options?.exchangeRate || (settings?.exchangeRateUsdNgn ? settings.exchangeRateUsdNgn.toLocaleString() : "_________________________")}`, 195, 96, { align: "right" });




  autoTable(doc, {
    startY: 105,
    head: [["SHIPPING MARK", "DESCRIPTION", "QTN\n(CTN)", "CBM", "FREIGHT\n(USD/CBM)", "CLEARING\n(NAIRA/CBM)", "REMARK"]],
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

  doc.save(`DDL_Manifest_${shippingMark}_${format(new Date(), "yyyyMMdd")}.pdf`);
}

/**
 * Generates an elegant single-consignment receipt/invoice
 */
export function generateConsignmentReceiptPDF(shipment: Shipment) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const dateStr = format(shipment.created_at, "dd MMM yyyy");
  const updateStr = format(shipment.updated_at, "dd MMM yyyy, hh:mm a");

  // --- Background Decor ---
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 210, 297, "F");

  // Top header bar
  doc.setFillColor(30, 41, 59); // lighter navy #1e293b
  doc.rect(0, 0, 210, 35, "F");

  doc.setFillColor(37, 99, 235); // bright blue accent strip
  doc.rect(0, 35, 210, 1.5, "F");

  // Title Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DEEP DOWN LOGISTICS", 15, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text("Official Consignment Delivery Note & Receipt", 15, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text("DELIVERY NOTE", 210 - 15, 16, { align: "right" });

  doc.setFont("helvetica", "mono");
  doc.setFontSize(9);
  doc.setTextColor(147, 197, 253);
  doc.text(shipment.tracking_id, 210 - 15, 22, { align: "right" });

  // --- Shipment Main Stats Grid ---
  // Left Box: Consignee Details
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, 44, 85, 36, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("CONSIGNEE & NOTIFY PARTY", 19, 49);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Shipping Mark:", 19, 56);
  doc.setFont("helvetica", "bold");
  doc.text(shipment.shipping_mark, 48, 56);

  doc.setFont("helvetica", "normal");
  doc.text("Phone Number:", 19, 63);
  doc.setFont("helvetica", "bold");
  doc.text(shipment.phone_number || "N/A", 48, 63);

  doc.setFont("helvetica", "normal");
  doc.text("Lagos Hub:", 19, 70);
  doc.setFont("helvetica", "bold");
  doc.text("Ikeja Hub / Apapa Depot", 48, 70);

  // Right Box: Shipping & Vessel Info
  doc.setFillColor(255, 255, 255);
  doc.rect(110, 44, 85, 36, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("SHIPPING & VESSEL METADATA", 114, 49);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Container ID:", 114, 56);
  doc.setFont("helvetica", "bold");
  doc.text(shipment.container_id || "PENDING DEPARTURE", 143, 56);

  doc.setFont("helvetica", "normal");
  doc.text("Date Logged:", 114, 63);
  doc.setFont("helvetica", "bold");
  doc.text(dateStr, 143, 63);

  doc.setFont("helvetica", "normal");
  doc.text("Last Updated:", 114, 70);
  doc.setFont("helvetica", "bold");
  doc.text(updateStr, 143, 70);

  // --- Dimension Metrics ---
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.rect(15, 86, 180, 15, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text(`MEASURED VOLUME:`, 20, 95);
  doc.setFont("helvetica", "bold");
  doc.text(`${shipment.cbm.toFixed(3)} CBM`, 58, 95);

  doc.setFont("helvetica", "normal");
  doc.text(`TOTAL QUANTITY:`, 110, 95);
  doc.setFont("helvetica", "bold");
  doc.text(`${shipment.ctn} Cartons (CTN)`, 145, 95);

  // --- Current Status Panel ---
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(153, 246, 228);
  doc.rect(15, 107, 180, 22, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(13, 148, 136);
  doc.text("CONSIGNMENT REAL-TIME STATUS", 20, 113);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(formatStatus(shipment.status), 20, 122);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Securely cleared & handled via official maritime shipping lanes.", 100, 122);

  // --- FINANCIAL CALCULATION SECTION (IF CHARGES PREVALENT) ---
  const freightRate = shipment.freight_usd_per_cbm || 0;
  const clearingRate = shipment.clearing_naira_per_cbm || 0;

  if (freightRate > 0 || clearingRate > 0) {
    const totalFreightUsd = shipment.cbm * freightRate;
    const totalClearingNaira = shipment.cbm * clearingRate;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("ESTIMATED SHIPPING FEES", 15, 140);

    const feeRows = [];
    if (freightRate > 0) {
      feeRows.push([
        "Freight Fee (Ocean Consolidation)",
        `${shipment.cbm.toFixed(3)} CBM x $${freightRate.toFixed(2)}`,
        `$${totalFreightUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    }
    if (clearingRate > 0) {
      feeRows.push([
        "Lagos Customs Clearing & Port Logistics",
        `${shipment.cbm.toFixed(3)} CBM x NGN ${clearingRate.toLocaleString()}`,
        `NGN ${totalClearingNaira.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
    }

    autoTable(doc, {
      startY: 144,
      head: [["Billing Item", "Calculation Formula", "Total Payable Amount"]],
      body: feeRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: "center" },
        2: { cellWidth: 50, fontStyle: "bold", halign: "right" }
      },
      styles: {
        fontSize: 8,
        cellPadding: 3.5
      }
    });
  }

  // --- Terms & Footer ---
  const currentY = (doc as any).lastAutoTable?.finalY || 140;
  const disclaimerY = Math.max(currentY + 12, 175);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("TERMS AND IMPORT POLICIES:", 15, disclaimerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  
  const rules = [
    "1. Payments must be fully cleared before physical release of cargo at the Lagos office hub.",
    "2. Demurrage charges may apply for consignments left at our facility beyond 14 working days post-arrival.",
    "3. Deep Down Logistics guarantees secure warehousing & insurance during sea vessel crossing.",
    "4. All inquiries should quote the unique Tracking ID provided on the top header of this document."
  ];

  rules.forEach((rule, idx) => {
    doc.text(rule, 15, disclaimerY + 5 + (idx * 4.5));
  });

  // Stamp Signatures
  const stampY = disclaimerY + 30;
  doc.setDrawColor(226, 232, 240);
  doc.line(15, stampY, 70, stampY);
  doc.line(140, stampY, 195, stampY);

  doc.text("Warehouse Supervisor Signature", 15, stampY + 4);
  doc.text("Authorized Representative Stamp", 140, stampY + 4);

  // Bottom Watermark
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text("DEEP DOWN LOGISTICS SYSTEM GENERATED CARGO STATEMENT", 15, 282);

  doc.save(`DDL_Receipt_${shipment.tracking_id}.pdf`);
}

/**
 * Generates a comprehensive PDF manifest of ALL shipments for the admin dashboard
 */
export function generateAdminManifestPDF(shipments: Shipment[]) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const totalCBM = shipments.reduce((sum, s) => sum + (s.cbm || 0), 0);
  const totalCTN = shipments.reduce((sum, s) => sum + (s.ctn || 0), 0);
  const dateStr = format(new Date(), "dd MMM yyyy, hh:mm a");

  // A4 Landscape: 297mm x 210mm
  // Background Tint
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, 297, 210, "F");

  // Header Banner
  doc.setFillColor(15, 23, 42); // deep navy #0f172a
  doc.rect(0, 0, 297, 35, "F");

  doc.setFillColor(37, 99, 235); // Blue strip
  doc.rect(0, 35, 297, 1.5, "F");

  // Title Branding
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DEEP DOWN LOGISTICS - CENTRAL OFFICE", 15, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(156, 163, 175);
  doc.text("Master Consolidated Cargo Manifest & Cargo Tracking Register", 15, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("MASTER SYSTEM MANIFEST", 297 - 15, 15, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253);
  doc.text(`Export Date: ${dateStr}`, 297 - 15, 21, { align: "right" });

  // Summary Metrics Panels (Horizontal flex on landscape)
  const metricWidth = 83;
  const metricHeight = 16;
  const metricY = 43;

  // Panel 1: Active Shipments
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, metricY, metricWidth, metricHeight, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL REGISTERED CONSIGNMENTS", 20, metricY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${shipments.length} Active Records`, 20, metricY + 11);

  // Panel 2: Total Volume
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.rect(15 + metricWidth + 8, metricY, metricWidth, metricHeight, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 64, 175);
  doc.text("COMBINED CONSOLIDATED VOLUME", 15 + metricWidth + 13, metricY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${totalCBM.toFixed(3)} Cubic Meters (CBM)`, 15 + metricWidth + 13, metricY + 11);

  // Panel 3: Total Cartons
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(153, 246, 228);
  doc.rect(15 + (metricWidth * 2) + 16, metricY, metricWidth, metricHeight, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 118, 110);
  doc.text("COMBINED PACKAGE COUNT", 15 + (metricWidth * 2) + 21, metricY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${totalCTN} Cartons (CTN)`, 15 + (metricWidth * 2) + 21, metricY + 11);

  // Table header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("CONSOLIDATION REGISTER MATRIX", 15, 68);

  // Table rows
  const tableRows = shipments.map((s, idx) => [
    idx + 1,
    s.tracking_id,
    s.shipping_mark,
    s.phone_number || "N/A",
    s.container_id || "PENDING DEPARTURE",
    `${s.cbm.toFixed(3)} CBM`,
    `${s.ctn} CTN`,
    formatStatus(s.status),
  ]);

  // Table Render
  autoTable(doc, {
    startY: 72,
    head: [["S/N", "Tracking ID", "Shipping Mark", "Consignee Phone", "Container ID", "CBM Volume", "CTN Count", "Transit Status"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 35, fontStyle: "bold", halign: "center" },
      2: { cellWidth: 40, fontStyle: "bold" },
      3: { cellWidth: 35, halign: "center" },
      4: { cellWidth: 45, halign: "center" },
      5: { cellWidth: 25, halign: "right" },
      6: { cellWidth: 22, halign: "right" },
      7: { cellWidth: 55, fontStyle: "bold" },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
  });

  // Footer metadata
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225);
    doc.text("DEEP DOWN LOGISTICS MASTER MANIFEST DISPATCH SYSTEM • CONFIDENTIAL", 15, 203);
    doc.text(`Page ${i} of ${totalPages}`, 297 - 15, 203, { align: "right" });
  }

  doc.save(`DDL_Master_Manifest_${format(new Date(), "yyyyMMdd_HHmmss")}.pdf`);
}
