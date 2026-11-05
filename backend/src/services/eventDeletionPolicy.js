const nonBlockingPaymentStatuses = new Set(["failed", "cancelled", "expired"]);
const terminalBookingStatuses = new Set(["payment_failed", "cancelled", "expired"]);
const activeBookingStatuses = new Set(["reserved", "order_creating", "payment_pending"]);

function timestampMillis(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const millis = Date.parse(value);
    return Number.isNaN(millis) ? null : millis;
  }
  return null;
}

export function hasRelevantPaymentRecord(payment, booking, now = Date.now()) {
  if (nonBlockingPaymentStatuses.has(payment?.status)) return false;
  if (payment?.status !== "created") return true;
  if (payment.razorpayPaymentId) return true;
  if (!booking) return true;
  if (terminalBookingStatuses.has(booking.status)) return false;

  const expiresAt = timestampMillis(booking.expiresAt);
  return !(
    activeBookingStatuses.has(booking.status) &&
    expiresAt !== null &&
    expiresAt <= now
  );
}
