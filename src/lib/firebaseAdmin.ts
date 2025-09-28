// src/lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

let app: admin.app.App;

if (!admin.apps.length) {
  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} else {
  app = admin.app();
}

export const dbAdmin = admin.firestore();
