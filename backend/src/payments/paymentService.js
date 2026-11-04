import { randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDatabase } from "../firebaseAdmin.js";
import { createTicketRecord } from "../tickets/ticketRecord.js";
import { getRazorpay } from "./razorpay.js";
import { canMarkPaymentAuthorized } from "./paymentStatus.js";
import { verifyCheckoutSignature } from "./signatures.js";
import { registrationWindowError } from "../services/eventService.js";

const checkoutHoldMinutes = Number(process.env.PAYMENT_HOLD_MINUTES || 20);
if (
  !Number.isInteger(checkoutHoldMinutes) ||
  checkoutHoldMinutes < 10 ||
  checkoutHoldMinutes > 60
) {
  throw new Error("PAYMENT_HOLD_MINUTES must be a whole number between 10 and 60.");
}

function paymentError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function resultForExistingOrder(booking, payment, keyId) {
  return {
    alreadyPaid: booking.status === "confirmed",
    orderId: booking.razorpayOrderId,
    amount: payment.amountInSubunits,
    currency: payment.currency,
    keyId,
    bookingId: booking.id,
    expiresAt: booking.expiresAt.toDate().toISOString(),
  };
}

export async function createPaymentOrder(uid, bookingId) {
  const gateway = getRazorpay();
  const keyId = process.env.RAZORPAY_KEY_ID.trim();
  const db = getDatabase();
  const bookingRef = db.collection("bookings").doc(bookingId);
  const now = Timestamp.now();
  const checkoutExpiry = Timestamp.fromMillis(
    now.toMillis() + checkoutHoldMinutes * 60 * 1000,
  );
  const claimToken = randomUUID();

  const claim = await db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) throw paymentError(404, "Reservation not found.");

    const booking = bookingSnapshot.data();
    if (booking.customerId !== uid) throw paymentError(404, "Reservation not found.");
    if (booking.status === "confirmed") {
      return { alreadyPaid: true, booking: { id: bookingSnapshot.id, ...booking } };
    }
    const workshopRef = db.collection("workshops").doc(booking.workshopId);
    const workshopSnapshot = await transaction.get(workshopRef);
    if (!workshopSnapshot.exists) {
      throw paymentError(409, "This event is no longer available for payment.");
    }
    const registrationError = registrationWindowError(
      workshopSnapshot.data(),
      now.toMillis(),
    );
    if (registrationError) {
      throw paymentError(registrationError.status, registrationError.message);
    }

    if (
      booking.status === "payment_pending" &&
      booking.razorpayOrderId &&
      booking.expiresAt instanceof Timestamp &&
      booking.expiresAt.toMillis() > now.toMillis()
    ) {
      const paymentSnapshot = await transaction.get(
        db.collection("payments").doc(booking.razorpayOrderId),
      );
      if (paymentSnapshot.exists) {
        return {
          existing: resultForExistingOrder(
            { id: bookingSnapshot.id, ...booking },
            paymentSnapshot.data(),
            keyId,
          ),
        };
      }
    }

    if (
      booking.status === "order_creating" &&
      booking.orderClaimExpiresAt instanceof Timestamp &&
      booking.orderClaimExpiresAt.toMillis() > now.toMillis()
    ) {
      throw paymentError(409, "Your payment order is still being prepared. Please wait.");
    }

    if (
      booking.status !== "reserved" ||
      !(booking.expiresAt instanceof Timestamp) ||
      booking.expiresAt.toMillis() <= now.toMillis()
    ) {
      throw paymentError(409, "This reservation has expired. Please reserve a seat again.");
    }

    const amount = Number(booking.amount);
    const amountInSubunits = Math.round(amount * 100);
    if (
      !Number.isSafeInteger(amountInSubunits) ||
      amountInSubunits <= 0 ||
      booking.currency !== "INR"
    ) {
      throw paymentError(409, "The reservation amount is invalid.");
    }

    const limitRef = db.collection("bookingLimits").doc(booking.limitId);
    const limitSnapshot = await transaction.get(limitRef);
    if (!limitSnapshot.exists || limitSnapshot.data().bookingId !== bookingId) {
      throw paymentError(409, "This reservation is no longer active.");
    }

    const registrationCloseMillis = workshopSnapshot.data().registrationCloseAt?.toMillis?.() ??
      (typeof workshopSnapshot.data().registrationCloseAt === "string"
        ? new Date(workshopSnapshot.data().registrationCloseAt).getTime()
        : null);
    const checkoutExpiryMillis = Math.min(
      checkoutExpiry.toMillis(),
      booking.expiresAt.toMillis(),
      registrationCloseMillis ?? Number.POSITIVE_INFINITY,
    );
    if (checkoutExpiryMillis <= now.toMillis()) {
      throw paymentError(409, "The registration deadline has passed.");
    }
    const effectiveCheckoutExpiry = Timestamp.fromMillis(checkoutExpiryMillis);

    transaction.update(bookingRef, {
      status: "order_creating",
      orderClaimToken: claimToken,
      orderClaimExpiresAt: Timestamp.fromMillis(now.toMillis() + 180_000),
      checkoutExpiresAt: effectiveCheckoutExpiry,
      expiresAt: effectiveCheckoutExpiry,
      updatedAt: now,
    });
    transaction.update(limitRef, {
      status: "order_creating",
      expiresAt: effectiveCheckoutExpiry,
      updatedAt: now,
    });

    return {
      claimToken,
      amountInSubunits,
      amount,
      booking: { id: bookingSnapshot.id, ...booking },
      checkoutExpiry: effectiveCheckoutExpiry,
    };
  });

  if (claim.alreadyPaid) {
    return { alreadyPaid: true, bookingId, status: "confirmed" };
  }
  if (claim.existing) return claim.existing;

  try {
    const order = await gateway.orders.create({
      amount: claim.amountInSubunits,
      currency: "INR",
      receipt: bookingId,
      notes: { bookingId, customerId: uid },
    });

    const paymentRef = db.collection("payments").doc(order.id);
    const limitRef = db.collection("bookingLimits").doc(claim.booking.limitId);
    await db.runTransaction(async (transaction) => {
      const [bookingSnapshot, limitSnapshot] = await Promise.all([
        transaction.get(bookingRef),
        transaction.get(limitRef),
      ]);
      if (
        !bookingSnapshot.exists ||
        bookingSnapshot.data().orderClaimToken !== claim.claimToken ||
        !limitSnapshot.exists ||
        limitSnapshot.data().bookingId !== bookingId
      ) {
        throw paymentError(409, "The reservation changed while preparing payment.");
      }

      const createdAt = Timestamp.now();
      transaction.create(paymentRef, {
        gateway: "razorpay",
        razorpayOrderId: order.id,
        bookingId,
        customerId: uid,
        amount: claim.amount,
        amountInSubunits: claim.amountInSubunits,
        currency: "INR",
        status: "created",
        createdAt,
        updatedAt: createdAt,
      });
      transaction.update(bookingRef, {
        status: "payment_pending",
        razorpayOrderId: order.id,
        expiresAt: claim.checkoutExpiry,
        updatedAt: createdAt,
        orderClaimToken: FieldValue.delete(),
        orderClaimExpiresAt: FieldValue.delete(),
      });
      transaction.update(limitRef, {
        status: "payment_pending",
        expiresAt: claim.checkoutExpiry,
        updatedAt: createdAt,
      });
    });

    return {
      orderId: order.id,
      amount: claim.amountInSubunits,
      currency: "INR",
      keyId,
      bookingId,
      expiresAt: claim.checkoutExpiry.toDate().toISOString(),
    };
  } catch (error) {
    await releaseOrderClaim({ db, bookingRef, bookingId, claimToken }).catch(
      (releaseError) => {
        console.error("Could not release failed Razorpay order claim:", releaseError);
      },
    );
    throw error;
  }
}

