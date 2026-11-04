import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../firebaseAdmin.js";
import { logFirebaseAdminError } from "../firebaseAdminDiagnostics.js";

export async function requireFirebaseUser(req, res, next) {
  const token = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return res.status(401).json({ error: "A Firebase ID token is required." });
  }

  try {
    req.firebaseUser = await getAuth(getFirebaseAdminApp()).verifyIdToken(token, true);
    return next();
  } catch (error) {
    if (
      error.code === "firebase-admin/not-configured" ||
      error.code === "app/invalid-credential" ||
      error.code === "auth/invalid-credential" ||
      /default credentials|unable to detect a project id|invalid_grant|enoent/i.test(
        error.message || "",
      )
    ) {
      const diagnostic = logFirebaseAdminError(
        error,
        process.env.FIREBASE_PROJECT_ID?.trim(),
      );
      return res.status(503).json({
        error: diagnostic.message,
        diagnostic: diagnostic.category,
      });
    }

    return res.status(401).json({ error: "The Firebase ID token is invalid or expired." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.firebaseUser?.admin !== true) {
    return res.status(403).json({ error: "Administrator access is required." });
  }
  return next();
}

export function getAdminRole(user) {
  if (user?.admin !== true) return null;
  return user.adminRole === "event_admin" ? "event_admin" : "super_admin";
}

export function requireSuperAdmin(req, res, next) {
  if (getAdminRole(req.firebaseUser) !== "super_admin") {
    return res.status(403).json({ error: "Super Admin access is required." });
  }
  return next();
}
