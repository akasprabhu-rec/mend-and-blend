import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getFirebaseAdminApp() {
  const existingApp = getApps().find(
    (candidate) => candidate.name === "mend-and-blend-api",
  );
  if (existingApp) return existingApp;

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectId) {
    const error = new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID and configure Application Default Credentials.",
    );
    error.code = "firebase-admin/not-configured";
    throw error;
  }

  return initializeApp(
    {
      credential: applicationDefault(),
      projectId,
    },
    "mend-and-blend-api",
  );
}

export function getDatabase() {
  return getFirestore(getFirebaseAdminApp());
}
