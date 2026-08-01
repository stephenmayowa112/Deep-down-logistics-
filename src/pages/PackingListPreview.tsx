import { useEffect, useMemo, useState } from "react";
import { generatePackingListImage } from "../utils/packingListImageGenerator";
import { getMockShipments } from "../lib/mockDb";

// Dev-only route to visually inspect generatePackingListImage()'s output
// without needing to log in as admin or trigger a real WhatsApp send.
// Pulls real records from the mock DB (src/lib/mockDb.ts) so the preview
// reflects actual app data instead of one hand-picked example.
export default function PackingListPreview() {
  const shipments = useMemo(() => getMockShipments(), []);
  const [selectedId, setSelectedId] = useState(shipments[0]?.id ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedShipment = shipments.find((s) => s.id === selectedId);

  useEffect(() => {
    if (!selectedShipment) return;
    setImageUrl(null);
    setError(null);
    generatePackingListImage(selectedShipment)
      .then((blob) => setImageUrl(URL.createObjectURL(blob)))
      .catch((err) => setError(String(err)));
  }, [selectedShipment]);

  return (
    <div style={{ padding: 24, background: "#e5e7eb", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Packing List Image Preview</h1>

      <label style={{ display: "block", marginBottom: 16 }}>
        Mock shipment:{" "}
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
          {shipments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.tracking_id} — {s.shipping_mark} ({s.ctn} CTN, {s.cbm} CBM)
            </option>
          ))}
        </select>
      </label>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Packing list preview"
          style={{ maxWidth: 1000, background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
        />
      )}
    </div>
  );
}
