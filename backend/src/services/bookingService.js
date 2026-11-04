import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import {
  bookingHoldMinutes,
  bookingTicketLimitPolicy,
} from "../bookingPolicy.js";
import { WORKSHOP_VENUE } from "../data/workshops.js";
import { getDatabase } from "../firebaseAdmin.js";
import {
  getRegistrationState,
  registrationWindowError,
  serializeEvent,
} from "./eventService.js";

export class BookingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isActive(booking, now) {
  if (booking.status === "confirmed") return true;
  return (
    ["reserved", "order_creating", "payment_pending"].includes(booking.status) &&
    booking.expiresAt instanceof Timestamp &&
    booking.expiresAt.toMillis() > now.toMillis()
  );
}

function activeBookingQueries(db, workshopId, now) {
  const bookings = db.collection("bookings").where("workshopId", "==", workshopId);
  return [
    bookings.where("status", "==", "confirmed"),
    ...["reserved", "order_creating", "payment_pending"].map((status) =>
      bookings.where("status", "==", status).where("expiresAt", ">", now),
    ),
  ];
}

function countActiveBookings(snapshots, now) {
  return snapshots
    .flatMap((snapshot) => snapshot.docs)
    .filter((booking) => isActive(booking.data(), now)).length;
}

function ticketLimitDocumentId(uid, workshopId) {
  return bookingTicketLimitPolicy === "one_total"
    ? uid
    : `${uid}_${workshopId}`;
}

export async function getPublishedWorkshops() {
  const db = getDatabase();
  const snapshot = await db
    .collection("workshops")
    .where("published", "==", true)
    .get();
  const now = Timestamp.now();

  const workshops = await Promise.all(
    snapshot.docs.map(async (document) => {
      const workshop = document.data();
      const activeBookings = await Promise.all(
        activeBookingQueries(db, document.id, now).map((query) => query.get()),
      );
      const occupied = countActiveBookings(activeBookings, now);
      return {
        ...serializeEvent(
          { id: document.id, ...workshop },
          now.toMillis(),
          Math.max(0, workshop.capacity - occupied),
        ),
        id: document.id,
        availableSeats: Math.max(0, workshop.capacity - occupied),
      };
    }),
  );
  workshops.sort((a, b) =>
    a.date.localeCompare(b.date) || (a.number || "").localeCompare(b.number || ""),
  );

  const allWorkshops = await db.collection("workshops").select("date", "published").get();
  const dates = new Map();
  for (const document of allWorkshops.docs) {
    const { date, published } = document.data();
    const entry = dates.get(date) || { date, publishedCount: 0 };
    if (published) entry.publishedCount += 1;
    dates.set(date, entry);
  }

  return { workshops, dates: [...dates.values()].sort((a, b) => a.date.localeCompare(b.date)) };
}

export async function getWorkshopAvailability(workshopId) {
  const db = getDatabase();
  const now = Timestamp.now();
  return db.runTransaction(async (transaction) => {
    const workshopRef = db.collection("workshops").doc(workshopId);
    const workshopSnapshot = await transaction.get(workshopRef);
    if (!workshopSnapshot.exists || workshopSnapshot.data().published !== true) {
      throw new BookingError(404, "This workshop session is not available.");
    }
    const registrationError = registrationWindowError(
      workshopSnapshot.data(),
      now.toMillis(),
    );
    if (registrationError) {
      throw new BookingError(registrationError.status, registrationError.message);
    }

    const activeBookings = await Promise.all(
      activeBookingQueries(db, workshopId, now).map((query) =>
        transaction.get(query),
      ),
    );
    const occupied = countActiveBookings(activeBookings, now);
    const availableSeats = Math.max(
      0,
      workshopSnapshot.data().capacity - occupied,
    );
    if (
      getRegistrationState(
        workshopSnapshot.data(),
        now.toMillis(),
        availableSeats,
      ) === "sold_out"
    ) {
      throw new BookingError(409, "This event is sold out.");
    }

    return {
      workshopId,
      capacity: workshopSnapshot.data().capacity,
      availableSeats,
    };
  });
}

