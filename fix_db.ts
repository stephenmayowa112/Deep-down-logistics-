import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { getFirestore } from "firebase-admin/firestore";

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

async function fixUsers() {
  const db = getFirestore(databaseId);
  const users = await db.collection("users").get();
  console.log(`Found ${users.size} users in db`);
  users.forEach(doc => console.log(doc.id, doc.data()));
}

fixUsers().then(() => setTimeout(() => process.exit(0), 1000)).catch(console.error);
