import assert from "node:assert/strict";
import { test } from "node:test";
import { hasRelevantPaymentRecord } from "../src/services/eventDeletionPolicy.js";

test("failed, cancelled, and expired attempts do not block event deletion", () => {
  for (const status of ["failed", "cancelled", "expired"]) {
    assert.equal(
      hasRelevantPaymentRecord({ status }, { status: "payment_failed" }),
      false,
    );
  }
});

test("captured, authorized, and refund-required payments are retained", () => {
  for (const status of ["captured", "authorized", "refund_required", "refunded"]) {
    assert.equal(
      hasRelevantPaymentRecord({ status }, { status: "payment_failed" }),
      true,
    );
  }
});

test("created payment orders block only while their reservation is live", () => {
  const now = 1_000_000;
  assert.equal(
    hasRelevantPaymentRecord(
      { status: "created" },
      { status: "payment_pending", expiresAt: new Date(now + 1_000) },
      now,
    ),
    true,
  );
  assert.equal(
    hasRelevantPaymentRecord(
      { status: "created" },
      { status: "payment_pending", expiresAt: new Date(now - 1_000) },
      now,
    ),
    false,
  );
  assert.equal(
    hasRelevantPaymentRecord(
      { status: "created", razorpayPaymentId: "pay_123" },
      { status: "payment_pending", expiresAt: new Date(now - 1_000) },
      now,
    ),
    true,
  );
});

test("unknown or unlinked payment states are retained conservatively", () => {
  assert.equal(
    hasRelevantPaymentRecord({ status: "unrecognized" }, { status: "expired" }),
    true,
  );
  assert.equal(hasRelevantPaymentRecord({ status: "created" }, null), true);
});
