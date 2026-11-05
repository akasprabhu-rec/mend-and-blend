import test from "node:test";
import assert from "node:assert/strict";
import {
  getRegistrationState,
  isPublicEvent,
  registrationWindowError,
  serializeEvent,
  validateManagedEvent,
} from "../src/services/eventService.js";

const futureWorkshop = {
  title: "Future workshop",
  shortDescription: "A short event description.",
  fullDescription: "A full workshop description.",
  date: "2030-01-15",
  start: "11:00",
  end: "12:30",
  venueName: "Studio",
  venueAddress: "1 Example Street, Chennai",
  price: 1500,
  capacity: 12,
  status: "published",
  registrationOpenAt: "2029-12-01T00:00",
  registrationCloseAt: "2030-01-13T23:59",
};

test("registration schedule is independent from event date and permits close before event", () => {
  const event = validateManagedEvent(futureWorkshop, { requireRegistrationWindow: true });
  const now = new Date("2029-12-15T12:00:00+05:30").getTime();
  assert.equal(getRegistrationState(event, now, 12), "open");
  assert.equal(registrationWindowError(event, now), null);
  assert.equal(event.date, "2030-01-15");
  assert.equal(event.registrationCloseAt.toDate().toISOString(), "2030-01-13T18:29:00.000Z");
});

test("registration is rejected before opening, at/after deadline, while paused, and when sold out", () => {
  const event = validateManagedEvent(futureWorkshop, { requireRegistrationWindow: true });
  assert.equal(getRegistrationState(event, new Date("2029-11-30T12:00:00+05:30").getTime(), 12), "not_open");
  assert.equal(getRegistrationState(event, new Date("2030-01-13T23:59:00+05:30").getTime(), 12), "closed");
  assert.equal(getRegistrationState({ ...event, salesPaused: true }, Date.now(), 12), "paused");
  assert.equal(getRegistrationState(event, new Date("2029-12-15T12:00:00+05:30").getTime(), 0), "sold_out");
});

test("legacy published events without a registration window remain listed but cannot accept reservations", () => {
  const { registrationOpenAt, registrationCloseAt, ...legacyEvent } = validateManagedEvent({
    ...futureWorkshop,
    registrationOpenAt: "",
    registrationCloseAt: "",
  });
  assert.equal(isPublicEvent(legacyEvent), true);
  assert.equal(getRegistrationState(legacyEvent, Date.now(), 12), "not_open");
  assert.equal(registrationWindowError(legacyEvent).status, 409);
  assert.throws(
    () => validateManagedEvent({
      ...futureWorkshop,
      registrationOpenAt: "",
      registrationCloseAt: "",
    }, { requireRegistrationWindow: true }),
    /Set both registration opening and closing times/,
  );
  assert.equal(registrationOpenAt, null);
  assert.equal(registrationCloseAt, null);
});

test("event date does not automatically close an event whose registration window is still open", () => {
  const event = validateManagedEvent({
    ...futureWorkshop,
    date: "2029-10-01",
    registrationOpenAt: "2029-11-04T00:00",
    registrationCloseAt: "2029-11-30T23:59",
  }, { requireRegistrationWindow: true });
  const now = new Date("2029-11-04T12:00:00+05:30").getTime();
  assert.equal(getRegistrationState(event, now, 5), "open");
  assert.equal(registrationWindowError(event, now), null);
});

test("public event serialization reports sales state without hiding published closed events", () => {
  const event = validateManagedEvent({
    ...futureWorkshop,
    registrationOpenAt: "2029-11-04T00:00",
    registrationCloseAt: "2029-11-04T11:00",
  }, { requireRegistrationWindow: true });
  const serialized = serializeEvent(event, new Date("2029-11-04T12:00:00+05:30").getTime(), 8);
  assert.equal(serialized.published, true);
  assert.equal(serialized.registrationStatus, "closed");
  assert.equal(serialized.canRegister, false);
  assert.ok(serialized.registrationCloseAt.endsWith("Z"));
});

test("archived events are unavailable for registration and public listings", () => {
  const archived = validateManagedEvent({
    ...futureWorkshop,
    category: "Community",
    status: "archived",
  });
  assert.equal(archived.category, "Community");
  assert.equal(getRegistrationState(archived, Date.now(), 12), "archived");
  assert.equal(registrationWindowError(archived).status, 404);
  assert.equal(isPublicEvent({ ...archived, published: true }), false);
});

test("event categories and lifecycle statuses are backend-validated", () => {
  for (const status of ["draft", "published", "unpublished", "archived"]) {
    const event = validateManagedEvent({
      ...futureWorkshop,
      category: "  Community  ",
      status,
    });
    assert.equal(event.category, "Community");
    assert.equal(event.published, status === "published");
  }
  assert.throws(
    () => validateManagedEvent({ ...futureWorkshop, category: "x".repeat(81) }),
    /category must be at most 80 characters/,
  );
});

test("event updates preserve the server-provided sales pause state over submitted values", () => {
  const paused = validateManagedEvent(
    { ...futureWorkshop, salesPaused: false },
    { salesPaused: true },
  );
  const resumed = validateManagedEvent(
    { ...futureWorkshop, salesPaused: true },
    { salesPaused: false },
  );
  assert.equal(paused.salesPaused, true);
  assert.equal(resumed.salesPaused, false);
});

test("public events require publication and exclude legacy hidden states", () => {
  assert.equal(isPublicEvent({ published: true }), true);
  assert.equal(isPublicEvent({ published: false, status: "published" }), false);
  assert.equal(isPublicEvent({ published: true, status: "draft" }), false);
  assert.equal(isPublicEvent({ published: true, status: "unpublished" }), false);
  assert.equal(isPublicEvent({ published: true, status: "completed" }), false);
  assert.equal(isPublicEvent({ published: true, status: "unknown" }), false);
  assert.equal(getRegistrationState({ published: true, status: "unknown" }, Date.now(), 1), "unpublished");
});
