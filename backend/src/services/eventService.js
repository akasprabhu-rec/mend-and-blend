import { randomUUID } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getDatabase } from "../firebaseAdmin.js";

const eventStatuses = new Set(["draft", "published", "unpublished", "completed"]);
const activeHoldStatuses = new Set(["reserved", "order_creating", "payment_pending"]);
const istOffset = "+05:30";

function eventError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseLocalDateTime(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw eventError(400, `${label} is required.`);
  }
  const parsed = new Date(`${value}:00${istOffset}`);
  const [date, time] = value.split("T");
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T").slice(0, 16) !== value
  ) {
    throw eventError(400, `${label} is not a valid date and time.`);
  }
  return { timestamp: Timestamp.fromDate(parsed), date, time };
}

export function validateManagedEvent(input, { requireRegistrationWindow = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw eventError(400, "Event details are required.");
  }
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const shortDescription =
    typeof input.shortDescription === "string" ? input.shortDescription.trim() : "";
  const fullDescription =
    typeof input.fullDescription === "string" ? input.fullDescription.trim() : "";
  const venueName = typeof input.venueName === "string" ? input.venueName.trim() : "";
  const venueAddress =
    typeof input.venueAddress === "string" ? input.venueAddress.trim() : "";
  const price = Number(input.price);
  const capacity = Number(input.capacity);
  if (!title || title.length > 120) {
    throw eventError(400, "Event name is required and must be at most 120 characters.");
  }
  if (!shortDescription || shortDescription.length > 300) {
    throw eventError(400, "Enter a short description of at most 300 characters.");
  }
  if (!fullDescription || fullDescription.length > 10000) {
    throw eventError(400, "Enter a full event description of at most 10,000 characters.");
  }
  if (!venueName || venueName.length > 200 || !venueAddress || venueAddress.length > 500) {
    throw eventError(400, "Venue name and address are required.");
  }
  if (!Number.isSafeInteger(price) || price < 1 || price > 10000000) {
    throw eventError(400, "Ticket price must be a whole INR amount between 1 and 10,000,000.");
  }
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100000) {
    throw eventError(400, "Seat capacity must be a whole number between 1 and 100,000.");
  }
  if (!eventStatuses.has(input.status)) {
    throw eventError(400, "Choose Draft, Published, Unpublished or Completed.");
  }

  const eventDate = typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date)
    ? input.date
    : "";
  const start = typeof input.start === "string" && /^\d{2}:\d{2}$/.test(input.start)
    ? input.start
    : "";
  const end = typeof input.end === "string" && /^\d{2}:\d{2}$/.test(input.end)
    ? input.end
    : "";
  if (!eventDate || !start || !end || start >= end) {
    throw eventError(400, "Enter a valid event date, start time and later end time.");
  }
  if (!Number.isFinite(Date.parse(`${eventDate}T00:00:00${istOffset}`))) {
    throw eventError(400, "Event date is invalid.");
  }
  const eventStart = parseLocalDateTime(`${eventDate}T${start}`, "Event start");
  const eventEnd = parseLocalDateTime(`${eventDate}T${end}`, "Event end");
  let registrationOpen = null;
  let registrationClose = null;
  const hasOpen = Boolean(input.registrationOpenAt);
  const hasClose = Boolean(input.registrationCloseAt);
  if (hasOpen !== hasClose || (requireRegistrationWindow && !hasOpen)) {
    throw eventError(400, "Set both registration opening and closing times.");
  }
  if (hasOpen) {
    registrationOpen = parseLocalDateTime(
      input.registrationOpenAt,
      "Registration opening date and time",
    );
    registrationClose = parseLocalDateTime(
      input.registrationCloseAt,
      "Registration closing deadline",
    );
    if (registrationClose.timestamp.toMillis() <= registrationOpen.timestamp.toMillis()) {
      throw eventError(400, "Registration must close after it opens.");
    }
  }

  const imageUrl = typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
  if (imageUrl) {
    let parsed;
    try {
      parsed = new URL(imageUrl);
    } catch {
      throw eventError(400, "Poster URL must be a valid HTTPS URL.");
    }
    if (parsed.protocol !== "https:") {
      throw eventError(400, "Poster URL must use HTTPS.");
    }
  }

  const published = input.status === "published";
  return {
    title,
    shortDescription,
    fullDescription,
    description: shortDescription,
    date: eventDate,
    start,
    end,
    eventStartAt: eventStart.timestamp,
    eventEndAt: eventEnd.timestamp,
    venueName,
    venueAddress,
    venue: `${venueName}, ${venueAddress}`,
    price,
    currency: "INR",
    capacity,
    imageUrl,
    registrationOpenAt: registrationOpen?.timestamp || null,
    registrationCloseAt: registrationClose?.timestamp || null,
    status: input.status,
    published,
    salesPaused: input.salesPaused === true,
  };
}

function timestampMillis(value) {
  if (value?.toMillis) return value.toMillis();
  if (typeof value === "string" || value instanceof Date) {
    const millis = new Date(value).getTime();
    return Number.isNaN(millis) ? null : millis;
  }
  return null;
}