async function releaseOrderClaim({ db, bookingRef, bookingId, claimToken }) {
  const now = Timestamp.now();
  await db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (
      !bookingSnapshot.exists ||
      bookingSnapshot.data().orderClaimToken !== claimToken
    ) {
      return;
    }
    const booking = bookingSnapshot.data();
    const limitRef = db.collection("bookingLimits").doc(booking.limitId);
    const limitSnapshot = await transaction.get(limitRef);
    transaction.update(bookingRef, {
      status: "payment_failed",
      expiresAt: now,
      updatedAt: now,
      orderClaimToken: FieldValue.delete(),
      orderClaimExpiresAt: FieldValue.delete(),
    });
    if (limitSnapshot.exists && limitSnapshot.data().bookingId === bookingId) {
      transaction.update(limitRef, { status: "payment_failed", expiresAt: now, updatedAt: now });
    }
  });
}

export async function getOwnedPayment(uid, bookingId) {
  const db = getDatabase();
  const bookingSnapshot = await db.collection("bookings").doc(bookingId).get();
  if (!bookingSnapshot.exists || bookingSnapshot.data().customerId !== uid) {
    throw paymentError(404, "Reservation not found.");
  }

  const booking = bookingSnapshot.data();
  const paymentSnapshot = booking.razorpayOrderId
    ? await db.collection("payments").doc(booking.razorpayOrderId).get()
    : null;
  return {
    booking,
    payment: paymentSnapshot?.exists ? paymentSnapshot.data() : null,
  };
}

