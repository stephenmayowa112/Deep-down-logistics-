import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { getAuth } from "firebase-admin/auth";

const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  admin.initializeApp({
    projectId: config.projectId,
  });
}

async function listAllUsers(nextPageToken?: string) {
  try {
    const listUsersResult = await getAuth().listUsers(1000, nextPageToken);
    listUsersResult.users.forEach((userRecord) => {
      console.log('user', userRecord.toJSON());
    });
    if (listUsersResult.pageToken) {
      listAllUsers(listUsersResult.pageToken);
    }
  } catch (e: any) {
    console.error("Error:", e.message);
  }
}

listAllUsers().then(() => setTimeout(() => process.exit(0), 1000));
