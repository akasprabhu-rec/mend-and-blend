import assert from "node:assert/strict";
import { test } from "node:test";
import { createTicketRecord } from "../src/tickets/ticketRecord.js";

function createBooking() {
  return {
    workshopId: "dynamic-event-id",
    workshopName: "Example Event",
    sessionDate: "2030-01-15",
    start: "10:00",
    end: "11:00",
    venue: "Example Venue, 1 Example Street",
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
  assert.equal(ticket.workshopId, "dynamic-event-id");
  assert.equal(ticket.status, "valid");
  assert.equal(ticket.isValid, true);
  assert.equal(ticket.customerName, "Example Customer");
  assert.equal(ticket.venue, "Example Venue, 1 Example Street");
  assert.equal("email" in ticket, false);
  assert.equal("phone" in ticket, false);
  assert.equal("razorpayOrderId" in ticket, false);
  assert.equal("razorpayPaymentId" in ticket, false);
  assert.equal(ticket.qrToken.includes(ticket.bookingId), false);
});
