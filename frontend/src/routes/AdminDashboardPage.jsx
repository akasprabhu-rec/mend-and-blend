import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import AdminTicketScanner from "../components/admin/AdminTicketScanner.jsx";
import AdminEventsSection from "../components/admin/AdminEventsSection.jsx";
import AdminAdminsSection from "../components/admin/AdminAdminsSection.jsx";
import { bookingApi, formatWorkshopDate } from "../booking/api.js";
import { formatINR } from "../data/siteData.js";

const initialSummary = {
  totalRegistrations: 0,
  successfulPayments: 0,
  totalRevenue: 0,
  availableSeats: 0,
  bookedSeats: 0,
  activeEvents: 0,
  unpublishedEvents: 0,
};

function csvCell(value) {
  const text = String(value ?? "");
  const safeText = /^[\u0000-\u0020]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function exportRegistrations(registrations) {
  const headers = [
    "Customer name",
    "Email",
    "Phone",
    "Workshop",
    "Session date",
    "Start time",
    "End time",
    "Booking status",
    "Payment status",
    "Ticket status",
    "Created at",
    "Booking ID",
  ];
  const rows = registrations.map((registration) => [
    registration.customerName,
    registration.email,
    registration.phone,
    registration.workshopName,
    registration.sessionDate,
    registration.start,
    registration.end,
    registration.bookingStatus,
    registration.paymentStatus,
    registration.ticketStatus,
    registration.createdAt,
    registration.bookingId,
  ]);
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mend-and-blend-registrations.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function Metric({ label, value, note }) {
  return (
    <article className="rounded-[1.5rem] border border-rose/25 bg-white/80 p-5 shadow-sm">
      <p className="text-sm text-charcoal/70">{label}</p>
      <p className="mt-2 text-3xl font-medium">{value}</p>
      {note && <p className="mt-1 text-xs text-charcoal/60">{note}</p>}
    </article>
  );
}

export default function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({
    summary: initialSummary,
    workshops: [],
    registrations: [],
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [scanToken, setScanToken] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [registrationFilters, setRegistrationFilters] = useState({
    eventId: "all",
    date: "all",
    paymentStatus: "all",
  });
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const loadDashboard = useCallback(async (term = search) => {
    setLoading(true);
    setError("");
    try {
      const result = await bookingApi(
        `/admin/dashboard?search=${encodeURIComponent(term)}`,
        user,
      );
      setDashboard(result);
    } catch (loadError) {
      setError(loadError.message || "Could not load the admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, [search, user]);

  useEffect(() => {
    const timeout = window.setTimeout(() => loadDashboard(), 250);
    return () => window.clearTimeout(timeout);
  }, [loadDashboard]);

  const displayedRegistrations = useMemo(
    () => dashboard.registrations.filter((registration) =>
      (registrationFilters.eventId === "all" || registration.workshopId === registrationFilters.eventId) &&
      (registrationFilters.date === "all" || registration.sessionDate === registrationFilters.date) &&
      (registrationFilters.paymentStatus === "all" || registration.paymentStatus === registrationFilters.paymentStatus),
    ),
    [dashboard.registrations, registrationFilters],
  );
  const originalWorkshops = useMemo(
    () => dashboard.workshops.filter((workshop) => workshop.eventType !== "managed_event"),
    [dashboard.workshops],
  );
  const dashboardSections = [
    ["overview", "Overview"],
    ["workshop-sessions", "Workshop sessions"],
    ["manage-events", "Manage events"],
    ["registrations", "Registrations"],
    ["ticket-scanner", "Ticket scanner"],
    ...(dashboard.adminRole === "super_admin" ? [["manage-admins", "Manage admins"]] : []),
  ];

  async function setPublished(workshop, published) {
    setBusy(workshop.id);
    setError("");
    setMessage("");
    try {
      await bookingApi(`/admin/workshops/${encodeURIComponent(workshop.id)}/publication`, user, {
        method: "PATCH",
        body: JSON.stringify({ published }),
      });
      setMessage(
        `${workshop.title} on ${formatWorkshopDate(workshop.date)} is now ${
          published ? "published" : "unpublished"
        }.`,
      );
      await loadDashboard();
    } catch (updateError) {
      setError(updateError.message || "Could not update publication status.");
    } finally {
      setBusy("");
    }
  }

  async function seedWorkshops() {
    setBusy("seed");
    setError("");
    try {
      const result = await bookingApi("/admin/workshops/seed", user, { method: "POST" });
      setMessage(result.message);
      await loadDashboard();
    } catch (seedError) {
      setError(seedError.message || "Could not initialize workshop sessions.");
    } finally {
      setBusy("");
    }
  }

  const redeemScannedTicket = useCallback(async (qrToken) => {
    setScanToken(qrToken);
    setScanResult(null);
    setError("");
    try {
      const result = await bookingApi("/admin/tickets/redeem", user, {
        method: "POST",
        body: JSON.stringify({ qrToken }),
      });
      setScanResult(result);
    } catch (scanError) {
      setScanResult({
        status: "invalid",
        message: scanError.message || "Could not validate this ticket.",
      });
    }
  }, [user]);

  async function redeemManualTicket(event) {
    event.preventDefault();
    await redeemScannedTicket(scanToken.trim());
  }

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/admin/login", { replace: true });
    } catch (signOutError) {
      setError(signOutError.message || "Could not sign out.");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10 sm:py-14">
      <header className="flex min-w-0 flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <Link to="/" className="text-sm font-medium text-olive-dark hover:underline">
            ← Mend and Blend
          </Link>
          <p className="mt-7 text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
            Administrator dashboard
          </p>
          <h1 className="mt-2 break-words text-3xl font-medium sm:text-5xl">Workshop operations</h1>
          <p className="mt-3 break-words text-sm text-charcoal/70">
            Signed in as {user.email || user.displayName}. Payments are verified automatically;
            administrators cannot change payment status.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-charcoal/40 px-5 py-2 text-sm font-medium hover:bg-charcoal hover:text-ivory"
        >
          Sign out
        </button>
      </header>

      {error && <p className="mt-6 rounded-2xl border border-rose bg-white/80 p-4" role="alert">{error}</p>}
      {message && <p className="mt-6 rounded-2xl bg-sage/40 p-4" role="status">{message}</p>}

      <nav aria-label="Admin dashboard sections" className="sticky top-0 z-10 mt-7 rounded-2xl border border-rose/20 bg-ivory/95 p-3 backdrop-blur">
        <div className="flex items-center justify-between md:hidden">
          <span className="text-sm font-medium">Dashboard sections</span>
          <button
            type="button"
            className="rounded-full border border-charcoal/20 px-4 text-sm font-medium"
            aria-expanded={mobileNavOpen}
            aria-controls="admin-mobile-sections"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? "Close menu" : "Menu"}
          </button>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          {dashboardSections.map(([id, label]) => (
            <a key={id} className="flex min-h-11 items-center rounded-full px-3 text-sm hover:bg-sage/40" href={`#${id}`}>
              {label}
            </a>
          ))}
        </div>
        {mobileNavOpen && (
          <div id="admin-mobile-sections" className="mt-2 grid gap-1 border-t border-charcoal/10 pt-2 md:hidden">
            {dashboardSections.map(([id, label]) => (
              <a
                key={id}
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-sage/40"
                href={`#${id}`}
                onClick={() => setMobileNavOpen(false)}
              >
                {label}
              </a>
            ))}
          </div>
        )}
      </nav>

      <section id="overview" aria-label="Dashboard overview" className="mt-8 scroll-mt-24 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total registrations" value={dashboard.summary.totalRegistrations} note="Confirmed bookings" />
        <Metric label="Successful payments" value={dashboard.summary.successfulPayments} note="Captured by Razorpay" />
        <Metric label="Total revenue" value={formatINR(dashboard.summary.totalRevenue)} note="Verified captured payments" />
        <Metric label="Booked seats" value={dashboard.summary.bookedSeats} note="Confirmed plus active holds" />
        <Metric label="Available seats" value={dashboard.summary.availableSeats} note="Across all events" />
        <Metric label="Active events" value={dashboard.summary.activeEvents} note="Published events" />
        <Metric label="Unpublished events" value={dashboard.summary.unpublishedEvents} note="Draft and unpublished" />
      </section>

      <section id="workshop-sessions" className="mt-12 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive-dark">Schedule</p>
            <h2 className="mt-2 text-3xl font-medium">Workshop sessions</h2>
          </div>
          <p className="max-w-xl text-sm text-charcoal/70">
            These are the original six Mend and Blend sessions. The event manager below handles
            future events without changing these records.
          </p>
        </div>
        {originalWorkshops.length === 0 && !loading && (
          <div className="mt-5 rounded-[1.5rem] bg-white/80 p-6">
            <p>No sessions are initialized yet.</p>
            <button
              type="button"
              onClick={seedWorkshops}
              disabled={busy !== ""}
              className="mt-4 rounded-full bg-charcoal px-5 py-3 text-sm font-medium text-ivory disabled:opacity-50"
            >
              {busy === "seed" ? "Initializing…" : "Initialize six sessions"}
            </button>
          </div>
        )}
        {loading && <p className="mt-5" role="status">Refreshing dashboard…</p>}
        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {originalWorkshops.map((workshop) => (
            <article key={workshop.id} className="rounded-[1.75rem] border border-rose/25 bg-white/80 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive-dark">
                    Session {workshop.number}
                  </p>
                  <h3 className="mt-2 break-words text-2xl font-medium">{workshop.title}</h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${workshop.published ? "bg-sage/50 text-olive-dark" : "bg-ivory text-charcoal/70"}`}>
                  {workshop.published ? "Published" : "Unpublished"}
                </span>
              </div>
              <p className="mt-4 text-sm">{formatWorkshopDate(workshop.date)}</p>
              <p className="mt-1 text-sm text-charcoal/70">{workshop.start}–{workshop.end}</p>
              <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-charcoal/10 pt-4 text-sm">
                <div><dt className="text-xs text-charcoal/60">Capacity</dt><dd className="mt-1 font-semibold">{workshop.capacity}</dd></div>
                <div><dt className="text-xs text-charcoal/60">Available</dt><dd className="mt-1 font-semibold">{workshop.availableSeats}</dd></div>
                <div><dt className="text-xs text-charcoal/60">Registered</dt><dd className="mt-1 font-semibold">{workshop.registrationCount}</dd></div>
              </dl>
              <button
                type="button"
                disabled={busy !== ""}
                onClick={() => setPublished(workshop, !workshop.published)}
                className="mt-5 rounded-full border border-charcoal/40 px-5 py-2 text-sm font-medium hover:bg-charcoal hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === workshop.id ? "Saving…" : workshop.published ? "Unpublish session" : "Publish session"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <AdminEventsSection user={user} />

      <section id="registrations" className="mt-12 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive-dark">Customer records</p>
            <h2 className="mt-2 text-3xl font-medium">Registrations</h2>
          </div>
          <button
            type="button"
            onClick={() => exportRegistrations(displayedRegistrations)}
            disabled={displayedRegistrations.length === 0}
            className="rounded-full bg-charcoal px-5 py-3 text-sm font-medium text-ivory hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
        <label className="mt-5 block max-w-xl">
          <span className="sr-only">Search registrations</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, session, or status"
            className="w-full rounded-2xl border border-charcoal/20 bg-white/80 px-4 py-3 text-sm"
          />
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Event
            <select value={registrationFilters.eventId} onChange={(event) => setRegistrationFilters((current) => ({ ...current, eventId: event.target.value }))} className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white/80 px-3 py-2">
              <option value="all">All events</option>
              {dashboard.workshops.map((workshop) => <option key={workshop.id} value={workshop.id}>{workshop.title} · {workshop.date}</option>)}
            </select>
          </label>
          <label className="text-sm">Event date
            <select value={registrationFilters.date} onChange={(event) => setRegistrationFilters((current) => ({ ...current, date: event.target.value }))} className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white/80 px-3 py-2">
              <option value="all">All dates</option>
              {[...new Set(dashboard.registrations.map((item) => item.sessionDate).filter(Boolean))].sort().map((date) => <option key={date} value={date}>{formatWorkshopDate(date)}</option>)}
            </select>
          </label>
          <label className="text-sm">Payment status
            <select value={registrationFilters.paymentStatus} onChange={(event) => setRegistrationFilters((current) => ({ ...current, paymentStatus: event.target.value }))} className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white/80 px-3 py-2">
              <option value="all">All payment states</option>
              {[...new Set(dashboard.registrations.map((item) => item.paymentStatus))].sort().map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
        <ul className="mt-5 grid gap-3 lg:hidden">
          {displayedRegistrations.map((registration) => (
            <li key={registration.bookingId} className="min-w-0 rounded-2xl border border-rose/25 bg-white/80 p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{registration.customerName || "—"}</p>
                  <p className="mt-1 break-all text-xs text-charcoal/65">{registration.email || "—"}</p>
                  <p className="mt-1 text-xs text-charcoal/65">{registration.phone || "—"}</p>
                </div>
                <span className="shrink-0 rounded-full bg-sage/40 px-2 py-1 text-xs">{registration.paymentStatus}</span>
              </div>
              <p className="mt-3 break-words text-sm font-medium">{registration.workshopName}</p>
              <p className="mt-1 text-xs text-charcoal/65">
                {registration.sessionDate ? formatWorkshopDate(registration.sessionDate) : "—"}
                {registration.start ? ` · ${registration.start}` : ""}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-charcoal/10 pt-3 text-xs">
                <div><dt className="text-charcoal/60">Booking</dt><dd className="break-words">{registration.bookingStatus}</dd></div>
                <div><dt className="text-charcoal/60">Ticket</dt><dd className="break-words">{registration.ticketStatus}</dd></div>
              </dl>
              <button type="button" onClick={() => setSelectedRegistration(registration)} className="mt-3 rounded-full px-3 text-sm underline">
                View registration details
              </button>
            </li>
          ))}
          {displayedRegistrations.length === 0 && !loading && (
            <li className="rounded-2xl bg-white/70 p-6 text-center text-sm text-charcoal/65">No registrations match these filters.</li>
          )}
        </ul>
        <div className="mt-5 hidden overflow-x-auto rounded-[1.5rem] border border-rose/25 bg-white/80 lg:block">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-ivory/80 text-xs uppercase tracking-wide text-charcoal/70">
              <tr>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Workshop</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/10">
              {displayedRegistrations.map((registration) => (
                <tr key={registration.bookingId}>
                  <td className="px-4 py-4">
                    <p className="font-medium">{registration.customerName || "—"}</p>
                    <p className="mt-1 text-xs text-charcoal/65">{registration.email}</p>
                    <p className="mt-1 text-xs text-charcoal/65">{registration.phone}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p>{registration.workshopName}</p>
                    <p className="mt-1 text-xs text-charcoal/65">
                      {registration.sessionDate ? formatWorkshopDate(registration.sessionDate) : "—"}
                      {registration.start ? ` · ${registration.start}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-4">{registration.bookingStatus}</td>
                  <td className="px-4 py-4">{registration.paymentStatus}</td>
                  <td className="px-4 py-4">{registration.ticketStatus}</td>
                  <td className="px-4 py-4">
                    {registration.createdAt
                      ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(registration.createdAt))
                      : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <button type="button" onClick={() => setSelectedRegistration(registration)} className="underline">View</button>
                  </td>
                </tr>
              ))}
              {displayedRegistrations.length === 0 && !loading && (
                <tr><td className="px-4 py-8 text-center text-charcoal/65" colSpan="7">No registrations match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section id="ticket-scanner" className="mt-12 scroll-mt-24 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <AdminTicketScanner onScan={redeemScannedTicket} />
        <div className="rounded-[2rem] border border-rose/30 bg-white/80 p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-olive-dark">Manual check-in</p>
          <h2 className="mt-2 text-2xl font-medium">Enter ticket QR token</h2>
          <form onSubmit={redeemManualTicket} className="mt-5 flex flex-col gap-3">
            <label>
              <span className="sr-only">Ticket QR token</span>
              <input
                value={scanToken}
                onChange={(event) => setScanToken(event.target.value)}
                autoComplete="off"
                spellCheck="false"
                placeholder="Paste the 43-character token"
                className="w-full rounded-2xl border border-charcoal/20 bg-white px-4 py-3 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={scanToken.trim().length !== 43}
              className="self-start rounded-full bg-charcoal px-5 py-3 text-sm font-medium text-ivory hover:bg-olive-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              Validate and redeem
            </button>
          </form>
          {scanResult && (
            <div
              className={`mt-5 rounded-2xl p-4 ${
                scanResult.status === "valid"
                  ? "bg-sage/40"
                  : scanResult.status === "already_used"
                    ? "bg-rose/25"
                    : "border border-rose bg-white"
              }`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold">
                {scanResult.status === "valid"
                  ? "Valid ticket · redeemed"
                  : scanResult.status === "already_used"
                    ? "Already used"
                    : "Invalid ticket"}
              </p>
              <p className="mt-1 text-sm">{scanResult.message}</p>
              {scanResult.customerName && (
                <p className="mt-2 text-sm">
                  {scanResult.customerName} · {scanResult.workshopName}
                </p>
              )}
              {scanResult.sessionDate && (
                <p className="mt-1 text-xs">
                  {formatWorkshopDate(scanResult.sessionDate)} · {scanResult.start}–{scanResult.end}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
      {dashboard.adminRole === "super_admin" && <AdminAdminsSection user={user} />}
      {selectedRegistration && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-charcoal/45 p-4" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedRegistration(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="registration-details-title" className="w-full max-w-lg rounded-[2rem] border border-rose/30 bg-ivory p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4"><h2 id="registration-details-title" className="text-2xl font-medium">Registration details</h2><button type="button" aria-label="Close details" onClick={() => setSelectedRegistration(null)} className="rounded-full border border-charcoal/30 px-3 py-1">Close</button></div>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-charcoal/60">Customer</dt><dd>{selectedRegistration.customerName || "—"}</dd></div>
              <div><dt className="text-charcoal/60">Email</dt><dd>{selectedRegistration.email || "—"}</dd></div>
              <div><dt className="text-charcoal/60">Phone</dt><dd>{selectedRegistration.phone || "—"}</dd></div>
              <div><dt className="text-charcoal/60">Booking ID</dt><dd className="break-all">{selectedRegistration.bookingId}</dd></div>
              <div><dt className="text-charcoal/60">Event</dt><dd>{selectedRegistration.workshopName}</dd></div>
              <div><dt className="text-charcoal/60">Event date and time</dt><dd>{selectedRegistration.sessionDate ? `${formatWorkshopDate(selectedRegistration.sessionDate)} · ${selectedRegistration.start}–${selectedRegistration.end}` : "—"}</dd></div>
              <div><dt className="text-charcoal/60">Booking status</dt><dd>{selectedRegistration.bookingStatus}</dd></div>
              <div><dt className="text-charcoal/60">Payment status</dt><dd>{selectedRegistration.paymentStatus}</dd></div>
              <div><dt className="text-charcoal/60">Ticket status</dt><dd>{selectedRegistration.ticketStatus}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </main>
  );
}
