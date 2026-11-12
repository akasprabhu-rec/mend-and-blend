import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../auth/AuthContext.jsx";
import { db } from "../firebase.js";
import Navbar from "../components/Navbar.jsx";
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
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-brand-ivory via-sage/12 to-brand-ivory dark:from-[#181E22] dark:via-[#1B2429] dark:to-[#181E22]">
        <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          <header className="mt-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark dark:text-sage">
              <span className="h-px w-5 bg-terracotta" aria-hidden="true" />
              Customer account
            </p>
            <h1 className="mt-3 text-4xl font-medium text-brand-blue dark:text-[#96B7DA]">My tickets</h1>
            <p className="mt-3 text-charcoal/75 dark:text-[#C5CCD1]">Signed in as {user.email || user.displayName}.</p>
          </header>

          {profileError && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" role="alert">
              Your profile could not be synced to Firestore: {profileError}
            </p>
          )}
          {error && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" role="alert">
              {error}
            </p>
          )}
          {downloadError && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" role="alert">
              {downloadError}
            </p>
          )}
          {loading && <p className="mt-8 text-charcoal/75 dark:text-[#C5CCD1]" role="status">Loading your tickets…</p>}
          {!loading && !error && tickets.length === 0 && (
            <p className="mt-8 rounded-2xl border border-sage/40 bg-white p-6 text-charcoal/80 shadow-xs dark:border-white/10 dark:bg-[#21292E] dark:text-[#C5CCD1]">
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
                  className={`overflow-hidden rounded-3xl border border-charcoal/10 border-t-4 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#21292E] dark:shadow-black/30 ${
                    valid ? "border-t-brand-blue dark:border-t-[#96B7DA]" : "border-t-charcoal/30 dark:border-t-white/25"
                  }`}
                >
                  <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark dark:text-sage">
                          Mend and Blend
                        </p>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            valid
                              ? "border-sage/60 bg-sage/30 text-sage-dark dark:border-sage/45 dark:bg-sage/18 dark:text-sage"
                              : "border-terracotta/45 bg-terracotta/15 text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]"
                          }`}
                        >
                          {valid ? "Valid ticket" : "Not valid"}
                        </span>
                      </div>
                      <h2 className="mt-3 text-3xl font-medium text-brand-blue dark:text-[#96B7DA]">
                        {ticket.workshopName || "Workshop ticket"}
                      </h2>
                      <p className="mt-2 text-sm text-charcoal/75 dark:text-[#C5CCD1]">
                        For {ticket.customerName || user.displayName || "Guest"}
                      </p>
                      <dl className="mt-5 grid gap-4 border-t border-charcoal/8 pt-5 text-sm dark:border-white/10 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Date</dt>
                          <dd className="mt-1 font-medium text-charcoal dark:text-[#E8ECEF]">{formatDate(ticket.sessionDate)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Time</dt>
                          <dd className="mt-1 font-medium text-charcoal dark:text-[#E8ECEF]">
                            {[ticket.start, ticket.end].filter(Boolean).join(" - ") ||
                              "Time to be confirmed"}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Venue</dt>
                          <dd className="mt-1 text-charcoal/85 dark:text-[#C5CCD1]">{ticket.venue || "Venue details to be confirmed"}</dd>
                        </div>
                      </dl>
                      <p className="mt-5 text-xs text-charcoal/60 dark:text-[#9DA7AE]">
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
                        className="btn-interactive mt-6 rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.42)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#324D69]"
                      >
                        {downloading === ticket.id ? "Preparing PDF…" : "Download ticket PDF"}
                      </button>
                    </div>

                    <div className="mx-auto flex min-h-44 min-w-44 flex-col items-center justify-center rounded-2xl border border-sage/40 bg-brand-ivory p-4 dark:border-white/15 dark:bg-[#192024]">
                      {qrCodes[ticket.id] ? (
                        <div className="rounded-xl bg-white p-1.5 shadow-xs">
                          <img
                            src={qrCodes[ticket.id]}
                            alt={`Secure entry QR code for ${ticket.workshopName || "your workshop"}`}
                            className="h-36 w-36 rounded-lg"
                          />
                        </div>
                      ) : (
                        <p className="max-w-36 text-center text-xs text-charcoal/60 dark:text-[#9DA7AE]">
                          {ticket.qrToken ? "Preparing secure QR code…" : "QR code unavailable"}
                        </p>
                      )}
                      <p className="mt-2 text-xs font-medium text-sage-dark dark:text-sage">Show at entry</p>
                    </div>
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
