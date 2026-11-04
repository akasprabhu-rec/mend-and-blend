import "../src/loadEnv.js";
import { getAuth } from "firebase-admin/auth";
import { getFirebaseAdminApp } from "../src/firebaseAdmin.js";

const uid = process.argv[2]?.trim();
if (!uid) {
  console.error("Usage: node scripts/set-admin-claim.js <firebase-user-uid>");
  process.exitCode = 1;
} else {
  try {
    const auth = getAuth(getFirebaseAdminApp());
    const user = await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, {
      ...user.customClaims,
      admin: true,
      adminRole: user.customClaims?.adminRole || "super_admin",
    });
    console.log(`Administrator claim set for Firebase user ${uid}.`);
    console.log("The user must refresh their ID token or sign in again before accessing admin routes.");
  } catch (error) {
    console.error("Could not grant administrator access:", error.message);
    process.exitCode = 1;
  }
}
