export function createRazorpayOrderPayload({ amountInSubunits, bookingId, uid }) {
  return {
    amount: amountInSubunits,
    currency: "INR",
    receipt: bookingId,
    notes: { bookingId, customerId: uid },
  };
}
