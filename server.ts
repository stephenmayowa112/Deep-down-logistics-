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
  clearingNairaPerCbm?: number;
  status: string;
  // The shipment's packing list as a PNG, rendered in the browser by generatePackingListImage().
  packingListImage?: Buffer;
}

// WhatsApp needs the full international number. Numbers saved locally (0703...) are Nigerian.
function normalizeNigerianNumber(phone: string): string {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("234")) digits = "234" + digits;
  return digits;
}

// Uploads image bytes to Meta and returns the media id to put in a template header.
async function uploadWhatsAppImage(token: string, phoneNumberId: string, image: Buffer, fileName: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([Uint8Array.from(image)], { type: "image/png" }), fileName);
  form.append("messaging_product", "whatsapp");
  form.append("type", "image/png");

  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const data = await response.json();
  if (!response.ok || !data?.id) {
    console.error("WhatsApp media upload error:", JSON.stringify(data));
    throw new Error(data?.error?.message || "media_upload_failed");
  }
  return data.id;
}

// Computes the total freight cost the same way generateConsignmentReceiptPDF()
// does in src/utils/pdfGenerator.ts, so the WhatsApp message and the PDF
// receipt never disagree. Falls back to a friendly placeholder when no rate
// has been entered for the shipment yet (mirrors the PDF's `if (freightRate > 0)`
// check, which simply omits the fees section in that case).
function formatFreight(cbm: number | string, freightUsdPerCbm?: number, clearingNairaPerCbm?: number): string {
  const cbmValue = typeof cbm === "string" ? parseFloat(cbm) : cbm;
  
  if (!cbmValue || isNaN(cbmValue)) {
    return "Not yet quoted";
  }

  const parts = [];
  if (freightUsdPerCbm && freightUsdPerCbm > 0) {
    const totalUsd = cbmValue * freightUsdPerCbm;
    parts.push(`\${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }
  if (clearingNairaPerCbm && clearingNairaPerCbm > 0) {
    const totalNgn = cbmValue * clearingNairaPerCbm;
    parts.push(`NGN ${totalNgn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  }

  return parts.length > 0 ? parts.join(" + ") : "Not yet quoted";
}

// Meta never shows the support inbox what this app sends, so post it a copy.
// Never fails the send: the customer already has the message.
async function copyToSupportInbox(copy: {
  waMessageId?: string;
  to: string;
  body: string | null;
  templateName: string;
  image?: Buffer;
  fileName: string;
}): Promise<void> {
  const url = process.env.SUPPORT_INBOX_URL;
  const secret = process.env.SUPPORT_INBOX_SECRET;
  if (!url || !secret || !copy.waMessageId) return;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/api/automated-messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        wa_message_id: copy.waMessageId,
        to: copy.to,
        body: copy.body,
        template_name: copy.templateName,
        image_base64: copy.image ? copy.image.toString("base64") : undefined,
        image_mime_type: copy.image ? "image/png" : undefined,
        file_name: copy.image ? copy.fileName : undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("Support inbox copy failed:", response.status, await response.text());
  } catch (error) {
    console.error("Support inbox copy failed:", error);
  }
}

async function sendWhatsAppStatusUpdate(
  details: StatusNotificationDetails
): Promise<{ ok: boolean; error?: string }> {
  const { phoneNumber, shippingMark, trackingId, containerNumber, ctn, cbm, freightUsdPerCbm, clearingNairaPerCbm, status, packingListImage } = details;
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME || "shipment_status_update";

  if (!token || !phoneNumberId) {
    console.warn("WhatsApp not configured (missing WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID); skipping notification.");
    return { ok: false, error: "not_configured" };
  }

  const toNumber = normalizeNigerianNumber(phoneNumber);
  const statusLabel = STATUS_LABELS[status] || status;
  const freightLabel = status === "ready_for_pickup" ? formatFreight(cbm, freightUsdPerCbm, clearingNairaPerCbm) : "Pending";

  // Meta rejects a send unless language, header and body values match the approved template exactly.
  const allParams: Record<string, string> = {
    shipping_mark: shippingMark || "N/A",
    tracking_id: trackingId,
    container_id: containerNumber || "N/A",
    ctn: String(ctn ?? "N/A"),
    cbm: String(cbm ?? "N/A"),
    freight: freightLabel,
    status: statusLabel,
  };
  // `text` is the approved template body with the values filled in. It is only
  // used for the support inbox's copy; keep it in step with the template in Meta.
  const TEMPLATES: Record<string, { language: string; params: string[]; imageHeader?: boolean; text?: (p: Record<string, string>) => string }> = {
    "3p_direct_integration_test_template": { language: "en_US", params: [] },
    shipping_update: {
      language: "en",
      params: ["shipping_mark"],
      imageHeader: true,
      text: (p) => `Hello ${p.shipping_mark}, here are your shipping details`,
    },
  };
  const tpl = TEMPLATES[templateName] ?? { language: "en_US", params: Object.keys(allParams) };
  if (tpl.imageHeader && !packingListImage) {
    console.error(`WhatsApp template ${templateName} needs the shipment's packing-list image; none was sent.`);
    return { ok: false, error: "missing_packing_list_image" };
  }

  try {
    const components: object[] = [];
    if (tpl.imageHeader) {
      const mediaId = await uploadWhatsAppImage(token, phoneNumberId, packingListImage!, `packing-list-${trackingId}.png`);
      components.push({ type: "header", parameters: [{ type: "image", image: { id: mediaId } }] });
    }
    if (tpl.params.length) {
      components.push({
        type: "body",
        parameters: tpl.params.map((name) => ({ type: "text", text: allParams[name], parameter_name: name })),
      });
    }

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
          language: { code: tpl.language },
          components,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", JSON.stringify(data));
      return { ok: false, error: data?.error?.message || "whatsapp_api_error" };
    }

    await copyToSupportInbox({
      waMessageId: data?.messages?.[0]?.id,
      to: toNumber,
      body: tpl.text ? tpl.text(allParams) : null,
      templateName,
      image: tpl.imageHeader ? packingListImage : undefined,
      fileName: `packing-list-${trackingId}.png`,
    });

    return { ok: true };
  } catch (error) {
    console.error("Error calling WhatsApp API:", error);
    return { ok: false, error: error instanceof Error ? error.message : "network_error" };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Packing-list PNGs arrive base64-encoded and run a few hundred KB, over express's 100kb default.
  app.use(express.json({ limit: "5mb" }));

  // Notify a client via WhatsApp that their shipment status has changed.
  // Fire-and-forget from the frontend's perspective: failures here should
  // never block the underlying Firestore status update.
  app.post("/api/notify-status", async (req, res) => {
    const { phone_number, shipping_mark, tracking_id, container_number, ctn, cbm, freight_usd_per_cbm, clearing_naira_per_cbm, status, image_base64 } = req.body || {};

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
      clearingNairaPerCbm: clearing_naira_per_cbm,
      status,
      packingListImage: image_base64 ? Buffer.from(image_base64, "base64") : undefined,
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


  // WhatsApp Webhook Verification
  app.get("/api/whatsapp/webhook", (req, res) => {
    const verify_token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    
    // Parse params from the webhook verification request
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    
    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === "subscribe" && token === verify_token) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  });

  // WhatsApp Incoming Messages Webhook
  app.post("/api/whatsapp/webhook", (req, res) => {
    const body = req.body;
    
    if (body.object) {
      // Returns a '200 OK' response to all requests
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.sendStatus(404);
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
