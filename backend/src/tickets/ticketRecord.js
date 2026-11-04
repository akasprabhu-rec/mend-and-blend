import { randomBytes } from "node:crypto";
import { WORKSHOP_VENUE } from "../data/workshops.js";

export function createTicketRecord({ booking, bookingId, customerId, issuedAt }) {
  return {
    customerId,
    bookingId,
    workshopId: booking.workshopId,
    workshopName: booking.workshopName,
    sessionDate: booking.sessionDate,
    start: booking.start,
    end: booking.end,
    venue: booking.venue || WORKSHOP_VENUE,
    customerName: booking.participant.fullName,
    qrToken: randomBytes(32).toString("base64url"),
    status: "valid",
    isValid: true,
    issuedAt,
  };
}
