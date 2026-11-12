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

const statusBadgeStyles = {
  confirmed: "border-sage/60 bg-sage/30 text-sage-dark dark:border-sage/45 dark:bg-sage/18 dark:text-sage",
  pending: "border-gold/70 bg-gold/25 text-[#6B4D16] dark:border-gold/45 dark:bg-gold/15 dark:text-gold",
  expired: "border-terracotta/45 bg-terracotta/15 text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]",
  cancelled: "border-terracotta/45 bg-terracotta/15 text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]",
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
      <div className="min-h-screen bg-gradient-to-b from-brand-ivory via-sage/12 to-brand-ivory dark:from-[#181E22] dark:via-[#1B2429] dark:to-[#181E22]">
        <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          <header className="mt-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark dark:text-sage">
              <span className="h-px w-5 bg-terracotta" aria-hidden="true" />
              Customer account
            </p>
            <h1 className="mt-3 text-4xl font-medium text-brand-blue dark:text-[#96B7DA]">My Reservations</h1>
            <p className="mt-3 text-charcoal/75 dark:text-[#C5CCD1]">
              View your seat holds, continue payment, or review confirmed bookings.
            </p>
          </header>

          {error && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-6 rounded-2xl border border-sage/60 bg-sage/20 p-4 text-sm text-charcoal dark:border-sage/45 dark:bg-sage/15 dark:text-[#E8ECEF]" role="status">
              {notice}
            </p>
          )}
          {loading && <p className="mt-8 text-charcoal/75 dark:text-[#C5CCD1]" role="status">Loading your reservations…</p>}
          {!loading && !error && reservations.length === 0 && (
            <p className="mt-8 rounded-2xl border border-sage/40 bg-white p-6 text-charcoal/80 shadow-xs dark:border-white/10 dark:bg-[#21292E] dark:text-[#C5CCD1]">
              You do not have any reservations yet. Browse{" "}
              <Link to="/#workshops" className="font-medium text-terracotta-dark underline underline-offset-4 hover:text-brand-blue dark:text-[#F09E88] dark:hover:text-[#96B7DA]">
                upcoming workshops
              </Link>.
            </p>
          )}

          <ul className="mt-8 grid gap-5">
            {reservations.map((reservation) => {
              const status = getReservationStatus(reservation, now);
              const active = status === "pending";
              return (
                <li
                  key={reservation.id}
                  className="rounded-3xl border border-charcoal/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#21292E] dark:shadow-black/30 sm:p-8"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-medium text-brand-blue dark:text-[#96B7DA]">
                        {reservation.workshopName || "Workshop reservation"}
                      </h2>
                      <p className="mt-2 text-sm text-charcoal/75 dark:text-[#C5CCD1]">
                        {reservation.sessionDate
                          ? formatWorkshopDate(reservation.sessionDate)
                          : "Date to be confirmed"}{" "}
                        · {formatTime(reservation)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusBadgeStyles[status] || "border-brand-blue/25 bg-brand-blue/10 text-brand-blue dark:border-[#96B7DA]/30 dark:bg-[#96B7DA]/12 dark:text-[#96B7DA]"
                      }`}
                    >
                      {statusLabels[status]}
                    </span>
                  </div>

                  <dl className="mt-5 grid gap-4 border-t border-charcoal/8 pt-5 text-sm dark:border-white/10 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Amount</dt>
                      <dd className="mt-1 font-serif text-2xl font-semibold text-brand-blue dark:text-[#96B7DA]">
                        {formatINR(reservation.amount || 0)}
                      </dd>
                    </div>
                    {active && reservation.expiresAt && (
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">
                          Reservation expires in
                        </dt>
                        <dd className="mt-1 text-lg font-semibold text-terracotta-dark tabular-nums dark:text-[#F09E88]">
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
                          className="btn-interactive rounded-full bg-terracotta-dark px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#9D4D38] hover:shadow-[0_10px_22px_-8px_rgba(181,91,68,0.42)] disabled:opacity-60"
                        >
                          {busyId === reservation.id ? "Opening checkout…" : "Continue Payment"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(reservation)}
                          disabled={busyId === reservation.id}
                          className="btn-interactive rounded-full border border-charcoal/25 px-5 py-3 text-sm font-medium text-charcoal hover:border-terracotta/50 hover:bg-terracotta/10 hover:text-terracotta-dark disabled:opacity-60 dark:border-white/20 dark:text-[#E8ECEF] dark:hover:border-terracotta/50 dark:hover:bg-terracotta/15 dark:hover:text-[#F09E88]"
                        >
                          Cancel reservation
                        </button>
                      </>
                    )}
                    {status === "confirmed" && (
                      <Link
                        to="/my-tickets"
                        className="btn-interactive rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.42)] dark:hover:bg-[#324D69]"
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
      </div>
    </>
  );
}
