export function classifyFirebaseAdminError(error) {
  const code = String(error?.code ?? error?.status ?? "").toLowerCase();
  const message = String(error?.message ?? "").toLowerCase();

  if (code === "firebase-admin/not-configured") {
    return {
      category: "missing-project-id",
      message: "Set FIREBASE_PROJECT_ID in backend/.env and restart the backend from the backend directory.",
    };
  }

  if (
    code === "app/invalid-credential" ||
    code === "auth/invalid-credential" ||
    message.includes("default credentials") ||
    message.includes("unable to detect a project id") ||
    message.includes("invalid_grant") ||
    message.includes("enoent")
  ) {
    return {
      category: "application-default-credentials",
      message: "Google Application Default Credentials could not be loaded. Run `gcloud auth application-default login` in this Windows user account, then restart the backend.",
    };
  }

  if (
    code === "7" ||
    code === "permission-denied" ||
    code === "permission_denied" ||
    message.includes("permission_denied") ||
    message.includes("permission denied")
  ) {
    return {
      category: "firestore-permission-denied",
      message: "The ADC identity lacks Firestore read permission. For this diagnostic, a project administrator must grant a read-only role such as Cloud Datastore Viewer (roles/datastore.viewer), which includes datastore.entities.list. Do not grant roles automatically.",
    };
  }

  if (code === "14" || code === "unavailable") {
    return {
      category: "firestore-unavailable",
      message: "Firestore could not be reached. Check the project ID, network connection, and Firestore service availability, then retry.",
    };
  }

  return {
    category: "firebase-admin-error",
    message: "Firebase Admin could not read Firestore. Check the backend diagnostic log for the sanitized error code.",
  };
}

export function logFirebaseAdminError(error, projectId) {
  const diagnostic = classifyFirebaseAdminError(error);
  console.error(
    "[Firebase Admin] Firestore access failed:",
    JSON.stringify({
      category: diagnostic.category,
      code: String(error?.code ?? error?.status ?? "unknown").slice(0, 80),
      projectId: projectId || null,
      credentialSource: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? "GOOGLE_APPLICATION_CREDENTIALS"
        : "Application Default Credentials",
    }),
  );
  return diagnostic;
}
