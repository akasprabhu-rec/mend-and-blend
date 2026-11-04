import Razorpay from "razorpay";

let client;

export function isRazorpayTestKey(keyId) {
  return typeof keyId === "string" && /^rzp_test_[A-Za-z0-9]+$/.test(keyId);
}

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error("Razorpay is not configured on the backend.");
    error.status = 503;
    throw error;
  }
  if (!isRazorpayTestKey(keyId)) {
    const error = new Error(
      "Razorpay live mode is disabled. Use test-mode credentials until production launch is approved.",
    );
    error.status = 503;
    throw error;
  }

  if (!client) client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}