async function markPaymentAuthorized(orderId, paymentId) {
  const db = getDatabase();
  const paymentRef = db.collection("payments").doc(orderId);
  const now = Timestamp.now();
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(paymentRef);
    if (!snapshot.exists || !canMarkPaymentAuthorized(snapshot.data().status)) return;
    transaction.update(paymentRef, {
      status: "authorized",
      razorpayPaymentId: paymentId,
      updatedAt: now,
    });
  });
}

async function applyCapturedPayment({
  orderId,
  paymentId,
  amount,
  currency,
  method,
  eventId,
}) {
  const db = getDatabase();
  const now = Timestamp.now();
  const paymentRef = db.collection("payments").doc(orderId);
  const eventRef = eventId
    ? db.collection("razorpayWebhookEvents").doc(eventId)
    : null;

  return db.runTransaction(async (transaction) => {
    const [paymentSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(paymentRef),
      eventRef ? transaction.get(eventRef) : Promise.resolve(null),
    ]);

    if (eventSnapshot?.exists) return { duplicate: true, paymentStatus: "processed" };
    if (!paymentSnapshot.exists) {
      if (eventRef) {
        transaction.create(eventRef, {
          eventId,
          type: "payment.captured",
          status: "ignored",
          receivedAt: now,
        });
      }
      return { duplicate: false, paymentStatus: "unknown_order" };
    }

    const payment = paymentSnapshot.data();
    const bookingRef = db.collection("bookings").doc(payment.bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) throw paymentError(409, "The booking for this payment is missing.");

    const booking = bookingSnapshot.data();
    const limitRef = db.collection("bookingLimits").doc(booking.limitId);
    const workshopRef = db.collection("workshops").doc(booking.workshopId);
    const ticketRef = db.collection("tickets").doc(payment.bookingId);
    const [limitSnapshot, workshopSnapshot, ticketSnapshot] = await Promise.all([
      transaction.get(limitRef),
      transaction.get(workshopRef),
      transaction.get(ticketRef),
    ]);

    if (eventRef) {
      transaction.create(eventRef, {
        eventId,
        type: "payment.captured",
        orderId,
        paymentId,
        status: "processed",
        receivedAt: now,
      });
    }
    if (payment.status === "captured") {
      const verifiedBooking =
        booking.status === "confirmed" &&
        booking.razorpayOrderId === orderId &&
        payment.razorpayOrderId === orderId &&
        payment.bookingId === bookingSnapshot.id &&
        payment.customerId === booking.customerId &&
        payment.amountInSubunits === amount &&
        payment.currency === currency &&
        payment.razorpayPaymentId === paymentId;
      if (verifiedBooking && !ticketSnapshot.exists) {
        transaction.create(
          ticketRef,
          createTicketRecord({
            booking,
            bookingId: bookingSnapshot.id,
            customerId: booking.customerId,
            issuedAt: payment.capturedAt || now,
          }),
        );
      }
      return {
        duplicate: true,
        paymentStatus: payment.status,
        bookingStatus: booking.status,
      };
    }

    if (payment.amountInSubunits !== amount || payment.currency !== currency) {
      transaction.update(paymentRef, {
        status: "refund_required",
        razorpayPaymentId: paymentId,
        updatedAt: now,
      });
      if (
        booking.status === "payment_pending" &&
        booking.razorpayOrderId === orderId
      ) {
        transaction.update(bookingRef, {
          status: "payment_failed",
          expiresAt: now,
          updatedAt: now,
        });
        if (limitSnapshot.exists && limitSnapshot.data().bookingId === bookingSnapshot.id) {
          transaction.update(limitRef, {
            status: "payment_failed",
            expiresAt: now,
            updatedAt: now,
          });
        }
      }
      return { duplicate: false, paymentStatus: "refund_required" };
    }

    const reservationIsCurrent =
      booking.status === "payment_pending" &&
      booking.razorpayOrderId === orderId &&
      booking.expiresAt instanceof Timestamp &&
      booking.expiresAt.toMillis() > now.toMillis() &&
      limitSnapshot.exists &&
      limitSnapshot.data().bookingId === bookingSnapshot.id &&
      workshopSnapshot.exists &&
      !registrationWindowError(workshopSnapshot.data(), now.toMillis());

    transaction.update(paymentRef, {
      status: reservationIsCurrent ? "captured" : "refund_required",
      razorpayPaymentId: paymentId,
      method: method || null,
      capturedAt: now,
      updatedAt: now,
    });

    if (!reservationIsCurrent) {
      if (booking.razorpayOrderId === orderId && booking.status === "payment_pending") {
        transaction.update(bookingRef, { status: "expired", updatedAt: now });
        if (limitSnapshot.exists && limitSnapshot.data().bookingId === bookingSnapshot.id) {
          transaction.update(limitRef, { status: "expired", expiresAt: now, updatedAt: now });
        }
      }
      return { duplicate: false, paymentStatus: "refund_required", bookingStatus: booking.status };
    }

    transaction.update(bookingRef, {
      status: "confirmed",
      confirmedAt: now,
      updatedAt: now,
    });
    transaction.update(limitRef, { status: "confirmed", updatedAt: now });
    transaction.update(workshopRef, {
      reservationVersion: (workshopSnapshot.data().reservationVersion || 0) + 1,
      updatedAt: now,
    });
    transaction.create(
      ticketRef,
      createTicketRecord({
        booking,
        bookingId: bookingSnapshot.id,
        customerId: booking.customerId,
        issuedAt: now,
      }),
    );
    return { duplicate: false, paymentStatus: "captured", bookingStatus: "confirmed" };
  });
}

