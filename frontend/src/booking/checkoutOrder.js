export function validateCheckoutOrder(order, bookingId) {
  if (
    !order ||
    typeof order.orderId !== "string" ||
    !order.orderId ||
    !Number.isSafeInteger(order.amount) ||
    order.amount <= 0 ||
    order.currency !== "INR" ||
    typeof order.keyId !== "string" ||
    !/^rzp_test_[A-Za-z0-9]+$/.test(order.keyId) ||
    order.bookingId !== bookingId ||
    typeof order.expiresAt !== "string" ||
    !Number.isFinite(Date.parse(order.expiresAt))
  ) {
    throw new Error("The server returned incomplete or invalid Razorpay order details.");
  }
  return order;
}
