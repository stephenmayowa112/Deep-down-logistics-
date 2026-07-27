import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import fs from "fs";

import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
let databaseId = "(default)";
const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  // In AI Studio, we don't have a service account JSON by default.
  // We can initialize admin using ADC, but we must set the project ID.
  admin.initializeApp({
    projectId: config.projectId,
  });
  if (config.firestoreDatabaseId) {
    databaseId = config.firestoreDatabaseId;
  }
}

// Maps internal shipment status values to human-readable text used in the
// WhatsApp template's {{2}} variable.
const STATUS_LABELS: Record<string, string> = {
  received_china: "Received at China warehouse",
  shipped: "Shipped",
  in_transit_sea: "In transit (sea)",
  in_transit_air: "In transit (air)",
  arrived_lagos: "Arrived in Lagos",
  customs_clearing: "Clearing customs",
  cleared: "Cleared customs",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

interface StatusNotificationDetails {
  phoneNumber: string;
  shippingMark: string;
  trackingId: string;
  containerNumber: string;
  ctn: number | string;
  cbm: number | string;
  freightUsdPerCbm?: number;
  status: string;
}

// Computes the total freight cost the same way generateConsignmentReceiptPDF()
// does in src/utils/pdfGenerator.ts, so the WhatsApp message and the PDF
// receipt never disagree. Falls back to a friendly placeholder when no rate
// has been entered for the shipment yet (mirrors the PDF's `if (freightRate > 0)`
// check, which simply omits the fees section in that case).
function formatFreight(cbm: number | string, freightUsdPerCbm?: number): string {
  const cbmValue = typeof cbm === "string" ? parseFloat(cbm) : cbm;
  if (!freightUsdPerCbm || freightUsdPerCbm <= 0 || !cbmValue || isNaN(cbmValue)) {
    return "Not yet quoted";
  }
  const total = cbmValue * freightUsdPerCbm;
  return `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function sendWhatsAppStatusUpdate(
  details: StatusNotificationDetails
): Promise<{ ok: boolean; error?: string }> {
  const { phoneNumber, shippingMark, trackingId, containerNumber, ctn, cbm, freightUsdPerCbm, status } = details;
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "shipment_status_update";

  if (!token || !phoneNumberId) {
    console.warn("WhatsApp not configured (missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID); skipping notification.");
    return { ok: false, error: "not_configured" };
  }

  // WhatsApp requires E.164 format (digits only, with country code, no leading +/spaces/dashes).
  const toNumber = phoneNumber.replace(/[^\d]/g, "");
  const statusLabel = STATUS_LABELS[status] || status;
  const freightLabel = status === "ready_for_pickup" ? formatFreight(cbm, freightUsdPerCbm) : "Pending";

  try {
    const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber,
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: shippingMark || "N/A", parameter_name: "shipping_mark" },
                { type: "text", text: trackingId, parameter_name: "tracking_id" },
                { type: "text", text: containerNumber || "N/A", parameter_name: "container_id" },
                { type: "text", text: String(ctn ?? "N/A"), parameter_name: "ctn" },
                { type: "text", text: String(cbm ?? "N/A"), parameter_name: "cbm" },
                { type: "text", text: freightLabel, parameter_name: "freight" },
                { type: "text", text: statusLabel, parameter_name: "status" },
              ],
            },
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", JSON.stringify(data));
      return { ok: false, error: data?.error?.message || "whatsapp_api_error" };
    }

    return { ok: true };
  } catch (error) {
    console.error("Error calling WhatsApp API:", error);
    return { ok: false, error: "network_error" };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Notify a client via WhatsApp that their shipment status has changed.
  // Fire-and-forget from the frontend's perspective: failures here should
  // never block the underlying Firestore status update.
  app.post("/api/notify-status", async (req, res) => {
    const { phone_number, shipping_mark, tracking_id, container_number, ctn, cbm, freight_usd_per_cbm, status } = req.body || {};

    if (!phone_number || !tracking_id || !status) {
      return res.status(400).json({ error: "phone_number, tracking_id and status are required" });
    }

    const result = await sendWhatsAppStatusUpdate({
      phoneNumber: phone_number,
      shippingMark: shipping_mark,
      trackingId: tracking_id,
      containerNumber: container_number,
      ctn,
      cbm,
      freightUsdPerCbm: freight_usd_per_cbm,
      status,
    });

    if (!result.ok) {
      // Still respond 200-ish so the frontend doesn't treat this as fatal;
      // just report that the notification didn't go out.
      return res.status(502).json({ sent: false, error: result.error });
    }

    res.json({ sent: true });
  });

  // API route for public tracking
  app.get("/api/track/:trackingId", async (req, res) => {
    try {
      const db = getFirestore(databaseId);
      const shipmentsRef = db.collection("shipments");
      const snapshot = await shipmentsRef.where("tracking_id", "==", req.params.trackingId).limit(1).get();
      
      if (snapshot.empty) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      const shipmentDoc = snapshot.docs[0];
      const shipmentData = shipmentDoc.data();

      // Get tracking updates
      const updatesRef = db.collection("tracking_updates");
      const updatesSnapshot = await updatesRef.where("shipment_id", "==", shipmentDoc.id).orderBy("created_at", "desc").get();
      const updates = updatesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({
        id: shipmentDoc.id,
        tracking_id: shipmentData.tracking_id,
        shipping_mark: shipmentData.shipping_mark,
        status: shipmentData.status,
        ctn: shipmentData.ctn,
        cbm: shipmentData.cbm,
        created_at: shipmentData.created_at,
        updates
      });
    } catch (error) {
      console.error("Error tracking shipment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