function isoDate(value) {
  const millis = timestampMillis(value);
  return millis === null ? null : new Date(millis).toISOString();
}

function registrationState(event, now, availableSeats) {
  if (event.status === "completed") return "completed";
  if (!event.published || event.status === "draft" || event.status === "unpublished") {
    return "unpublished";
  }
  if (event.registrationClosedManually) return "closed";
  if (event.salesPaused) return "paused";
  const opensAt = timestampMillis(event.registrationOpenAt);
  const closesAt = timestampMillis(event.registrationCloseAt);
  if (opensAt !== null && now < opensAt) return "not_open";
  if (closesAt !== null && now >= closesAt) return "closed";
  if (availableSeats <= 0) return "sold_out";
  return "open";
}

export function getRegistrationState(event, now = Date.now(), availableSeats = event.capacity) {
  return registrationState(event, now, availableSeats);
}

export function registrationWindowError(event, now = Date.now()) {
  const state = registrationState(event, now, event.capacity);
  if (state === "unpublished" || state === "completed") {
    return eventError(404, "This event is not available for registration.");
  }
  if (state === "paused") return eventError(409, "Ticket sales are temporarily paused.");
  if (state === "not_open") return eventError(409, "Registrations have not opened yet.");
  if (state === "closed") return eventError(409, "The registration deadline has passed.");
  return null;
}

export function serializeEvent(event, now = Date.now(), availableSeats = event.capacity) {
  const registrationStatus = registrationState(event, now, availableSeats);
  return {
    ...event,
    status: event.status || (event.published ? "published" : "unpublished"),
    eventStartAt: isoDate(event.eventStartAt),
    eventEndAt: isoDate(event.eventEndAt),
    registrationOpenAt: isoDate(event.registrationOpenAt),
    registrationCloseAt: isoDate(event.registrationCloseAt),
    registrationStatus,
    registrationOpen: registrationStatus === "open",
    canRegister: registrationStatus === "open",
    registrationClosedManually: event.registrationClosedManually === true,
  };
}

function istDateTimeInput(millis) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(millis)).replace(" ", "T");
}

function isActiveBooking(booking, now) {
  if (booking.status === "confirmed") return true;
  return activeHoldStatuses.has(booking.status) &&
    timestampMillis(booking.expiresAt) !== null &&
    timestampMillis(booking.expiresAt) > now;
}

function eventPhase(event, now) {
  const start = timestampMillis(event.eventStartAt) ??
    timestampMillis(`${event.date}T${to24HourTime(event.start)}:00${istOffset}`);
  const end = timestampMillis(event.eventEndAt) ??
    timestampMillis(`${event.date}T${to24HourTime(event.end)}:00${istOffset}`);
  if (start > now) return "upcoming";
  if (end > now) return "ongoing";
  return "past";
}

