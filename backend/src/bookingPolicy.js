const allowedPolicies = new Set(["one_total", "one_per_session"]);
const configuredPolicy = process.env.BOOKING_TICKET_LIMIT_POLICY || "one_per_session";
const configuredHoldMinutes = Number(process.env.BOOKING_HOLD_MINUTES || 10);

if (!allowedPolicies.has(configuredPolicy)) {
  throw new Error(
    "BOOKING_TICKET_LIMIT_POLICY must be one_total or one_per_session.",
  );
}

if (!Number.isInteger(configuredHoldMinutes) || configuredHoldMinutes < 1 || configuredHoldMinutes > 30) {
  throw new Error("BOOKING_HOLD_MINUTES must be a whole number between 1 and 30.");
}

export const bookingTicketLimitPolicy = configuredPolicy;
export const bookingHoldMinutes = configuredHoldMinutes;
