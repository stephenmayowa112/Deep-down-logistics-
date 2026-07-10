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
  shipments: Shipment[]
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const totalCBM = shipments.reduce((sum, s) => sum + (s.cbm || 0), 0);
  const totalCTN = shipments.reduce((sum, s) => sum + (s.ctn || 0), 0);
  const dateStr = format(new Date(), "dd MMM yyyy, hh:mm a");

  // --- Background Decorative Frame ---
  doc.setFillColor(248, 250, 252); // soft slate background
  doc.rect(0, 0, 210, 297, "F");

  // Accent Header Bar
  doc.setFillColor(15, 23, 42); // deep slate/dark blue #0f172a
  doc.rect(0, 0, 210, 40, "F");

  // Accent Line under header
  doc.setFillColor(37, 99, 235); // bright blue #2563eb
  doc.rect(0, 40, 210, 1.5, "F");

  // --- Brand & Title ---
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("DEEP DOWN LOGISTICS", 15, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text("Premium China to Nigeria Freight Consolidation", 15, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("CONSIGNMENT MANIFEST", 210 - 15, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253); // blue-300
  doc.text(`Generated: ${dateStr}`, 210 - 15, 24, { align: "right" });

  // --- Client Metadata Panel ---
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(15, 48, 180, 22, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text("CONSIGNEE / CLIENT DETAILS", 20, 54);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`SHIPPING MARK: `, 20, 62);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(37, 99, 235);
  doc.text(shippingMark, 52, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`PHONE NUMBER: `, 110, 62);
  doc.setFont("helvetica", "bold");
  doc.text(phoneNumber, 142, 62);

  // --- Summary Cards/KPI Blocks ---
  // Card 1: Total Volume
  doc.setFillColor(239, 246, 255); // very soft blue
  doc.setDrawColor(191, 219, 254);
  doc.rect(15, 76, 56, 18, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text("TOTAL VOLUME", 20, 81);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${totalCBM.toFixed(3)} CBM`, 20, 88);

  // Card 2: Total Packages
  doc.setFillColor(240, 253, 250); // very soft emerald
  doc.setDrawColor(153, 246, 228);
  doc.rect(77, 76, 56, 18, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);
  doc.text("TOTAL PACKAGES", 82, 81);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${totalCTN} Cartons (CTN)`, 82, 88);

  // Card 3: Total Manifest Items
  doc.setFillColor(245, 243, 255); // very soft purple
  doc.setDrawColor(221, 214, 254);
  doc.rect(139, 76, 56, 18, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(109, 40, 217);
  doc.text("CONSIGNMENTS", 144, 81);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${shipments.length} Active Items`, 144, 88);

  // --- Shipment Table Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("MANIFEST CARGO LISTING", 15, 102);

  // Prepare table data
  const tableRows = shipments.map((shipment, index) => [
    index + 1,
    shipment.tracking_id,
    shipment.container_id || "N/A",
    format(shipment.created_at, "dd MMM yyyy"),
    `${shipment.cbm.toFixed(3)} CBM`,
    `${shipment.ctn} CTN`,
    formatStatus(shipment.status),
  ]);

  // Render Table
  autoTable(doc, {
    startY: 106,
    head: [["S/N", "Tracking ID", "Container ID", "Date Received", "Volume", "Quantity", "Current Status"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 35, fontStyle: "bold", halign: "center" },
      2: { cellWidth: 32, halign: "center" },
      3: { cellWidth: 26, halign: "center" },
      4: { cellWidth: 22, halign: "right" },
      5: { cellWidth: 20, halign: "right" },
      6: { cellWidth: 35, fontStyle: "bold" },
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [241, 245, 249],
    },
  });

  // --- Footer Notice & Signatures ---
  const finalY = (doc as any).lastAutoTable.finalY || 160;

  // Add signature section if page has space
  const signatureY = finalY + 15 < 270 ? finalY + 15 : 230;

  doc.setDrawColor(226, 232, 240);
  doc.line(15, signatureY, 75, signatureY);
  doc.line(135, signatureY, 195, signatureY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Prepared by Operations Desk", 15, signatureY + 4);
  doc.text("Deep Down Logistics China Warehouse", 15, signatureY + 8);

  doc.text("Consignee Acceptance & Sign-off", 135, signatureY + 4);
  doc.text("Apapa Port / Lagos Hub Depot", 135, signatureY + 8);

  // System Brand Stamp
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text("DEEP DOWN LOGISTICS MANIFEST MANAGEMENT ENGINE V1.0", 15, 285);
  doc.text("PAGE 1 of 1", 210 - 15, 285, { align: "right" });

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