export async function listManagedEvents() {
  const db = getDatabase();
  const [eventSnapshot, bookingSnapshot, paymentSnapshot] = await Promise.all([
    db.collection("workshops").get(),
    db.collection("bookings").get(),
    db.collection("payments").get(),
  ]);
  const now = Date.now();
  const events = eventSnapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
  const bookingsByEvent = new Map();
  const bookingById = new Map();
  for (const document of bookingSnapshot.docs) {
    const booking = { id: document.id, ...document.data() };
    bookingById.set(booking.id, booking);
    const list = bookingsByEvent.get(booking.workshopId) || [];
    list.push(booking);
    bookingsByEvent.set(booking.workshopId, list);
  }
  const capturedRevenueByEvent = new Map();
  for (const document of paymentSnapshot.docs) {
    const payment = document.data();
    if (payment.status !== "captured") continue;
    const booking = bookingById.get(payment.bookingId);
    if (!booking) continue;
    capturedRevenueByEvent.set(
      booking.workshopId,
      (capturedRevenueByEvent.get(booking.workshopId) || 0) +
        (payment.amountInSubunits || 0) / 100,
    );
  }
  return events
    .map((event) => {
      const eventBookings = bookingsByEvent.get(event.id) || [];
      const bookedSeats = eventBookings.filter((booking) =>
        isActiveBooking(booking, now),
      ).length;
      const availableSeats = Math.max(0, (event.capacity || 0) - bookedSeats);
      return {
        ...serializeEvent(event, now, availableSeats),
        phase: eventPhase(event, now),
        registrationCount: eventBookings.filter((booking) =>
          booking.status === "confirmed",
        ).length,
        bookedSeats,
        availableSeats,
        revenue: capturedRevenueByEvent.get(event.id) || 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function safeEventId(title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "event";
  return `${slug}-${randomUUID()}`;
}

function to24HourTime(value) {
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value || "");
  if (!match) return "";
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

export async function createManagedEvent(input, actorUid) {
  const event = validateManagedEvent(input, { requireRegistrationWindow: true });
  const db = getDatabase();
  const now = Timestamp.now();
  const ref = db.collection("workshops").doc(safeEventId(event.title));
  await ref.create({
    ...event,
    eventType: "managed_event",
    number: "EV",
    salesPaused: false,
    registrationClosedManually: false,
    reservationVersion: 0,
    createdBy: actorUid,
    createdAt: now,
    updatedAt: now,
  });
  return { id: ref.id };
}

export async function updateManagedEvent(eventId, input, actorUid) {
  const event = validateManagedEvent(input);
  const db = getDatabase();
  const ref = db.collection("workshops").doc(eventId);
  const now = Timestamp.now();
  await db.runTransaction(async (transaction) => {
    const [snapshot, bookingSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(db.collection("bookings").where("workshopId", "==", eventId)),
    ]);
    if (!snapshot.exists) throw eventError(404, "Event was not found.");
    const bookedSeats = bookingSnapshot.docs
      .map((doc) => doc.data())
      .filter((booking) => isActiveBooking(booking, now.toMillis())).length;
    if (event.capacity < bookedSeats) {
      throw eventError(409, `Capacity cannot be lower than the ${bookedSeats} booked or actively reserved seats.`);
    }
    transaction.update(ref, {
      ...event,
      updatedBy: actorUid,
      updatedAt: now,
    });
  });
  return { id: eventId };
}

export async function duplicateManagedEvent(eventId, actorUid) {
  const db = getDatabase();
  const source = await db.collection("workshops").doc(eventId).get();
  if (!source.exists) throw eventError(404, "Event was not found.");
  const original = source.data();
  const now = Date.now();
  const event = {
    title: `${original.title} (copy)`,
    shortDescription: original.shortDescription || original.description || "",
    fullDescription: original.fullDescription || original.description || "",
    date: original.date,
    start: to24HourTime(original.start),
    end: to24HourTime(original.end),
    venueName: original.venueName || "Mend and Blend",
    venueAddress: original.venueAddress || original.venue || "",
    price: original.price,
    capacity: original.capacity,
    imageUrl: original.imageUrl || "",
    registrationOpenAt: istDateTimeInput(now - 60_000),
    registrationCloseAt: istDateTimeInput(now + 30 * 24 * 60 * 60_000),
    status: "draft",
  };
  return createManagedEvent(event, actorUid);
}

export async function deleteManagedEvent(eventId) {
  const db = getDatabase();
  const ref = db.collection("workshops").doc(eventId);
  await db.runTransaction(async (transaction) => {
    const [eventSnapshot, bookingSnapshot] = await Promise.all([
      transaction.get(ref),
      transaction.get(db.collection("bookings").where("workshopId", "==", eventId)),
    ]);
    if (!eventSnapshot.exists) throw eventError(404, "Event was not found.");
    if (eventSnapshot.data().eventType !== "managed_event") {
      throw eventError(409, "The original Mend and Blend workshop sessions are protected from deletion.");
    }
    const bookingDocs = bookingSnapshot.docs;
    if (bookingDocs.some((doc) => doc.data().status === "confirmed")) {
      throw eventError(409, "This event has confirmed registrations and cannot be deleted.");
    }

    const paymentRefs = bookingDocs
      .map((doc) => doc.data().razorpayOrderId)
      .filter(Boolean)
      .map((orderId) => db.collection("payments").doc(orderId));
    const payments = paymentRefs.length
      ? await transaction.getAll(...paymentRefs)
      : [];
    if (payments.some((payment) => payment.exists)) {
      throw eventError(409, "This event has payment records and cannot be deleted.");
    }
    if (bookingDocs.some((doc) => isActiveBooking(doc.data(), Date.now()))) {
      throw eventError(409, "This event has active seat reservations and cannot be deleted yet.");
    }
    transaction.delete(ref);
  });
  return { id: eventId, deleted: true };
}

export async function setEventSalesPaused(eventId, paused) {
  if (typeof paused !== "boolean") {
    throw eventError(400, "Sales pause state must be true or false.");
  }
  const db = getDatabase();
  const ref = db.collection("workshops").doc(eventId);
  const now = Timestamp.now();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw eventError(404, "Event was not found.");
    transaction.update(ref, { salesPaused: paused, updatedAt: now });
  });
  return { id: eventId, salesPaused: paused };
}

export async function setEventRegistrationState(eventId, action) {
  if (action !== "open" && action !== "close") {
    throw eventError(400, "Registration action must be open or close.");
  }
  const db = getDatabase();
  const ref = db.collection("workshops").doc(eventId);
  const now = Timestamp.now();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw eventError(404, "Event was not found.");
    const event = snapshot.data();
    if (!event.published || event.status === "completed") {
      throw eventError(409, "Publish this event before opening registrations.");
    }
    if (action === "open") {
      const closesAt = timestampMillis(event.registrationCloseAt);
      if (closesAt !== null && closesAt <= now.toMillis()) {
        throw eventError(409, "The registration deadline has passed. Change the deadline before reopening registrations.");
      }
      transaction.update(ref, {
        registrationClosedManually: false,
        registrationOpenAt: now,
        updatedAt: now,
      });
    } else {
      transaction.update(ref, {
        registrationClosedManually: true,
        updatedAt: now,
      });
    }
  });
  return { id: eventId, registrationClosedManually: action === "close" };
}