export async function verifyCheckoutPayment(uid, {
  bookingId,
  orderId,
  paymentId,
  signature,
}) {
  const { booking, payment } = await getOwnedPayment(uid, bookingId);
  if (!payment || booking.razorpayOrderId !== orderId) {
    throw paymentError(400, "The payment does not match this reservation.");
  }
  if (!verifyCheckoutSignature(orderId, paymentId, signature, process.env.RAZORPAY_KEY_SECRET || "")) {
    throw paymentError(400, "Razorpay payment signature verification failed.");
  }

  const gateway = getRazorpay();
  const [gatewayOrder, gatewayPayment] = await Promise.all([
    gateway.orders.fetch(orderId),
    gateway.payments.fetch(paymentId),
  ]);
  if (
    gatewayOrder.id !== orderId ||
    gatewayOrder.amount !== payment.amountInSubunits ||
    gatewayOrder.currency !== "INR" ||
    gatewayPayment.order_id !== orderId ||
    gatewayPayment.amount !== payment.amountInSubunits ||
    gatewayPayment.currency !== "INR"
  ) {
    throw paymentError(400, "Razorpay payment details do not match the reservation.");
  }
  if (gatewayPayment.status !== "captured") {
    if (gatewayPayment.status === "failed") {
      return applyFailedPayment({
        orderId,
        paymentId,
        description: gatewayPayment.error_description,
        eventType: "checkout.verification",
      });
    }
    if (gatewayPayment.status === "authorized") {
      await markPaymentAuthorized(orderId, paymentId);
    }
    return {
      paymentStatus: gatewayPayment.status === "failed" ? "failed" : "pending",
      bookingStatus: booking.status,
    };
  }

  return applyCapturedPayment({
    orderId,
    paymentId,
    amount: gatewayPayment.amount,
    currency: gatewayPayment.currency,
    method: gatewayPayment.method,
  });
}