export async function createReservation({ uid, workshopId, participant }) {
  const db = getDatabase();
  const now = Timestamp.now();
  const requestedExpiresAt = Timestamp.fromMillis(
    now.toMillis() + bookingHoldMinutes * 60 * 1000,
  );
  const bookingId = randomUUID();
  const workshopRef = db.collection("workshops").doc(workshopId);
  const bookingRef = db.collection("bookings").doc(bookingId);
  const limitRef = db
    .collection("bookingLimits")
    .doc(ticketLimitDocumentId(uid, workshopId));

  const reservation = await db.runTransaction(async (transaction) => {
    const activeBookingReads = activeBookingQueries(db, workshopId, now).map((query) =>
      transaction.get(query),
    );
    const [workshopSnapshot, limitSnapshot, ...activeBookings] = await Promise.all([
      transaction.get(workshopRef),
      transaction.get(limitRef),
      ...activeBookingReads,
    ]);

    if (!workshopSnapshot.exists || workshopSnapshot.data().published !== true) {
      throw new BookingError(404, "This workshop session is not available.");
    }

    const workshop = workshopSnapshot.data();
    const registrationError = registrationWindowError(workshop, now.toMillis());
    if (registrationError) {
      throw new BookingError(registrationError.status, registrationError.message);
    }
    const limit = limitSnapshot.data();
    if (
      limitSnapshot.exists &&
      (limit.status === "confirmed" ||
        (["reserved", "order_creating", "payment_pending"].includes(limit.status) &&
          limit.expiresAt instanceof Timestamp &&
          limit.expiresAt.toMillis() > now.toMillis()))
    ) {
      throw new BookingError(
        409,
        bookingTicketLimitPolicy === "one_total"
          ? "You already have an active reservation or ticket."
          : "You already have an active reservation or ticket for this session.",
      );
    }

    const occupied = countActiveBookings(activeBookings, now);
    if (occupied >= workshop.capacity) {
      throw new BookingError(409, "This event is sold out.");
    }
    const registrationCloseMillis = workshop.registrationCloseAt?.toMillis?.() ??
      (typeof workshop.registrationCloseAt === "string"
        ? new Date(workshop.registrationCloseAt).getTime()
        : null);
    const expiresAt = registrationCloseMillis
      ? Timestamp.fromMillis(
          Math.min(requestedExpiresAt.toMillis(), registrationCloseMillis),
        )
      : requestedExpiresAt;

    transaction.update(workshopRef, {
      reservationVersion: (workshop.reservationVersion || 0) + 1,
    });
    transaction.create(bookingRef, {
      customerId: uid,
      limitId: limitRef.id,
      workshopId,
      eventId: workshopId,
      workshopName: workshop.title,
      sessionDate: workshop.date,
      start: workshop.start,
      end: workshop.end,
      venue: workshop.venue || WORKSHOP_VENUE,
      amount: workshop.price,
      currency: "INR",
      status: "reserved",
      participant,
      createdAt: now,
      expiresAt,
    });
    transaction.set(limitRef, {
      customerId: uid,
      workshopId,
      bookingId,
      status: "reserved",
      expiresAt,
      updatedAt: now,
    });

    return {
      bookingId,
      workshopId,
      workshopName: workshop.title,
      sessionDate: workshop.date,
      start: workshop.start,
      end: workshop.end,
      amount: workshop.price,
      currency: "INR",
      status: "reserved",
      availableSeats: Math.max(0, workshop.capacity - occupied - 1),
      amount: workshop.price,
      currency: "INR",
      holdMinutes: bookingHoldMinutes,
      expiresAt: expiresAt.toDate().toISOString(),
    };
  });

  return reservation;
}

export async function listCustomerBookings(uid) {
  const db = getDatabase();
  const snapshot = await db.collection("bookings").where("customerId", "==", uid).get();
  const now = Timestamp.now();
  return snapshot.docs
    .map((document) => {
      const booking = document.data();
      return {
        id: document.id,
        ...booking,
        status:
          ["reserved", "order_creating", "payment_pending"].includes(booking.status) &&
          booking.expiresAt instanceof Timestamp &&
          booking.expiresAt.toMillis() <= now.toMillis()
            ? "expired"
            : booking.status,
        createdAt: booking.createdAt?.toDate?.().toISOString() ?? null,
        expiresAt: booking.expiresAt?.toDate?.().toISOString() ?? null,
      };
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
