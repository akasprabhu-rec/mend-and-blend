import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../auth/AuthContext.jsx";
import { db } from "../firebase.js";
import { downloadTicket } from "../tickets/downloadTicket.js";

function formatDate(date) {
  if (!date) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));
}

export default function MyTicketsPage() {
  const { user, profileError } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [qrCodes, setQrCodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTickets() {
      try {
        const ticketsQuery = query(
          collection(db, "tickets"),
          where("customerId", "==", user.uid),
        );
        const snapshot = await getDocs(ticketsQuery);
        if (active) {
          setTickets(
            snapshot.docs
              .map((ticket) => ({ id: ticket.id, ...ticket.data() }))
              .sort((a, b) => {
                const first = a.sessionDate || "";
                const second = b.sessionDate || "";
                return first.localeCompare(second) || (a.start || "").localeCompare(b.start || "");
              }),
          );
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Could not load your tickets.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTickets();
    return () => {
      active = false;
    };
  }, [user.uid]);

  useEffect(() => {
    let active = true;

    async function renderQRCodes() {
      try {
        const { default: QRCode } = await import("qrcode");
        const entries = await Promise.all(
          tickets
            .filter((ticket) => ticket.qrToken)
            .map(async (ticket) => [
              ticket.id,
              await QRCode.toDataURL(ticket.qrToken, {
                errorCorrectionLevel: "H",
                margin: 2,
                width: 280,
                color: { dark: "#405F80", light: "#FFFFFF" },
              }),
            ]),
        );
        if (active) setQrCodes(Object.fromEntries(entries));
      } catch {
        if (active) setError("A ticket QR code could not be generated. Please reload this page.");
      }
    }

    renderQRCodes();
    return () => {
      active = false;
    };
  }, [tickets]);

  async function handleDownload(ticket) {
    setDownloading(ticket.id);
    setDownloadError("");
    try {
      await downloadTicket(ticket, user.displayName);
    } catch (downloadFailure) {
      setDownloadError(downloadFailure.message || "Could not create the ticket PDF.");
    } finally {
      setDownloading("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:py-16">
      <Link to="/" className="text-sm font-medium text-olive-dark hover:underline">
        ← Back to Mend and Blend
      </Link>
      <header className="mt-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
          Customer account
        </p>
        <h1 className="mt-3 text-4xl font-medium">My tickets</h1>
        <p className="mt-3 text-charcoal/75">Signed in as {user.email || user.displayName}.</p>
      </header>

      {profileError && (
        <p className="mt-6 rounded-2xl border border-rose p-4 text-sm" role="alert">
          Your profile could not be synced to Firestore: {profileError}
        </p>
      )}
      {error && <p className="mt-6 text-sm text-red-800" role="alert">{error}</p>}
      {downloadError && (
        <p className="mt-6 text-sm text-red-800" role="alert">{downloadError}</p>
      )}
      {loading && <p className="mt-8" role="status">Loading your tickets…</p>}
      {!loading && !error && tickets.length === 0 && (
        <p className="mt-8 rounded-2xl bg-white/70 p-6">
          You do not have any tickets yet. After your payment is verified, your workshop ticket
          will appear here.
        </p>
      )}

      <ul className="mt-8 grid gap-6">
        {tickets.map((ticket) => {
          const valid = ticket.isValid === true && ticket.status === "valid";
          return (
            <li
              key={ticket.id}
              className="overflow-hidden rounded-[2rem] border border-rose/30 bg-white/80 shadow-sm"
            >
              <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive-dark">
                      Mend and Blend
                    </p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        valid ? "bg-brand-blue text-white" : "bg-brand-blue/10 text-brand-blue"
                      }`}
                    >
                      {valid ? "Valid ticket" : "Not valid"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-3xl font-medium">
                    {ticket.workshopName || "Workshop ticket"}
                  </h2>
                  <p className="mt-2 text-sm text-charcoal/75">
                    For {ticket.customerName || user.displayName || "Guest"}
                  </p>
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-olive-dark">Date</dt>
                      <dd className="mt-1">{formatDate(ticket.sessionDate)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-olive-dark">Time</dt>
                      <dd className="mt-1">
                        {[ticket.start, ticket.end].filter(Boolean).join(" - ") ||
                          "Time to be confirmed"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-olive-dark">Venue</dt>
                      <dd className="mt-1">{ticket.venue || "Venue details to be confirmed"}</dd>
                    </div>
                  </dl>
                  <p className="mt-5 text-xs text-charcoal/60">
                    Issued{" "}
                    {ticket.issuedAt?.toDate
                      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                          ticket.issuedAt.toDate(),
                        )
                      : "after payment verification"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownload(ticket)}
                    disabled={!ticket.qrToken || downloading === ticket.id}
                    className="mt-6 rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {downloading === ticket.id ? "Preparing PDF…" : "Download ticket PDF"}
                  </button>
                </div>

                <div className="mx-auto flex min-h-44 min-w-44 flex-col items-center justify-center rounded-3xl bg-ivory p-4">
                  {qrCodes[ticket.id] ? (
                    <img
                      src={qrCodes[ticket.id]}
                      alt={`Secure entry QR code for ${ticket.workshopName || "your workshop"}`}
                      className="h-36 w-36"
                    />
                  ) : (
                    <p className="max-w-36 text-center text-xs text-charcoal/60">
                      {ticket.qrToken ? "Preparing secure QR code…" : "QR code unavailable"}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-charcoal/65">Show at entry</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
