import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canIssueTicket,
  canMarkPaymentAuthorized,
} from "../src/payments/paymentStatus.js";

test("authorized events do not regress terminal payment statuses", () => {
  assert.equal(canMarkPaymentAuthorized("created"), true);
  assert.equal(canMarkPaymentAuthorized("authorized"), true);
  assert.equal(canMarkPaymentAuthorized("captured"), false);
  assert.equal(canMarkPaymentAuthorized("failed"), false);
  assert.equal(canMarkPaymentAuthorized("cancelled"), false);
  assert.equal(canMarkPaymentAuthorized("refund_required"), false);
});

test("tickets require a captured payment and a verified current reservation", () => {
  assert.equal(canIssueTicket("failed", false), false);
  assert.equal(canIssueTicket("created", false), false);
  assert.equal(canIssueTicket("captured", false), false);
  assert.equal(canIssueTicket("captured", true), true);
});
