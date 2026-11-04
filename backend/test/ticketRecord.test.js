import assert from "node:assert/strict";
import { test } from "node:test";
import { createTicketRecord } from "../src/tickets/ticketRecord.js";

function createBooking() {
  return {
    workshopId: "roots-to-reach-2026-12-12",
    workshopName: "Roots to Reach",
    sessionDate: "2026-12-12",
    start: "11:00 AM",
    end: "12:30 PM",
    participant: {
      fullName: "Example Customer",
      email: "customer@example.com",
      phone: "+91 90000 00000",
    },
  };
}

test("ticket QR tokens are unique, unpredictable 256-bit values", () => {
  const first = createTicketRecord({
    booking: createBooking(),
    bookingId: "booking-one",
    customerId: "firebase-uid-one",
    issuedAt: new Date(),
  });
  const second = createTicketRecord({
    booking: createBooking(),
    bookingId: "booking-two",
    customerId: "firebase-uid-two",
    issuedAt: new Date(),
  });

  assert.match(first.qrToken, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(first.qrToken, "base64url").length, 32);
  assert.notEqual(first.qrToken, second.qrToken);
});

test("ticket records contain no payment credentials or participant contact data", () => {
  const ticket = createTicketRecord({
    booking: createBooking(),
    bookingId: "booking-one",
    customerId: "firebase-uid-one",
    issuedAt: new Date(),
  });

  assert.equal(ticket.bookingId, "booking-one");
  assert.equal(ticket.customerId, "firebase-uid-one");
  assert.equal(ticket.workshopId, "roots-to-reach-2026-12-12");
  assert.equal(ticket.status, "valid");
  assert.equal(ticket.isValid, true);
  assert.equal(ticket.customerName, "Example Customer");
  assert.equal(ticket.venue, "01 Appu Street, 34, Valluvar Kottam High Rd, Nungambakkam, Chennai, Tamil Nadu 600034");
  assert.equal("email" in ticket, false);
  assert.equal("phone" in ticket, false);
  assert.equal("razorpayOrderId" in ticket, false);
  assert.equal("razorpayPaymentId" in ticket, false);
  assert.equal(ticket.qrToken.includes(ticket.bookingId), false);
});
