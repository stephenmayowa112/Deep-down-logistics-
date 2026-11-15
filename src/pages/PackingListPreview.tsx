import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { generatePackingListImage } from "../utils/packingListImageGenerator";
import { PricingSettings, Shipment } from "../types";

// Dev route to visually inspect generatePackingListImage()'s output
// against live Firestore shipments and pricing settings.
export default function PackingListPreview() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [settings, setSettings] = useState<Pick<PricingSettings, "seaFreightRateUsd" | "seaClearingRateNgn">>({
    seaFreightRateUsd: 180,
    seaClearingRateNgn: 300000,
  });
  const [selectedId, setSelectedId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "shipments"), orderBy("created_at", "desc"));
    const unsubscribeShipments = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Shipment[];
        setShipments(data);
        setSelectedId((prev) => (prev && data.some((s) => s.id === prev) ? prev : data[0]?.id ?? ""));
        setLoading(false);
      },
      (err) => {
        setError("Failed to load shipments from Firestore");
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, "shipments");
      }
    );

    const unsubscribeSettings = onSnapshot(
      doc(db, "settings", "pricing"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<PricingSettings>;
          setSettings({
            seaFreightRateUsd: data.seaFreightRateUsd ?? 180,
            seaClearingRateNgn: data.seaClearingRateNgn ?? 300000,
          });
        }
      },
      (err) => {
        console.error("Failed to subscribe to settings:", err);
      }
    );

    return () => {
      unsubscribeShipments();
      unsubscribeSettings();
    };
  }, []);

  const selectedShipment = shipments.find((s) => s.id === selectedId);

  useEffect(() => {
    if (!selectedShipment) {
      setImageUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    setImageUrl(null);
    setError(null);

    generatePackingListImage(selectedShipment, settings)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch((err) => {
        if (!active) return;
        setError(String(err));
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedShipment, settings]);

  return (
    <div style={{ padding: 24, background: "#e5e7eb", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 16 }}>Packing List Image Preview</h1>

      {loading ? (
        <p>Loading shipments...</p>
      ) : shipments.length === 0 ? (
        <p>No shipments found in Firestore. Add or import a shipment in the Admin Dashboard to preview its packing list.</p>
      ) : (
        <label style={{ display: "block", marginBottom: 16 }}>
          Shipment:{" "}
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.tracking_id} — {s.shipping_mark} ({s.ctn} CTN, {s.cbm} CBM)
              </option>
            ))}
          </select>
        </label>
      )}

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
