import test from "node:test";
import assert from "node:assert/strict";
import {
  getRegistrationState,
  registrationWindowError,
  serializeEvent,
  validateManagedEvent,
} from "../src/services/eventService.js";

const futureWorkshop = {
  title: "Future workshop",
  shortDescription: "A short event description.",
  fullDescription: "A full workshop description.",
  date: "2026-12-20",
  start: "11:00",
  end: "12:30",
  venueName: "Studio",
  venueAddress: "1 Example Street, Chennai",
  price: 1500,
  capacity: 12,
  status: "published",
  registrationOpenAt: "2026-11-04T00:00",
  registrationCloseAt: "2026-12-18T23:59",
};

test("registration schedule is independent from event date and permits close before event", () => {
  const event = validateManagedEvent(futureWorkshop, { requireRegistrationWindow: true });
  const now = new Date("2026-11-04T12:00:00+05:30").getTime();
  assert.equal(getRegistrationState(event, now, 12), "open");
  assert.equal(registrationWindowError(event, now), null);
  assert.equal(event.date, "2026-12-20");
  assert.equal(event.registrationCloseAt.toDate().toISOString(), "2026-12-18T18:29:00.000Z");
});

test("registration is rejected before opening, at/after deadline, while paused, and when sold out", () => {
  const event = validateManagedEvent(futureWorkshop, { requireRegistrationWindow: true });
  assert.equal(getRegistrationState(event, new Date("2026-11-03T12:00:00+05:30").getTime(), 12), "not_open");
  assert.equal(getRegistrationState(event, new Date("2026-12-18T23:59:00+05:30").getTime(), 12), "closed");
  assert.equal(getRegistrationState({ ...event, salesPaused: true }, Date.now(), 12), "paused");
  assert.equal(getRegistrationState(event, Date.now(), 0), "sold_out");
});

test("event date does not automatically close an event whose registration window is still open", () => {
  const event = validateManagedEvent({
    ...futureWorkshop,
    date: "2026-10-01",
    registrationOpenAt: "2026-11-04T00:00",
    registrationCloseAt: "2026-11-30T23:59",
  }, { requireRegistrationWindow: true });
  const now = new Date("2026-11-04T12:00:00+05:30").getTime();
  assert.equal(getRegistrationState(event, now, 5), "open");
  assert.equal(registrationWindowError(event, now), null);
});

test("public event serialization reports sales state without hiding published closed events", () => {
  const event = validateManagedEvent({
    ...futureWorkshop,
    registrationCloseAt: "2026-11-04T11:00",
  }, { requireRegistrationWindow: true });
  const serialized = serializeEvent(event, new Date("2026-11-04T12:00:00+05:30").getTime(), 8);
  assert.equal(serialized.published, true);
  assert.equal(serialized.registrationStatus, "closed");
  assert.equal(serialized.canRegister, false);
  assert.ok(serialized.registrationCloseAt.endsWith("Z"));
});
