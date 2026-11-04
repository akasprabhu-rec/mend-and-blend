import assert from "node:assert/strict";
import { test } from "node:test";
import { canMarkPaymentAuthorized } from "../src/payments/paymentStatus.js";

test("authorized events do not regress terminal payment statuses", () => {
  assert.equal(canMarkPaymentAuthorized("created"), true);
  assert.equal(canMarkPaymentAuthorized("authorized"), true);
  assert.equal(canMarkPaymentAuthorized("captured"), false);
  assert.equal(canMarkPaymentAuthorized("failed"), false);
  assert.equal(canMarkPaymentAuthorized("cancelled"), false);
  assert.equal(canMarkPaymentAuthorized("refund_required"), false);
});
