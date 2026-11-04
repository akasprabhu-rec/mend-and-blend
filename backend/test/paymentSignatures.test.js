import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../src/payments/signatures.js";

const secret = "local-test-secret";

test("accepts a checkout signature for the exact order and payment", () => {
  const orderId = "order_test_123";
  const paymentId = "pay_test_456";
  const signature = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  assert.equal(verifyCheckoutSignature(orderId, paymentId, signature, secret), true);
  assert.equal(verifyCheckoutSignature(orderId, "pay_other", signature, secret), false);
  assert.equal(verifyCheckoutSignature(orderId, paymentId, "bad-signature", secret), false);
});

test("verifies Razorpay webhook signatures against the original raw bytes", () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  assert.equal(verifyWebhookSignature(body, signature, secret), true);
  assert.equal(
    verifyWebhookSignature(Buffer.from('{"event":"payment.failed"}'), signature, secret),
    false,
  );
  assert.equal(verifyWebhookSignature(body, "bad-signature", secret), false);
  assert.equal(verifyWebhookSignature(body.toString(), signature, secret), false);
});
