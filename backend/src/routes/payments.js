import { Router } from "express";
import express from "express";
import { requireFirebaseUser } from "../auth/firebaseAuth.js";
import {
  cancelPaymentCheckout,
  createPaymentOrder,
  getPaymentStatus,
  processRazorpayWebhook,
  verifyCheckoutPayment,
} from "../payments/paymentService.js";
import {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from "../payments/signatures.js";

const router = Router();

router.post("/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.get("x-razorpay-signature");
  const eventId = req.get("x-razorpay-event-id");
  if (!secret) {
    return res.status(503).json({ error: "Razorpay webhooks are not configured." });
  }
  if (!eventId || !/^[A-Za-z0-9_-]{1,200}$/.test(eventId) || !Buffer.isBuffer(req.body)) {
    return res.status(400).json({ error: "A valid Razorpay webhook event is required." });
  }
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(400).json({ error: "Razorpay webhook signature verification failed." });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Razorpay webhook body is not valid JSON." });
  }
  const result = await processRazorpayWebhook(eventId, event);
  return res.json({ received: true, ...result });
});

router.use(express.json({ limit: "32kb" }));

router.post("/orders", requireFirebaseUser, async (req, res) => {
  const bookingId = req.body?.bookingId;
  if (typeof bookingId !== "string" || !/^[a-f\d-]{36}$/i.test(bookingId)) {
    return res.status(400).json({ error: "A valid reservation ID is required." });
  }
  const result = await createPaymentOrder(req.firebaseUser.uid, bookingId);
  return res.status(result.alreadyPaid ? 200 : 201).json(result);
});

router.post("/verify", requireFirebaseUser, async (req, res) => {
  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body || {};
  if (
    typeof bookingId !== "string" ||
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string" ||
    !verifyCheckoutSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET || "",
    )
  ) {
    return res.status(400).json({ error: "Razorpay payment signature verification failed." });
  }

  const result = await verifyCheckoutPayment(req.firebaseUser.uid, {
    bookingId,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  return res.json(result);
});

router.get("/:bookingId/status", requireFirebaseUser, async (req, res) => {
  return res.json(await getPaymentStatus(req.firebaseUser.uid, req.params.bookingId));
});

router.post("/:bookingId/cancel", requireFirebaseUser, async (req, res) => {
  return res.json(await cancelPaymentCheckout(req.firebaseUser.uid, req.params.bookingId));
});

export default router;
