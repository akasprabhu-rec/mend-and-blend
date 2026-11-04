import { Timestamp } from "firebase-admin/firestore";
import { getDatabase } from "../firebaseAdmin.js";
import { serializeEvent } from "./eventService.js";

const activeBookingStatuses = ["reserved", "order_creating", "payment_pending"];

function isActiveHold(booking, now) {
  return (
    activeBookingStatuses.includes(booking.status) &&
    booking.expiresAt instanceof Timestamp &&
    booking.expiresAt.toMillis() > now.toMillis()
  );
}

function toIso(value) {
  return value?.toDate?.().toISOString() ?? null;
}

export async function getAdminDashboard(searchTerm = "") {
  const db = getDatabase();
  const [workshopSnapshot, bookingSnapshot, paymentSnapshot, ticketSnapshot] =
    await Promise.all([
      db.collection("workshops").get(),
      db.collection("bookings").get(),
      db.collection("payments").get(),
      db.collection("tickets").get(),
    ]);

  const workshops = workshopSnapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
  const bookings = bookingSnapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
  const paymentsByBooking = new Map(
    paymentSnapshot.docs.map((document) => {
      const payment = document.data();
      return [payment.bookingId, { id: document.id, ...payment }];
    }),
  );
  const ticketsByBooking = new Map(
    ticketSnapshot.docs.map((document) => {
      const ticket = document.data();
      return [ticket.bookingId, { id: document.id, ...ticket }];
    }),
  );

  const now = Timestamp.now();
  const bookingsByWorkshop = new Map();
  const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));
  const revenueByWorkshop = new Map();
  for (const paymentDocument of paymentSnapshot.docs) {
    const payment = paymentDocument.data();
    const booking = bookingsById.get(payment.bookingId);
    if (payment.status === "captured" && booking) {
      revenueByWorkshop.set(
        booking.workshopId,
        (revenueByWorkshop.get(booking.workshopId) || 0) +
          (payment.amountInSubunits || 0) / 100,
      );
    }
  }
  for (const booking of bookings) {
    const workshopBookings = bookingsByWorkshop.get(booking.workshopId) || [];
    workshopBookings.push(booking);
    bookingsByWorkshop.set(booking.workshopId, workshopBookings);
  }

  const workshopSummaries = workshops
    .map((workshop) => {
      const workshopBookings = bookingsByWorkshop.get(workshop.id) || [];
      const registrations = workshopBookings.filter(
        (booking) => booking.status === "confirmed",
      ).length;
      const bookedSeats = workshopBookings.filter(
        (booking) => booking.status === "confirmed" || isActiveHold(booking, now),
      ).length;

      const availableSeats = Math.max(0, workshop.capacity - bookedSeats);
      return {
        ...serializeEvent(workshop, now.toMillis(), availableSeats),
        id: workshop.id,
        registrationCount: registrations,
        bookedSeats,
        availableSeats,
        revenue: revenueByWorkshop.get(workshop.id) || 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.number || "").localeCompare(b.number || ""));

  const registrations = bookings
    .map((booking) => {
      const payment = paymentsByBooking.get(booking.id);
      const ticket = ticketsByBooking.get(booking.id);
      return {
        bookingId: booking.id,
        customerId: booking.customerId,
        customerName: booking.participant?.fullName || "",
        email: booking.participant?.email || "",
        phone: booking.participant?.phone || "",
        workshopId: booking.workshopId,
        workshopName: booking.workshopName || "",
        sessionDate: booking.sessionDate || "",
        start: booking.start || "",
        end: booking.end || "",
        bookingStatus: booking.status,
        paymentStatus: payment?.status || "not_started",
        ticketStatus: ticket?.status || "none",
        createdAt: toIso(booking.createdAt),
      };
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const filteredRegistrations = normalizedSearch
    ? registrations.filter((registration) =>
        [
          registration.customerName,
          registration.email,
          registration.bookingId,
          registration.phone,
          registration.workshopName,
          registration.sessionDate,
          registration.bookingStatus,
          registration.paymentStatus,
          registration.ticketStatus,
        ].some((value) => value.toLocaleLowerCase().includes(normalizedSearch)),
      )
    : registrations;

  const capturedPayments = paymentSnapshot.docs
    .map((document) => document.data())
    .filter((payment) => payment.status === "captured");

  return {
    summary: {
      totalRegistrations: bookings.filter((booking) => booking.status === "confirmed").length,
      successfulPayments: capturedPayments.length,
      totalRevenue: capturedPayments.reduce(
        (total, payment) => total + (payment.amountInSubunits || 0),
        0,
      ) / 100,
      availableSeats: workshopSummaries.reduce(
        (total, workshop) => total + workshop.availableSeats,
        0,
      ),
      bookedSeats: workshopSummaries.reduce(
        (total, workshop) => total + workshop.bookedSeats,
        0,
      ),
      activeEvents: workshopSummaries.filter(
        (workshop) => workshop.published && workshop.status !== "completed",
      ).length,
      unpublishedEvents: workshopSummaries.filter(
        (workshop) => !workshop.published && workshop.status !== "completed",
      ).length,
    },
    workshops: workshopSummaries,
    registrations: filteredRegistrations,
  };
}

export async function redeemTicket(qrToken, adminUid) {
  const db = getDatabase();
  const tickets = db.collection("tickets");
  return db.runTransaction(async (transaction) => {
    const ticketQuery = tickets.where("qrToken", "==", qrToken).limit(1);
    const ticketSnapshot = await transaction.get(ticketQuery);
    if (ticketSnapshot.empty) {
      return { status: "invalid", message: "This ticket is invalid or could not be found." };
    }

    const ticketDocument = ticketSnapshot.docs[0];
    const ticketRef = ticketDocument.ref;
    const ticket = ticketDocument.data();
    const bookingRef = db.collection("bookings").doc(ticket.bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) {
      return { status: "invalid", message: "This ticket has no valid booking." };
    }

    const booking = bookingSnapshot.data();
    const paymentRef = booking.razorpayOrderId
      ? db.collection("payments").doc(booking.razorpayOrderId)
      : null;
    const paymentSnapshot = paymentRef
      ? await transaction.get(paymentRef)
      : null;

    if (
      ticket.status === "redeemed" ||
      ticket.isValid === false ||
      ticket.redeemedAt
    ) {
      return {
        status: "already_used",
        message: "This ticket has already been used.",
        workshopName: ticket.workshopName || booking.workshopName || "",
        customerName: ticket.customerName || "",
      };
    }

    const valid =
      ticket.status === "valid" &&
      ticket.isValid === true &&
      ticket.customerId === booking.customerId &&
      ticket.bookingId === bookingSnapshot.id &&
      ticket.workshopId === booking.workshopId &&
      booking.status === "confirmed" &&
      Boolean(paymentSnapshot?.exists) &&
      paymentSnapshot.data().status === "captured" &&
      paymentSnapshot.data().bookingId === bookingSnapshot.id &&
      paymentSnapshot.data().customerId === booking.customerId &&
      paymentSnapshot.data().razorpayOrderId === booking.razorpayOrderId;
    if (!valid) {
      return { status: "invalid", message: "This ticket is invalid or not paid." };
    }

    const redeemedAt = Timestamp.now();
    transaction.update(ticketRef, {
      status: "redeemed",
      isValid: false,
      redeemedAt,
      redeemedBy: adminUid,
    });

    return {
      status: "valid",
      message: "Ticket is valid and has been redeemed.",
      workshopName: ticket.workshopName,
      sessionDate: ticket.sessionDate,
      start: ticket.start,
      end: ticket.end,
      customerName: ticket.customerName,
      redeemedAt: redeemedAt.toDate().toISOString(),
    };
  });
}
