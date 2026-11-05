import assert from "node:assert/strict";
import { test } from "node:test";
import { getRazorpay, isRazorpayTestKey } from "../src/payments/razorpay.js";

test("Razorpay mode accepts only test key IDs", () => {
  assert.equal(isRazorpayTestKey("rzp_test_example"), true);
  assert.equal(isRazorpayTestKey("rzp_test_"), false);
  assert.equal(isRazorpayTestKey("rzp_live_example"), false);
  assert.equal(isRazorpayTestKey(""), false);
  assert.equal(isRazorpayTestKey(undefined), false);
});

test("Razorpay client requires test-mode key ID and secret", () => {
  const previousKeyId = process.env.RAZORPAY_KEY_ID;
  const previousKeySecret = process.env.RAZORPAY_KEY_SECRET;
  try {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    assert.throws(() => getRazorpay(), {
      message: "Razorpay is not configured on the backend.",
      status: 503,
    });

    process.env.RAZORPAY_KEY_ID = "rzp_live_example";
    process.env.RAZORPAY_KEY_SECRET = "test-secret";
    assert.throws(() => getRazorpay(), {
      message: "Razorpay live mode is disabled. Use test-mode credentials until production launch is approved.",
      status: 503,
    });

    process.env.RAZORPAY_KEY_ID = "rzp_test_example";
    const client = getRazorpay();
    assert.equal(typeof client.orders.create, "function");
  } finally {
    if (previousKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = previousKeyId;
    if (previousKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = previousKeySecret;
  }
});
