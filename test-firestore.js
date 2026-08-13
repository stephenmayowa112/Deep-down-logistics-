const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDocFromServer } = require('firebase/firestore');
const config = require('./firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

async function run() {
  try {
    console.log("Fetching...");
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Success");
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
