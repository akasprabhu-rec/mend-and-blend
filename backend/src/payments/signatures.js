import { createHmac, timingSafeEqual } from "node:crypto";

function signatureMatches(expected, actual) {
  if (typeof actual !== "string" || !/^[a-f\d]{64}$/i.test(actual)) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

export function verifyCheckoutSignature(orderId, paymentId, signature, secret) {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return signatureMatches(expected, signature);
}

export function verifyWebhookSignature(body, signature, secret) {
  if (!Buffer.isBuffer(body) || typeof signature !== "string") return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return signatureMatches(expected, signature);
}
