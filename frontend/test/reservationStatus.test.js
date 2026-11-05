import assert from "node:assert/strict";
import test from "node:test";
import {
  formatReservationCountdown,
  getReservationStatus,
} from "../src/booking/reservationStatus.js";

const now = Date.parse("2030-01-01T12:00:00.000Z");

test("reservation status follows booking status and server expiry timestamp", () => {
  assert.equal(
    getReservationStatus({
      status: "payment_pending",
      expiresAt: new Date(now + 61_000).toISOString(),
    }, now),
    "pending",
  );
  assert.equal(
    getReservationStatus({
      status: "reserved",
      expiresAt: new Date(now - 1).toISOString(),
    }, now),
    "expired",
  );
  assert.equal(getReservationStatus({ status: "confirmed" }, now), "confirmed");
  assert.equal(getReservationStatus({ status: "cancelled" }, now), "cancelled");
});

test("reservation countdown formats remaining time and stops at zero", () => {
  assert.equal(
    formatReservationCountdown(new Date(now + 9 * 60_000 + 5_000).toISOString(), now),
    "9:05",
  );
  assert.equal(formatReservationCountdown(new Date(now - 1).toISOString(), now), "0:00");
});
