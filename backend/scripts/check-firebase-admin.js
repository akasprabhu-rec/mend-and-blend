import "../src/loadEnv.js";
import { getDatabase } from "../src/firebaseAdmin.js";
import {
  classifyFirebaseAdminError,
  logFirebaseAdminError,
} from "../src/firebaseAdminDiagnostics.js";

const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

try {
  if (!projectId) {
    const error = new Error("FIREBASE_PROJECT_ID is not set.");
    error.code = "firebase-admin/not-configured";
    throw error;
  }

  const snapshot = await getDatabase()
    .collection("workshops")
    .select("published")
    .limit(1)
    .get();
  console.log(
    JSON.stringify({
      status: "ok",
      projectId,
      credentialSource: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? "GOOGLE_APPLICATION_CREDENTIALS"
        : "Application Default Credentials",
      firestoreRead: "ok",
      documentsRead: snapshot.size,
    }),
  );
} catch (error) {
  const diagnostic = logFirebaseAdminError(error, projectId);
  console.error(
    JSON.stringify({
      status: "failed",
      diagnostic: diagnostic.category,
      message: diagnostic.message,
    }),
  );
  process.exitCode = 1;
}
