import assert from "node:assert/strict";
import test from "node:test";
import { createRazorpayOrderPayload } from "../src/payments/orderPayload.js";

test("Razorpay order payload uses the reserved INR amount and booking references", () => {
  assert.deepEqual(
    createRazorpayOrderPayload({
      amountInSubunits: 150000,
      bookingId: "booking-123",
      uid: "customer-uid",
    }),
    {
      amount: 150000,
      currency: "INR",
      receipt: "booking-123",
      notes: {
        bookingId: "booking-123",
        customerId: "customer-uid",
      },
    },
  );
});