async function applyFailedPayment({ orderId, paymentId, description, eventId, eventType }) {
  const db = getDatabase();
  const now = Timestamp.now();
  const paymentRef = db.collection("payments").doc(orderId);
  const eventRef = eventId
    ? db.collection("razorpayWebhookEvents").doc(eventId)
    : null;

  return db.runTransaction(async (transaction) => {
    const [paymentSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(paymentRef),
      eventRef ? transaction.get(eventRef) : Promise.resolve(null),
    ]);
    if (eventSnapshot?.exists) return { duplicate: true };
    if (!paymentSnapshot.exists) {
      if (eventRef) {
        transaction.create(eventRef, {
          eventId,
          type: eventType,
          status: "ignored",
          receivedAt: now,
        });
      }
      return { duplicate: false };
    }

    const payment = paymentSnapshot.data();
    const bookingRef = db.collection("bookings").doc(payment.bookingId);
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists) throw paymentError(409, "The booking for this payment is missing.");
    const booking = bookingSnapshot.data();
    const limitRef = db.collection("bookingLimits").doc(booking.limitId);
    const limitSnapshot = await transaction.get(limitRef);

    if (eventRef) {
      transaction.create(eventRef, {
        eventId,
        type: eventType,
        orderId,
        paymentId,
        status: "processed",
        receivedAt: now,
      });
    }
    if (payment.status === "captured" || payment.status === "refund_required") {
      return {
        duplicate: true,
        paymentStatus: payment.status,
        bookingStatus: booking.status,
      };
    }

    transaction.update(paymentRef, {
      status: "failed",
      razorpayPaymentId: paymentId,
      failureDescription: description || null,
      updatedAt: now,
    });
    if (
      booking.status === "payment_pending" &&
      booking.razorpayOrderId === orderId
    ) {
      transaction.update(bookingRef, { status: "payment_failed", expiresAt: now, updatedAt: now });
      if (limitSnapshot.exists && limitSnapshot.data().bookingId === payment.bookingId) {
        transaction.update(limitRef, { status: "payment_failed", expiresAt: now, updatedAt: now });
      }
    }
    return {
      duplicate: false,
      paymentStatus: "failed",
      bookingStatus:
        booking.status === "payment_pending" && booking.razorpayOrderId === orderId
          ? "payment_failed"
          : booking.status,
    };
  });
}

export async function processRazorpayWebhook(eventId, event) {
  const type = event?.event;
  const payload = event?.payload || {};
  const paymentEntity = payload.payment?.entity;
  const orderEntity = payload.order?.entity;
  const orderId = paymentEntity?.order_id || orderEntity?.id;
  if (!orderId) {
    const db = getDatabase();
    await db.collection("razorpayWebhookEvents").doc(eventId).create({
      eventId,
      type: type || "unknown",
      status: "ignored",
      receivedAt: Timestamp.now(),
    }).catch((error) => {
      if (error.code !== 6) throw error;
    });
    return { status: "ignored" };
  }

  if (type === "payment.captured" || type === "order.paid") {
    if (!paymentEntity?.id || paymentEntity.status !== "captured") {
      throw paymentError(400, "Captured payment details are missing from the webhook.");
    }
    return applyCapturedPayment({
      orderId,
      paymentId: paymentEntity.id,
      amount: paymentEntity.amount,
      currency: paymentEntity.currency,
      method: paymentEntity.method,
      eventId,
    });
  }

  if (type === "payment.failed") {
    return applyFailedPayment({
      orderId,
      paymentId: paymentEntity?.id,
      description: paymentEntity?.error_description,
      eventId,
      eventType: type,
    });
  }

  if (type === "payment.authorized") {
    const db = getDatabase();
    const now = Timestamp.now();
    const paymentRef = db.collection("payments").doc(orderId);
    const eventRef = db.collection("razorpayWebhookEvents").doc(eventId);
    return db.runTransaction(async (transaction) => {
      const [paymentSnapshot, eventSnapshot] = await Promise.all([
        transaction.get(paymentRef),
        transaction.get(eventRef),
      ]);
      if (eventSnapshot.exists) return { duplicate: true, status: "pending" };
      transaction.create(eventRef, {
        eventId,
        type,
        orderId,
        paymentId: paymentEntity?.id || null,
        status: paymentSnapshot.exists ? "processed" : "ignored",
        receivedAt: now,
      });
      if (
        paymentSnapshot.exists &&
        canMarkPaymentAuthorized(paymentSnapshot.data().status)
      ) {
        transaction.update(paymentRef, {
          status: "authorized",
          razorpayPaymentId: paymentEntity?.id || null,
          updatedAt: now,
        });
      }
      return { duplicate: false, status: "pending" };
    });
  }

  const db = getDatabase();
  await db.collection("razorpayWebhookEvents").doc(eventId).create({
    eventId,
    type: type || "unknown",
    orderId,
    status: "ignored",
    receivedAt: Timestamp.now(),
  }).catch((error) => {
    if (error.code !== 6) throw error;
  });
  return { status: "ignored" };
}

