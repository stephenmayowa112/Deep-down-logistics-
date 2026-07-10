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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
