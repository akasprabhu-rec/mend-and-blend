import test from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import {
  BookingError,
  createReservationWithDatabase,
} from "../src/services/bookingService.js";
import { bookingHoldMinutes } from "../src/bookingPolicy.js";

class Snapshot {
  constructor(id, value) {
    this.id = id;
    this.value = value;
    this.exists = value !== undefined;
    this.docs = undefined;
  }

  data() {
    return this.value;
  }
}

class Query {
  constructor(database, collection, filters = []) {
    this.database = database;
    this.collection = collection;
    this.filters = filters;
  }

  where(field, operator, expected) {
    return new Query(this.database, this.collection, [
      ...this.filters,
      [field, operator, expected],
    ]);
  }

  get() {
    const docs = [...this.database.records(this.collection)].flatMap(([id, value]) => {
      const matches = this.filters.every(([field, operator, expected]) => {
        const actual = value[field];
        if (operator === "==") return actual === expected;
        if (operator === ">") return actual?.toMillis?.() > expected.toMillis();
        return false;
      });
      return matches ? [new Snapshot(id, value)] : [];
    });
    const snapshot = new Snapshot(undefined, undefined);
    snapshot.docs = docs;
    return Promise.resolve(snapshot);
  }
}

class Collection extends Query {
  doc(id) {
    return { collection: this.collection, id };
  }
}

class MemoryFirestore {
  constructor(seed = {}) {
    this.collections = new Map(
      Object.entries(seed).map(([name, records]) => [name, new Map(Object.entries(records))]),
    );
    this.transactionTail = Promise.resolve();
  }

  records(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name);
  }

  collection(name) {
    return new Collection(this, name);
  }

  async runTransaction(callback) {
    const previous = this.transactionTail;
    let release;
    this.transactionTail = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    const writes = [];
    const transaction = {
      get: (target) =>
        target instanceof Query
          ? target.get()
          : Promise.resolve(
              new Snapshot(target.id, this.records(target.collection).get(target.id)),
            ),
      update: (ref, value) => writes.push(["update", ref, value]),
      create: (ref, value) => writes.push(["create", ref, value]),
      set: (ref, value) => writes.push(["set", ref, value]),
    };

    try {
      const result = await callback(transaction);
      for (const [operation, ref, value] of writes) {
        const records = this.records(ref.collection);
        if (operation === "create" && records.has(ref.id)) {
          throw new Error("Document already exists.");
        }
        records.set(ref.id, {
          ...(operation === "update" ? records.get(ref.id) : {}),
          ...value,
        });
      }
      return result;
    } finally {
      release();
    }
  }
}

const now = Timestamp.fromDate(new Date("2030-01-01T12:00:00.000Z"));
const participant = {
  fullName: "Test Customer",
  email: "customer@example.com",
  phone: "+1 555 0100",
};

function makeDatabase({ capacity = 2, published = true, bookings = {} } = {}) {
  return new MemoryFirestore({
    workshops: {
      "event-1": {
        title: "Test event",
        date: "2030-01-15",
        start: "11:00",
        end: "12:30",
        price: 1500,
        capacity,
        published,
        status: published ? "published" : "draft",
        registrationOpenAt: Timestamp.fromMillis(now.toMillis() - 60_000),
        registrationCloseAt: Timestamp.fromMillis(now.toMillis() + 60 * 60_000),
      },
    },
    bookings,
  });
}

async function reserve(db, overrides = {}) {
  return createReservationWithDatabase({
    db,
    uid: "customer-1",
    workshopId: "event-1",
    participant,
    now,
    bookingId: "new-booking",
    ...overrides,
  });
}

test("a successful reservation atomically records the booking and a ten-minute hold", async () => {
  assert.equal(bookingHoldMinutes, 10);
  const db = makeDatabase();
  const reservation = await reserve(db);
  const booking = db.records("bookings").get("new-booking");
  const limit = db.records("bookingLimits").get("customer-1_event-1");

  assert.equal(reservation.status, "reserved");
  assert.equal(reservation.holdMinutes, 10);
  assert.equal(
    new Date(reservation.expiresAt).getTime() - now.toMillis(),
    10 * 60_000,
  );
  assert.equal(booking.eventId, "event-1");
  assert.equal(booking.customerId, "customer-1");
  assert.equal(booking.status, "reserved");
  assert.equal(limit.bookingId, "new-booking");
  assert.equal(db.records("workshops").get("event-1").reservationVersion, 1);
});

test("unpublished events and full-capacity events reject reservations without writes", async () => {
  const unpublished = makeDatabase({ published: false });
  await assert.rejects(reserve(unpublished), (error) => error.status === 404);
  assert.equal(unpublished.records("bookings").size, 0);

  const full = makeDatabase({
    capacity: 1,
    bookings: {
      existing: {
        workshopId: "event-1",
        status: "confirmed",
      },
    },
  });
  await assert.rejects(reserve(full), (error) => error.status === 409);
  assert.equal(full.records("bookings").size, 1);
});

test("duplicate active reservations are rejected and expired holds can be replaced", async () => {
  const db = makeDatabase();
  await reserve(db);
  await assert.rejects(
    reserve(db, { bookingId: "duplicate-booking" }),
    (error) => error instanceof BookingError && error.status === 409,
  );

  const afterExpiry = Timestamp.fromMillis(now.toMillis() + 11 * 60_000);
  const replacement = await reserve(db, {
    now: afterExpiry,
    bookingId: "replacement-booking",
  });
  assert.equal(replacement.status, "reserved");
  assert.equal(db.records("bookings").get("replacement-booking").status, "reserved");
});
