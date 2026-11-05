import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { bookingApi, formatWorkshopDate } from "../booking/api.js";
import {
  formatReservationCountdown,
  getReservationStatus,
} from "../booking/reservationStatus.js";
import { validateCheckoutOrder } from "../booking/checkoutOrder.js";
import { loadRazorpayCheckout } from "../booking/razorpay.js";
import Navbar from "../components/Navbar.jsx";
import { formatINR } from "../data/siteData.js";

const statusLabels = {
  pending: "Pending Payment",
  expired: "Expired",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

function formatTime(reservation) {
  return [reservation.start, reservation.end].filter(Boolean).join("–") || "Time to be confirmed";
}

export default function MyReservationsPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  const loadReservations = useCallback(async () => {
    setError("");
    try {
      const result = await bookingApi("/bookings/mine", user);
      setReservations(result.bookings || []);
    } catch (loadError) {
      setError(loadError.message || "Could not load your reservations.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadReservations();
    const refreshInterval = window.setInterval(loadReservations, 30_000);
    const updateCountdown = window.setInterval(() => setNow(Date.now()), 1000);
    const refreshOnFocus = () => loadReservations();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(refreshInterval);
      window.clearInterval(updateCountdown);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [loadReservations]);

  async function handleCancel(reservation) {
    if (
      !window.confirm(
        "Cancel this unpaid reservation and release your held seat?",
      )
    ) {
      return;
    }
    setBusyId(reservation.id);
    setError("");
    setNotice("");
    try {
      const result = await bookingApi(
        `/payments/${encodeURIComponent(reservation.id)}/cancel`,
        user,
        { method: "POST", body: JSON.stringify({}) },
      );
      setNotice(
        result.status === "pending"
          ? "A payment authorization is still processing. Your seat remains held temporarily."
          : result.status === "confirmed"
            ? "Payment was confirmed. Your ticket is available in My Tickets."
            : "Reservation cancelled and seat released.",
      );
      await loadReservations();
    } catch (cancelError) {
      setError(cancelError.message || "Could not cancel this reservation.");
    } finally {
      setBusyId("");
    }
  }

  async function handlePaymentResult(reservation, result) {
    try {
      const verified = await bookingApi("/payments/verify", user, {
        method: "POST",
        body: JSON.stringify({ bookingId: reservation.id, ...result }),
      });
      setNotice(
        verified.bookingStatus === "confirmed" || verified.paymentStatus === "captured"
          ? "Payment verified. Your booking is confirmed."
          : "Payment is processing. Check your reservation status again shortly.",
      );
    } catch (verificationError) {
      try {
        const status = await bookingApi(
          `/payments/${encodeURIComponent(reservation.id)}/status`,
          user,
        );
        setNotice(
          status.bookingStatus === "confirmed" || status.paymentStatus === "captured"
            ? "Payment verified. Your booking is confirmed."
            : "Payment status is " +
              `${status.paymentStatus.replaceAll("_", " ")}. Do not pay again while it is processing.`,
        );
      } catch {
        setError(
          verificationError.message ||
            "Payment verification is pending. Please check your reservation status shortly.",
        );
      }
    } finally {
      await loadReservations();
    }
  }

  async function handleContinuePayment(reservation) {
    setBusyId(reservation.id);
    setError("");
    setNotice("");
    try {
      const response = await bookingApi("/payments/orders", user, {
        method: "POST",
        body: JSON.stringify({ bookingId: reservation.id }),
      });
      if (response.alreadyPaid) {
        setNotice("This booking is already confirmed. Your ticket is in My Tickets.");
        await loadReservations();
        return;
      }
      const order = validateCheckoutOrder(response, reservation.id);
      await loadRazorpayCheckout();
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Mend and Blend",
        description: `${reservation.workshopName || "Workshop"} workshop`,
        order_id: order.orderId,
        prefill: {
          name: reservation.participant?.fullName || "",
          email: reservation.participant?.email || user.email || "",
          contact: reservation.participant?.phone || "",
        },
        notes: { bookingId: reservation.id },
        theme: { color: "#405F80" },
        modal: {
          ondismiss: async () => {
            try {
              const status = await bookingApi(
                `/payments/${encodeURIComponent(reservation.id)}/cancel`,
                user,
                { method: "POST", body: JSON.stringify({}) },
              );
              setNotice(
                status.status === "confirmed"
                  ? "Payment was confirmed. Your ticket is in My Tickets."
                  : status.status === "pending"
                    ? "Payment authorization is still processing; your seat remains held temporarily."
                    : "Checkout closed and the unpaid reservation was released.",
              );
              await loadReservations();
            } catch (cancelError) {
              setError(cancelError.message || "Could not update the checkout status.");
            }
          },
        },
        handler: (result) => handlePaymentResult(reservation, result),
      });
      checkout.on("payment.failed", async (failure) => {
        setNotice(
          failure.error?.description ||
            "Payment failed. Your reservation will be released after the failure is confirmed.",
        );
        try {
          await bookingApi(
            `/payments/${encodeURIComponent(reservation.id)}/cancel`,
            user,
            { method: "POST", body: JSON.stringify({}) },
          );
          await loadReservations();
        } catch (cancelError) {
          setError(cancelError.message || "Could not update the failed payment status.");
        }
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message || "Could not start Razorpay Checkout.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:py-16">
        <header className="mt-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
            Customer account
          </p>
          <h1 className="mt-3 text-4xl font-medium">My Reservations</h1>
          <p className="mt-3 text-charcoal/75">
            View your seat holds, continue payment, or review confirmed bookings.
          </p>
        </header>

        {error && <p className="mt-6 text-sm text-red-800" role="alert">{error}</p>}
        {notice && <p className="mt-6 rounded-xl bg-white/80 p-4 text-sm" role="status">{notice}</p>}
        {loading && <p className="mt-8" role="status">Loading your reservations…</p>}
        {!loading && !error && reservations.length === 0 && (
          <p className="mt-8 rounded-2xl bg-white/70 p-6">
            You do not have any reservations yet. Browse{" "}
            <Link to="/#workshops" className="font-medium underline">upcoming workshops</Link>.
          </p>
        )}

        <ul className="mt-8 grid gap-5">
          {reservations.map((reservation) => {
            const status = getReservationStatus(reservation, now);
            const active = status === "pending";
            return (
              <li
                key={reservation.id}
                className="rounded-3xl border border-brand-blue/15 bg-white/85 p-6 shadow-sm sm:p-8"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-medium">
                      {reservation.workshopName || "Workshop reservation"}
                    </h2>
                    <p className="mt-2 text-sm text-charcoal/75">
                      {reservation.sessionDate
                        ? formatWorkshopDate(reservation.sessionDate)
                        : "Date to be confirmed"}{" "}
                      · {formatTime(reservation)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      status === "confirmed"
                        ? "bg-brand-blue text-white"
                        : "bg-brand-blue/10 text-brand-blue"
                    }`}
                  >
                    {statusLabels[status]}
                  </span>
                </div>

                <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold">Amount</dt>
                    <dd className="mt-1">{formatINR(reservation.amount || 0)}</dd>
                  </div>
                  {active && reservation.expiresAt && (
                    <div>
                      <dt className="font-semibold">Reservation expires in</dt>
                      <dd className="mt-1 font-medium tabular-nums">
                        {formatReservationCountdown(reservation.expiresAt, now)}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6 flex flex-wrap gap-3">
                  {active && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleContinuePayment(reservation)}
                        disabled={busyId === reservation.id}
                        className="rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-60"
                      >
                        {busyId === reservation.id ? "Opening checkout…" : "Continue Payment"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(reservation)}
                        disabled={busyId === reservation.id}
                        className="rounded-full border border-brand-blue/40 px-5 py-3 text-sm font-medium hover:bg-brand-blue/5 disabled:opacity-60"
                      >
                        Cancel reservation
                      </button>
                    </>
                  )}
                  {status === "confirmed" && (
                    <Link
                      to="/my-tickets"
                      className="rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-white hover:bg-brand-blue/90"
                    >
                      View My Tickets
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
