const pendingStatuses = new Set(["reserved", "order_creating", "payment_pending"]);

export function getReservationStatus(reservation, now = Date.now()) {
  if (reservation.status === "confirmed") return "confirmed";
  if (reservation.status === "cancelled") return "cancelled";
  if (
    pendingStatuses.has(reservation.status) &&
    Number.isFinite(Date.parse(reservation.expiresAt || "")) &&
    Date.parse(reservation.expiresAt) > now
  ) {
    return "pending";
  }
  return "expired";
}

export function formatReservationCountdown(expiresAt, now = Date.now()) {
  const remainingSeconds = Math.max(
    0,
    Math.ceil((Date.parse(expiresAt || "") - now) / 1000),
  );
  return `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;
}
