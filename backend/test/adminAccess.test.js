import test from "node:test";
import assert from "node:assert/strict";
import {
  createFirebaseUserMiddleware,
  getAdminRole,
  requireAdmin,
  requireSuperAdmin,
} from "../src/auth/firebaseAuth.js";

function runMiddleware(middleware, user, token) {
  return new Promise((resolve) => {
    const response = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ status: this.statusCode, body });
      },
    };
    const request = {
      firebaseUser: user,
      get(name) {
        return name.toLowerCase() === "authorization" && token
          ? `Bearer ${token}`
          : undefined;
      },
    };
    middleware(request, response, () => {
      resolve({ status: 200, next: true, user: request.firebaseUser });
    });
  });
}

test("Firebase auth middleware fails closed for missing and invalid ID tokens", async () => {
  const middleware = createFirebaseUserMiddleware(async () => {
    const error = new Error("Token expired.");
    error.code = "auth/id-token-expired";
    throw error;
  });
  const missing = await runMiddleware(middleware, null, null);
  assert.equal(missing.status, 401);
  assert.match(missing.body.error, /ID token is required/);

  const invalid = await runMiddleware(middleware, null, "customer-token");
  assert.equal(invalid.status, 401);
  assert.match(invalid.body.error, /invalid or expired/);
});

test("Firebase auth middleware reports ADC or revocation-check failures as unavailable", async () => {
  const middleware = createFirebaseUserMiddleware(async () => {
    const error = new Error("Firebase Auth permission denied.");
    error.code = "auth/insufficient-permission";
    throw error;
  });
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await runMiddleware(middleware, null, "customer-token");
    assert.equal(result.status, 503);
    assert.equal(result.body.diagnostic, "firebase-auth-permission-denied");
    assert.match(result.body.error, /revocation could not be checked/);
  } finally {
    console.error = originalError;
  }
});

test("Firebase auth middleware passes only verified identity to downstream routes", async () => {
  const middleware = createFirebaseUserMiddleware(async (token) => {
    assert.equal(token, "verified-token");
    return { uid: "customer-uid" };
  });
  const result = await runMiddleware(middleware, null, "verified-token");
  assert.equal(result.next, true);
  assert.equal(result.user.uid, "customer-uid");
});

test("legacy trusted admin claims retain Super Admin compatibility", () => {
  assert.equal(getAdminRole({ admin: true }), "super_admin");
  assert.equal(getAdminRole({ admin: true, adminRole: "event_admin" }), "event_admin");
  assert.equal(getAdminRole({ admin: false, adminRole: "super_admin" }), null);
});

test("both admin roles enter event admin routes but only Super Admin manages admins", async () => {
  for (const role of ["super_admin", "event_admin"]) {
    const user = { admin: true, adminRole: role };
    assert.equal((await runMiddleware(requireAdmin, user)).next, true);
  }
  assert.equal(
    (await runMiddleware(requireSuperAdmin, { admin: true, adminRole: "super_admin" })).next,
    true,
  );
  const denied = await runMiddleware(requireSuperAdmin, {
    admin: true,
    adminRole: "event_admin",
  });
  assert.equal(denied.status, 403);
});
