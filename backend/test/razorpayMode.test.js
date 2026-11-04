import assert from "node:assert/strict";
import { test } from "node:test";
import { isRazorpayTestKey } from "../src/payments/razorpay.js";

test("Razorpay mode accepts only test key IDs", () => {
  assert.equal(isRazorpayTestKey("rzp_test_example"), true);
  assert.equal(isRazorpayTestKey("rzp_test_"), false);
  assert.equal(isRazorpayTestKey("rzp_live_example"), false);
  assert.equal(isRazorpayTestKey(""), false);
  assert.equal(isRazorpayTestKey(undefined), false);
});
