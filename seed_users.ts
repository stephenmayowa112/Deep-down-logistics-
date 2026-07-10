import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let databaseId = "(default)";
const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  admin.initializeApp({
    projectId: config.projectId,
  });
  if (config.firestoreDatabaseId) {
    databaseId = config.firestoreDatabaseId;
  }
}

async function createUsers() {
  const auth = getAuth();
  const db = getFirestore(databaseId);

  try {
    const adminUser = await auth.createUser({
      email: "admin@test.com",
      password: "password123",
    });
    
    await db.collection("users").doc(adminUser.uid).set({
      role: "admin",
      phone_number: "0000000000",
      shipping_mark: "ADMIN",
      is_verified: true,
    });
    console.log("Admin user created: admin@test.com / password123");
  } catch (e: any) {
    console.error("Failed to create admin:", e.message);
  }

  try {
    const clientUser = await auth.createUser({
      email: "client@test.com",
      password: "password123",
    });

    await db.collection("users").doc(clientUser.uid).set({
      role: "client",
      phone_number: "8033245670", 
      shipping_mark: "BIGFISH",
      is_verified: true,
    });
    console.log("Client user created: client@test.com / password123");
  } catch (e: any) {
    console.error("Failed to create client:", e.message);
  }
}

createUsers().then(() => process.exit(0)).catch(console.error);
