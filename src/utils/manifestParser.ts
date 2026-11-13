// Reads a Guangzhou manifest into shipments. Two layouts are accepted:
//
// 1. The manifest as the China office sends it:
//      THIS MANIFEST IS ON THE 05/10/2026 FROM GUANGZHOU CONTAINER NO:D2237 (MSKU1511295) ...
//      Name | Phone Number | Description | CBM | CTN | ORDER NO | PRICE | TOTAL($)
//      JOY  | 07037739313  | Jewelry     | 0.2 | 2   | ...      | 130   | 26
//      ,,,0.400,,,,52.000        <- totals row, skipped
//    The container comes from the title. Header names vary between files
//    (NAME/Name, NUMBER/Phone Number, CBM/CBN), so columns are matched by name.
//
// 2. The original template: container_number, shipping_mark, phone_number, ctn, cbm.

import Papa from "papaparse";

// The manifest's first sheet (Excel) or the CSV, as rows of cells.
export async function readManifestFile(file: File): Promise<unknown[][]> {
  if (/\.xlsx?$/i.test(file.name)) {
    // Loaded only when an Excel file is uploaded, to keep the dashboard bundle small.
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer());
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  }
  if (!/\.csv$/i.test(file.name)) throw new Error("Upload the manifest as .xlsx, .xls or .csv.");

  return new Promise((resolve, reject) => {
    Papa.parse<unknown[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: () => reject(new Error("Could not read the CSV file.")),
    });
  });
}

export interface ManifestShipment {
  container_id: string;
  shipping_mark: string;
  phone_number: string;
  ctn: number;
  cbm: number;
  freight_usd_per_cbm?: number;
  clearing_naira_per_cbm?: number;
}

export interface ParsedManifest {
  containerId: string;
  shipments: ManifestShipment[];
}

type Field = "container" | "mark" | "phone" | "ctn" | "cbm" | "price" | "totalUsd" | "clearing";

// Header text with spaces, brackets and punctuation removed, upper-cased: "TOTAL ($)" -> "TOTAL$".
const norm = (v: unknown) => String(v ?? "").toUpperCase().replace(/[\s()_.:-]/g, "");

const HEADERS: Record<string, Field> = {
  CONTAINERNUMBER: "container",
  CONTAINER: "container",
  SHIPPINGMARK: "mark",
  NAME: "mark",
  MARK: "mark",
  PHONENUMBER: "phone",
  NUMBER: "phone",
  PHONE: "phone",
  CTN: "ctn",
  QTY: "ctn",
  QTYCTN: "ctn",
  CBM: "cbm",
  CBN: "cbm",
  PRICE: "price",
  "TOTAL$": "totalUsd",
  "TOTAL#": "clearing",
};

// "...CONTAINER NO:D2237 (MSKU1511295)  JOJO" -> "D2237 (MSKU1511295)"
function containerFromTitle(rows: unknown[][]): string {
  for (const row of rows.slice(0, 5)) {
    const text = row.map((c) => String(c ?? "")).join(" ");
    const m = text.match(/CONTAINER\s*NO\s*[:.]?\s*([A-Z0-9]+)\s*(\(\s*[A-Z0-9]+\s*\))?/i);
    if (m) return [m[1], m[2]?.replace(/\s+/g, "")].filter(Boolean).join(" ").toUpperCase();
  }
  return "";
}

const num = (v: unknown): number | undefined => {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

// Excel drops the leading 0 from Nigerian numbers: 8033056601 -> 08033056601.
function cleanPhone(v: unknown): string {
  const s = String(v ?? "").trim();
  return /^[789]\d{9}$/.test(s) ? `0${s}` : s;
}

export function parseManifestRows(rows: unknown[][]): ParsedManifest {
  const headerIndex = rows.findIndex((row) => {
    const fields = new Set(row.map((c) => HEADERS[norm(c)]).filter(Boolean));
    return fields.has("mark") && (fields.has("ctn") || fields.has("cbm"));
  });
  if (headerIndex === -1) {
    throw new Error("Could not find the header row. It needs a Name (or Shipping Mark) column and a CTN or CBM column.");
  }

  const columns: Partial<Record<Field, number>> = {};
  rows[headerIndex].forEach((cell, i) => {
    const field = HEADERS[norm(cell)];
    if (field && columns[field] === undefined) columns[field] = i;
  });

  // The per-CBM freight rate is in PRICE when the file has it. Without PRICE,
  // "TOTAL ($)" is the rate (MANIFEST.xlsx); with PRICE, "TOTAL($)" is the line total.
  const freightColumn = columns.price ?? columns.totalUsd;
  const titleContainer = containerFromTitle(rows.slice(0, headerIndex + 1));
  const cell = (row: unknown[], field?: number) => (field === undefined ? undefined : row[field]);

  const shipments: ManifestShipment[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const mark = String(cell(row, columns.mark) ?? "").trim();
    if (!mark || /^TOTALS?$/i.test(mark)) continue; // blank and totals rows

    const freight = num(cell(row, freightColumn));
    const clearing = num(cell(row, columns.clearing));
    const shipment: ManifestShipment = {
      container_id: String(cell(row, columns.container) ?? "").trim() || titleContainer || "UNKNOWN",
      shipping_mark: mark,
      phone_number: cleanPhone(cell(row, columns.phone)),
      ctn: Math.round(num(cell(row, columns.ctn)) ?? 0),
      cbm: Math.round((num(cell(row, columns.cbm)) ?? 0) * 1000) / 1000,
    };
    // Only set rates the file actually has: Firestore rejects undefined values.
    if (freight) shipment.freight_usd_per_cbm = freight;
    if (clearing) shipment.clearing_naira_per_cbm = clearing;
    shipments.push(shipment);
  }

  if (!shipments.length) throw new Error("No shipments found under the header row.");
  return { containerId: titleContainer, shipments };
}
