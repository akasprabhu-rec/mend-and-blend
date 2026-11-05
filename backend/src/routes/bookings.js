import { Router } from "express";
import { requireFirebaseUser } from "../auth/firebaseAuth.js";
import {
  BookingError,
  createReservation,
  listCustomerBookings,
} from "../services/bookingService.js";

const router = Router();

function validateParticipant(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BookingError(400, "Participant details are required.");
  }

  const fullName = typeof value.fullName === "string" ? value.fullName.trim() : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const phone = typeof value.phone === "string" ? value.phone.trim() : "";

  if (fullName.length < 2 || fullName.length > 100) {
    throw new BookingError(400, "Enter a name between 2 and 100 characters.");
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BookingError(400, "Enter a valid email address.");
  }
  if (phone.length < 7 || phone.length > 25 || !/^[+()\d\s-]+$/.test(phone)) {
    throw new BookingError(400, "Enter a valid phone number.");
  }

  return { fullName, email, phone };
}

router.get("/mine", requireFirebaseUser, async (req, res) => {
  res.json({ bookings: await listCustomerBookings(req.firebaseUser.uid) });
});

router.post("/reservations", requireFirebaseUser, async (req, res) => {
  const eventId = req.body?.eventId ?? req.body?.workshopId;
  if (
    typeof eventId !== "string" ||
    eventId.length > 120 ||
    !/^[a-zA-Z0-9_-]+$/.test(eventId)
  ) {
    throw new BookingError(400, "A valid event is required.");
  }

  const reservation = await createReservation({
    uid: req.firebaseUser.uid,
    workshopId: eventId,
    participant: validateParticipant(req.body.participant),
  });
  res.status(201).json(reservation);
});

export default router;