export async function cancelPaymentCheckout(uid, bookingId) {
  const { booking, payment } = await getOwnedPayment(uid, bookingId);
  if (booking.status === "confirmed") return { status: "confirmed" };
  if (!payment || !booking.razorpayOrderId) {
    return releaseUnpaidReservation(uid, bookingId, "cancelled");
  }

  const gateway = getRazorpay();
  const paymentList = await gateway.orders.fetchPayments(booking.razorpayOrderId);
  const payments = paymentList.items || [];
  const captured = payments.find((item) => item.status === "captured");
  if (captured) {
    const result = await applyCapturedPayment({
      orderId: booking.razorpayOrderId,
      paymentId: captured.id,
      amount: captured.amount,
      currency: captured.currency,
      method: captured.method,
    });
    return { status: result.bookingStatus || result.paymentStatus };
  }
  if (payments.some((item) => item.status === "authorized")) {
    return { status: "pending" };
  }
  if (payments.some((item) => item.status === "failed")) {
    const failedResult = await applyFailedPayment({
      orderId: booking.razorpayOrderId,
      paymentId: payments.find((item) => item.status === "failed")?.id,
      description: "Payment failed or checkout was abandoned.",
      eventId: `cancel-${booking.razorpayOrderId}`,
      eventType: "checkout.cancelled",
    });
    return { status: failedResult.bookingStatus || failedResult.paymentStatus };
  }
  return releaseUnpaidReservation(uid, bookingId, "cancelled");
}

async function releaseUnpaidReservation(uid, bookingId, status) {
  const db = getDatabase();
  const now = Timestamp.now();
  const bookingRef = db.collection("bookings").doc(bookingId);
  return db.runTransaction(async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists || bookingSnapshot.data().customerId !== uid) {
      throw paymentError(404, "Reservation not found.");
    }
    const booking = bookingSnapshot.data();
    if (booking.status === "confirmed") return { status: "confirmed" };
    if (booking.status !== "payment_pending" && booking.status !== "order_creating") {
      return { status: booking.status };
    }
    const limitRef = db.collection("bookingLimits").doc(booking.limitId);
    const [paymentSnapshot, limitSnapshot] = await Promise.all([
      booking.razorpayOrderId
        ? transaction.get(db.collection("payments").doc(booking.razorpayOrderId))
        : Promise.resolve(null),
      transaction.get(limitRef),
    ]);
    if (paymentSnapshot?.exists && paymentSnapshot.data().status === "captured") {
      return { status: "confirmed" };
    }

    transaction.update(bookingRef, {
      status,
      expiresAt: now,
      updatedAt: now,
      orderClaimToken: FieldValue.delete(),
      orderClaimExpiresAt: FieldValue.delete(),
    });
    if (limitSnapshot.exists && limitSnapshot.data().bookingId === bookingId) {
      transaction.update(limitRef, { status, expiresAt: now, updatedAt: now });
    }
    if (paymentSnapshot?.exists && paymentSnapshot.data().status !== "failed") {
      transaction.update(paymentSnapshot.ref, { status: "cancelled", updatedAt: now });
    }
    return { status };
  });
}

export async function getPaymentStatus(uid, bookingId) {
  const { booking, payment } = await getOwnedPayment(uid, bookingId);
  let bookingStatus = booking.status;
  if (
    ["reserved", "order_creating", "payment_pending"].includes(bookingStatus) &&
    booking.expiresAt instanceof Timestamp &&
    booking.expiresAt.toMillis() <= Date.now()
  ) {
    bookingStatus = "expired";
  }
  return {
    bookingId,
    bookingStatus,
    paymentStatus: payment?.status || "not_started",
    expiresAt: booking.expiresAt?.toDate?.().toISOString() || null,
  };
}
