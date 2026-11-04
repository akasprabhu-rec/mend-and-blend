import test from "node:test";
import assert from "node:assert/strict";
import {
  getAdminRole,
  requireAdmin,
  requireSuperAdmin,
} from "../src/auth/firebaseAuth.js";

function runMiddleware(middleware, user) {
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
    middleware({ firebaseUser: user }, response, () => {
      resolve({ status: 200, next: true });
    });
  });
}

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
