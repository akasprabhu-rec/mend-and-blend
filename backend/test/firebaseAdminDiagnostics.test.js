import test from "node:test";
import assert from "node:assert/strict";
import { classifyFirebaseAdminError } from "../src/firebaseAdminDiagnostics.js";

test("classifies a missing Firebase project ID", () => {
  const result = classifyFirebaseAdminError({
    code: "firebase-admin/not-configured",
  });
  assert.equal(result.category, "missing-project-id");
});

test("classifies unavailable Application Default Credentials", () => {
  const result = classifyFirebaseAdminError(
    new Error("Could not load the default credentials"),
  );
  assert.equal(result.category, "application-default-credentials");
});

test("identifies the read-only Firestore role needed for permission failures", () => {
  const result = classifyFirebaseAdminError({ code: 7 });
  assert.equal(result.category, "firestore-permission-denied");
  assert.match(result.message, /roles\/datastore\.viewer/);
  assert.match(result.message, /datastore\.entities\.list/);
});

test("identifies a Firebase Auth revocation-check permission failure without disabling checks", () => {
  const result = classifyFirebaseAdminError({
    code: "auth/insufficient-permission",
  });
  assert.equal(result.category, "firebase-auth-permission-denied");
  assert.match(result.message, /revocation could not be checked/);
  assert.match(result.message, /do not disable revocation checking/i);
});
