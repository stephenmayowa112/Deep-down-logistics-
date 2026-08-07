import { format } from "date-fns";
import { Shipment } from "../types";
import { DEFAULT_FREIGHT_USD_PER_CBM } from "../constants";

// Mirrors the layout of generateClientManifestPDF() in pdfGenerator.ts (the
// "GUANGZHOU PACKING LIST" design already approved as a WhatsApp image
// template with Meta) but rendered to a single-shipment PNG via Canvas
// instead of jsPDF, since WhatsApp needs image bytes, not a PDF.
const WIDTH = 1000;
const BASE_HEIGHT = 820; // tuned for the 2-line case: 1-word mark + phone number
const MARGIN = 45;
const SERIF = "'Times New Roman', Times, serif";

const COLS = [
  { label: "SHIPPING MARK", width: 150 },
  { label: "DESCRIPTION", width: 150 },
  { label: "QTY\n(CTN)", width: 90 },
  { label: "CBM", width: 90 },
  { label: "FREIGHT\n(USD/CBM)", width: 130 },
  { label: "CLEARING\n(NAIRA/CBM)", width: 140 },
  { label: "REMARK", width: 130 },
];

const RULES = [
  "1. Cost of freight, custom formalities and other chargers shall be paid within TWO WEEKS FROM the date our agent inform",
  "   you to carry the goods in our warehouse.",
  "2. Goods left in our warehouse for ONE MONTH from the date our agent inform to carry without being paid and collected",
  "   by our customer will be at owner's risk and may be disposed auction, so as to recover our money and avoid congestion",
  "   in our warehouse.",
  "3. Please all copies, various and fragile items are at owners risk.",
  "4. Before you collect the goods from our warehouse, please check the package list, be sure all the package is well and",
  "   complete.",
  "Thanks for co-operating with us! Remain Blessed.",
];

function drawTableRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  rowY: number,
  rowH: number,
  cells: string[],
  bold: boolean,
  fontSize: number
) {
  let cx = x;
  for (let i = 0; i < cells.length; i++) {
    const colWidth = COLS[i].width;
    ctx.strokeRect(cx, rowY, colWidth, rowH);

    ctx.font = `${bold ? "bold " : ""}${fontSize}px ${SERIF}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "#000000";

    const lines = cells[i].split("\n");
    const lineHeight = fontSize + 4;
    const startY = rowY + rowH / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize / 3;
    lines.forEach((line, li) => ctx.fillText(line, cx + colWidth / 2, startY + li * lineHeight));

    cx += colWidth;
  }
}

// Renders a single shipment's packing-list details onto the approved image
// template's layout and returns the PNG bytes ready for the WhatsApp Media API.
export function generatePackingListImage(shipment: Shipment): Promise<Blob> {
  // One word per line (plus the phone number on its own line below), matching
  // how the approved template's shipping-mark cell was drawn up. Computed up
  // front since it determines how tall the data row (and so the canvas) needs
  // to be, before anything is drawn.
  const shippingMarkLines = [
    ...(shipment.shipping_mark || "N/A").trim().split(/\s+/).filter(Boolean),
    ...(shipment.phone_number ? [shipment.phone_number] : []),
  ];
  const dataRowH = Math.max(60, shippingMarkLines.length * 18 + 24);
  const HEIGHT = BASE_HEIGHT + (dataRowH - 60);

  const canvas = document.createElement("canvas");
  const scale = 2; // render at 2x for crisp text on WhatsApp's preview
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.reject(new Error("Canvas 2D context is not available"));
  }
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#000000";

  let y = 50;
  ctx.textAlign = "center";
  ctx.font = `bold 34px ${SERIF}`;
  ctx.fillText("DEEP DOWN LOGISTICS LIMITED", WIDTH / 2, y);

  y += 22;
  ctx.font = `bold 15px ${SERIF}`;
  ctx.fillText("....AIR CARGO,SEA SHIPPING,GROUPAGE,FULL CONTAINER AND CLEARING....", WIDTH / 2, y);

  y += 24;
  ctx.font = `bold 13px ${SERIF}`;
  ctx.fillText(
    "China Office: No.111 JUNCTURE NORTH STATION ROAD AND SHA YONG SOUTH RDYUEIXIU DISTRICT GUANGZHOU",
    WIDTH / 2,
    y
  );
  y += 18;
  ctx.fillText("TEL: BISHOP +86 13250277859 OFFICE LINE +8613048001610", WIDTH / 2, y);
  y += 22;
  ctx.fillText(
    "Warehouse: WAREHOUSE NO.111 JUNCTURE NORTH STATION SOUTH ROAD AND SHA YONG SOUTH RDYUEIXIU DISTRICT",
    WIDTH / 2,
    y
  );
  y += 18;
  ctx.fillText("CONTACT-PERSON: BISHOP +86 1325077859 OFFICE LINE: +86 13048001610", WIDTH / 2, y);

  y += 34;
  ctx.font = `bold 26px ${SERIF}`;
  ctx.fillText("GUANGZHOU PACKING LIST", WIDTH / 2, y);

  y += 30;
  ctx.textAlign = "left";
  ctx.font = `bold 14px ${SERIF}`;
  ctx.fillText("NIGERIA OFFICE: ONYEMCO 08033085846", MARGIN, y);
  const rightBlockTop = y;
  y += 20;
  ctx.fillText("LAGOS OFFICE EMAIL: deepdownlogisticsltd@gmail.com", MARGIN, y);
  y += 20;
  ctx.fillText("B77 PLAZA A.P.T. TRADEFAIR INTERNATIONAL", MARGIN, y);
  y += 20;
  ctx.fillText("MARKET, BADAGRY EXPRESS WAY, LAGOS", MARGIN, y);

  ctx.textAlign = "right";
  ctx.fillText(`CONTAINER NUMBER NO: ${shipment.container_id || "N/A"}`, WIDTH - MARGIN, rightBlockTop + 40);
  ctx.fillText(`DATE: ${format(new Date(), "d/M/yyyy")}`, WIDTH - MARGIN, rightBlockTop + 60);

  y += 40;

  const freightRate = shipment.freight_usd_per_cbm || DEFAULT_FREIGHT_USD_PER_CBM;
  const clearingRate = shipment.clearing_naira_per_cbm || 0;
  const totalFreight = shipment.cbm * freightRate;
  const totalClearing = shipment.cbm * clearingRate;

  const headerCells = COLS.map((c) => c.label);
  const dataCells = [
    shippingMarkLines.join("\n"),
    "",
    String(shipment.ctn ?? ""),
    shipment.cbm != null ? shipment.cbm.toFixed(2) : "",
    freightRate > 0 ? `$${freightRate}` : "N/A",
    clearingRate > 0 ? `N${clearingRate.toLocaleString()}` : "N/A",
    "",
  ];
  const totalCells = [
    "TOTAL",
    "",
    "",
    "",
    totalFreight > 0 ? `$${totalFreight.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A",
    totalClearing > 0 ? `N${totalClearing.toLocaleString()}` : "N/A",
    "",
  ];

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.3;

  const headerRowH = 46;
  const totalRowH = 34;
  const tableTop = y;

  drawTableRow(ctx, MARGIN, tableTop, headerRowH, headerCells, true, 13);
  drawTableRow(ctx, MARGIN, tableTop + headerRowH, dataRowH, dataCells, false, 14);
  drawTableRow(ctx, MARGIN, tableTop + headerRowH + dataRowH, totalRowH, totalCells, true, 13);

  y = tableTop + headerRowH + dataRowH + totalRowH + 34;

  ctx.textAlign = "left";
  ctx.font = `bold 15px ${SERIF}`;
  ctx.fillText("DEAR CUSTOMER:", MARGIN, y);
  y += 22;

  ctx.font = `bold 12.5px ${SERIF}`;
  RULES.forEach((line) => {
    ctx.fillText(line, MARGIN, y);
    y += 19;
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to render packing list image"));
    }, "image/png");
  });
}
