import test from "node:test";
import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import {
  listCustomerBookingsWithDatabase,
} from "../src/services/bookingService.js";
import {
  releaseUnpaidReservationWithDatabase,
} from "../src/payments/paymentService.js";

class Snapshot {
  constructor(id, value, ref) {
    this.id = id;
    this.value = value;
    this.ref = ref;
    this.exists = value !== undefined;
  }

  data() {
    return this.value;
  }
}

class MemoryDatabase {
  constructor(seed = {}) {
    this.collections = new Map(
      Object.entries(seed).map(([name, docs]) => [name, new Map(Object.entries(docs))]),
    );
  }

  records(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name);
  }

  collection(name) {
    const database = this;
    const collection = {
      name,
      doc(id) {
        return { collection: name, id };
      },
      where(field, operator, value) {
        assert.equal(operator, "==");
        return {
          async get() {
            const docs = [...database.records(name)].flatMap(([id, data]) =>
              data[field] === value
                ? [new Snapshot(id, data, { collection: name, id })]
                : [],
            );
            return { docs };
          },
        };
      },
    };
    return collection;
  }

  async runTransaction(callback) {
    const transaction = {
      get: async (ref) =>
        new Snapshot(ref.id, this.records(ref.collection).get(ref.id), ref),
      update: (ref, fields) => {
        const records = this.records(ref.collection);
        records.set(ref.id, { ...records.get(ref.id), ...fields });
      },
    };
    return callback(transaction);
  }
}

const now = Timestamp.fromDate(new Date("2030-01-01T12:00:00.000Z"));

test("customer reservations are scoped to the authenticated user and expired holds are marked expired", async () => {
  const db = new MemoryDatabase({
    bookings: {
      mine: {
        customerId: "customer-1",
        status: "payment_pending",
        workshopName: "My event",
        createdAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() + 60_000),
      },
      expired: {
        customerId: "customer-1",
        status: "reserved",
        createdAt: now,
        expiresAt: Timestamp.fromMillis(now.toMillis() - 60_000),
      },
      theirs: {
        customerId: "customer-2",
        status: "confirmed",
        createdAt: now,
      },
    },
  });

  const bookings = await listCustomerBookingsWithDatabase({
    db,
    uid: "customer-1",
    now,
  });
  assert.deepEqual(bookings.map(({ id }) => id).sort(), ["expired", "mine"]);
  assert.equal(bookings.find(({ id }) => id === "mine").status, "payment_pending");
  assert.equal(bookings.find(({ id }) => id === "expired").status, "expired");
  assert.equal(bookings.some(({ id }) => id === "theirs"), false);
});

test("customers can release their initial unpaid reservation and its seat limit atomically", async () => {
  const db = new MemoryDatabase({
    bookings: {
      "booking-1": {
        customerId: "customer-1",
        status: "reserved",
        limitId: "customer-1_event-1",
      },
    },
    bookingLimits: {
      "customer-1_event-1": {
        customerId: "customer-1",
        bookingId: "booking-1",
        status: "reserved",
      },
    },
  });

  const result = await releaseUnpaidReservationWithDatabase({
    db,
    uid: "customer-1",
    bookingId: "booking-1",
    now,
  });
  assert.equal(result.status, "cancelled");
  assert.equal(db.records("bookings").get("booking-1").status, "cancelled");
  assert.equal(db.records("bookings").get("booking-1").expiresAt, now);
  assert.equal(db.records("bookingLimits").get("customer-1_event-1").status, "cancelled");
});

test("cancellation does not expose or release another customer's reservation", async () => {
  const db = new MemoryDatabase({
    bookings: {
      "booking-1": {
        customerId: "customer-2",
        status: "reserved",
        limitId: "customer-2_event-1",
      },
    },
  });
  await assert.rejects(
    releaseUnpaidReservationWithDatabase({
      db,
      uid: "customer-1",
      bookingId: "booking-1",
      now,
    }),
    (error) => error.status === 404,
  );
  assert.equal(db.records("bookings").get("booking-1").status, "reserved");
});

test("authorized payment is not released as an unpaid reservation", async () => {
  const db = new MemoryDatabase({
    bookings: {
      "booking-1": {
        customerId: "customer-1",
        status: "payment_pending",
        razorpayOrderId: "order-1",
        limitId: "customer-1_event-1",
      },
    },
    payments: {
      "order-1": { status: "authorized" },
    },
    bookingLimits: {
      "customer-1_event-1": {
        bookingId: "booking-1",
        status: "payment_pending",
      },
    },
  });

  const result = await releaseUnpaidReservationWithDatabase({
    db,
    uid: "customer-1",
    bookingId: "booking-1",
    now,
  });
  assert.equal(result.status, "pending");
  assert.equal(db.records("bookings").get("booking-1").status, "payment_pending");
  assert.equal(db.records("bookingLimits").get("customer-1_event-1").status, "payment_pending");
});
