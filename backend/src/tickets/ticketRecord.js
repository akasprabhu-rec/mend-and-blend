import { randomBytes } from "node:crypto";

export function createTicketRecord({ booking, bookingId, customerId, issuedAt }) {
  return {
    customerId,
    bookingId,
    workshopId: booking.workshopId || booking.eventId,
    eventId: booking.workshopId || booking.eventId,
    workshopName: booking.workshopName,
    sessionDate: booking.sessionDate,
    start: booking.start,
    end: booking.end,
    venue: booking.venue ||
      [booking.venueName, booking.venueAddress].filter(Boolean).join(", "),
    customerName: booking.participant.fullName,
    qrToken: randomBytes(32).toString("base64url"),
    status: "valid",
    isValid: true,
    issuedAt,
  };
}
