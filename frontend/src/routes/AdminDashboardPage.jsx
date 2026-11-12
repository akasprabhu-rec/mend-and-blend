import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import AdminTicketScanner from "../components/admin/AdminTicketScanner.jsx";
import AdminEventsSection from "../components/admin/AdminEventsSection.jsx";
import AdminAdminsSection from "../components/admin/AdminAdminsSection.jsx";
import Navbar from "../components/Navbar.jsx";
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
    "Event",
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
    <article className="feature-card rounded-2xl border border-sage/40 bg-white p-5 shadow-xs hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-[#21292E] dark:hover:bg-[#263036]">
      <p className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">{label}</p>
      <p className="mt-2 font-serif text-3xl font-semibold text-brand-blue dark:text-[#96B7DA]">{value}</p>
      {note && <p className="mt-1 text-xs text-charcoal/65 dark:text-[#9DA7AE]">{note}</p>}
    </article>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState({
    summary: initialSummary,
    events: [],
    registrations: [],
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanToken, setScanToken] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(
    () => window.location.hash.slice(1) || "overview",
  );
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
  const dashboardSections = [
    ["overview", "Overview"],
    ["manage-events", "Manage events"],
    ["registrations", "Registrations"],
    ["ticket-scanner", "Ticket scanner"],
    ...(dashboard.adminRole === "super_admin" ? [["manage-admins", "Manage admins"]] : []),
  ];

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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-brand-ivory via-sage/10 to-brand-ivory dark:from-[#181E22] dark:via-[#1B2429] dark:to-[#181E22]">
        <main className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
          <header className="flex min-w-0 flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="mt-7 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark dark:text-sage">
                <span className="h-px w-5 bg-terracotta" aria-hidden="true" />
                Administrator dashboard
              </p>
              <h1 className="mt-2 break-words text-3xl font-medium text-brand-blue dark:text-[#96B7DA] sm:text-5xl">Event operations</h1>
              <p className="mt-3 break-words text-sm text-charcoal/75 dark:text-[#C5CCD1]">
                Signed in as {user.email || user.displayName}. Payments are verified automatically;
                administrators cannot change payment status.
              </p>
            </div>
          </header>

          {error && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" role="alert">
              {error}
            </p>
          )}

          <nav aria-label="Admin dashboard sections" className="sticky top-2 z-10 mt-7 rounded-2xl border border-gold/30 bg-brand-blue p-3 text-white shadow-md dark:border-gold/30 dark:bg-[#2A4058] dark:shadow-black/30">
            <div className="flex items-center justify-between md:hidden">
              <span className="text-sm font-medium text-brand-ivory">Dashboard sections</span>
              <button
                type="button"
                className="rounded-full border border-white/40 px-4 text-sm font-medium text-white hover:bg-white/10"
                aria-expanded={mobileNavOpen}
                aria-controls="admin-mobile-sections"
                onClick={() => setMobileNavOpen((open) => !open)}
              >
                {mobileNavOpen ? "Close menu" : "Menu"}
              </button>
            </div>
            <div className="hidden flex-wrap gap-2 md:flex">
              {dashboardSections.map(([id, label]) => (
                <a
                  key={id}
                  aria-current={activeSection === id ? "location" : undefined}
                  className={`flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors ${activeSection === id
                    ? "bg-white text-brand-blue shadow-xs dark:bg-[#181E22] dark:text-[#F2F0EC]"
                    : "text-brand-ivory/90 hover:bg-white/15 hover:text-white"
                    }`}
                  href={`#${id}`}
                  onClick={() => setActiveSection(id)}
                >
                  {label}
                </a>
              ))}
            </div>
            {mobileNavOpen && (
              <div id="admin-mobile-sections" className="mt-2 grid gap-1 border-t border-white/20 pt-2 md:hidden">
                {dashboardSections.map(([id, label]) => (
                  <a
                    key={id}
                    aria-current={activeSection === id ? "location" : undefined}
                    className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-medium ${activeSection === id
                      ? "bg-white text-brand-blue dark:bg-[#181E22] dark:text-[#F2F0EC]"
                      : "text-brand-ivory/90 hover:bg-white/15 hover:text-white"
                      }`}
                    href={`#${id}`}
                    onClick={() => {
                      setActiveSection(id);
                      setMobileNavOpen(false);
                    }}
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
            <Metric label="Unpublished events" value={dashboard.summary.unpublishedEvents} note="Draft, unpublished, and archived" />
          </section>

          <AdminEventsSection user={user} />

          <section id="registrations" className="mt-12 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark dark:text-sage">
                  <span className="h-px w-4 bg-terracotta" aria-hidden="true" />
                  Customer records
                </p>
                <h2 className="mt-2 text-3xl font-medium text-brand-blue dark:text-[#96B7DA]">Registrations</h2>
              </div>
              <button
                type="button"
                onClick={() => exportRegistrations(displayedRegistrations)}
                disabled={displayedRegistrations.length === 0}
                className="btn-interactive rounded-full bg-brand-blue px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.42)] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#324D69]"
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
                placeholder="Search name, email, phone, event, or status"
                className="w-full rounded-2xl border border-charcoal/20 bg-white px-4 py-3 text-sm text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]"
              />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-medium text-charcoal dark:text-[#D9DFE3]">Event
                <select value={registrationFilters.eventId} onChange={(event) => setRegistrationFilters((current) => ({ ...current, eventId: event.target.value }))} className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2 font-normal text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]">
                  <option value="all">All events</option>
                  {dashboard.events.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.date}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-charcoal dark:text-[#D9DFE3]">Event date
                <select value={registrationFilters.date} onChange={(event) => setRegistrationFilters((current) => ({ ...current, date: event.target.value }))} className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2 font-normal text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]">
                  <option value="all">All dates</option>
                  {[...new Set(dashboard.registrations.map((item) => item.sessionDate).filter(Boolean))].sort().map((date) => <option key={date} value={date}>{formatWorkshopDate(date)}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-charcoal dark:text-[#D9DFE3]">Payment status
                <select value={registrationFilters.paymentStatus} onChange={(event) => setRegistrationFilters((current) => ({ ...current, paymentStatus: event.target.value }))} className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2 font-normal text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]">
                  <option value="all">All payment states</option>
                  {[...new Set(dashboard.registrations.map((item) => item.paymentStatus))].sort().map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
            </div>
            <ul className="mt-5 grid gap-3 lg:hidden">
              {displayedRegistrations.map((registration) => (
                <li key={registration.bookingId} className="min-w-0 rounded-2xl border border-sage/40 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#21292E]">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-brand-blue dark:text-[#96B7DA]">{registration.customerName || "—"}</p>
                      <p className="mt-1 break-all text-xs text-charcoal/65 dark:text-[#9DA7AE]">{registration.email || "—"}</p>
                      <p className="mt-1 text-xs text-charcoal/65 dark:text-[#9DA7AE]">{registration.phone || "—"}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-sage/50 bg-sage/20 px-2.5 py-1 text-xs font-semibold text-sage-dark dark:border-sage/45 dark:bg-sage/18 dark:text-sage">{registration.paymentStatus}</span>
                  </div>
                  <p className="mt-3 break-words text-sm font-medium text-charcoal dark:text-[#E8ECEF]">{registration.workshopName}</p>
                  <p className="mt-1 text-xs text-charcoal/65 dark:text-[#9DA7AE]">
                    {registration.sessionDate ? formatWorkshopDate(registration.sessionDate) : "—"}
                    {registration.start ? ` · ${registration.start}` : ""}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-charcoal/10 pt-3 text-xs dark:border-white/10">
                    <div><dt className="text-charcoal/60 dark:text-[#9DA7AE]">Booking</dt><dd className="break-words font-medium dark:text-[#E8ECEF]">{registration.bookingStatus}</dd></div>
                    <div><dt className="text-charcoal/60 dark:text-[#9DA7AE]">Ticket</dt><dd className="break-words font-medium dark:text-[#E8ECEF]">{registration.ticketStatus}</dd></div>
                  </dl>
                  <button type="button" onClick={() => setSelectedRegistration(registration)} className="mt-3 rounded-full px-3 text-sm font-medium text-terracotta-dark underline underline-offset-4 hover:text-brand-blue dark:text-[#F09E88] dark:hover:text-[#96B7DA]">
                    View registration details
                  </button>
                </li>
              ))}
              {displayedRegistrations.length === 0 && !loading && (
                <li className="rounded-2xl border border-sage/35 bg-white p-6 text-center text-sm text-charcoal/65 dark:border-white/10 dark:bg-[#21292E] dark:text-[#9DA7AE]">No registrations match these filters.</li>
              )}
            </ul>
            <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-sage/40 bg-white shadow-xs dark:border-white/10 dark:bg-[#21292E] lg:block">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-sage/15 text-xs font-semibold uppercase tracking-wide text-sage-dark dark:bg-white/5 dark:text-sage">
                  <tr>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Event</th>
                    <th className="px-4 py-3.5">Booking</th>
                    <th className="px-4 py-3.5">Payment</th>
                    <th className="px-4 py-3.5">Ticket</th>
                    <th className="px-4 py-3.5">Registered</th>
                    <th className="px-4 py-3.5">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/10 dark:divide-white/10">
                  {displayedRegistrations.map((registration) => (
                    <tr key={registration.bookingId} className="transition-colors hover:bg-brand-ivory/60 dark:hover:bg-white/5">
                      <td className="px-4 py-4">
                        <p className="font-medium text-brand-blue dark:text-[#96B7DA]">{registration.customerName || "—"}</p>
                        <p className="mt-1 text-xs text-charcoal/65 dark:text-[#9DA7AE]">{registration.email}</p>
                        <p className="mt-1 text-xs text-charcoal/65 dark:text-[#9DA7AE]">{registration.phone}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-charcoal dark:text-[#E8ECEF]">{registration.workshopName}</p>
                        <p className="mt-1 text-xs text-charcoal/65 dark:text-[#9DA7AE]">
                          {registration.sessionDate ? formatWorkshopDate(registration.sessionDate) : "—"}
                          {registration.start ? ` · ${registration.start}` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 dark:text-[#E8ECEF]">{registration.bookingStatus}</td>
                      <td className="px-4 py-4 dark:text-[#E8ECEF]">{registration.paymentStatus}</td>
                      <td className="px-4 py-4 dark:text-[#E8ECEF]">{registration.ticketStatus}</td>
                      <td className="px-4 py-4 dark:text-[#C5CCD1]">
                        {registration.createdAt
                          ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(registration.createdAt))
                          : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <button type="button" onClick={() => setSelectedRegistration(registration)} className="font-medium text-brand-blue underline underline-offset-4 hover:text-terracotta-dark dark:text-[#96B7DA] dark:hover:text-[#F09E88]">View</button>
                      </td>
                    </tr>
                  ))}
                  {displayedRegistrations.length === 0 && !loading && (
                    <tr><td className="px-4 py-8 text-center text-charcoal/65 dark:text-[#9DA7AE]" colSpan="7">No registrations match these filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section id="ticket-scanner" className="mt-12 scroll-mt-24 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <AdminTicketScanner onScan={redeemScannedTicket} />
            <div className="rounded-3xl border border-sage/45 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#21292E] dark:shadow-black/30 sm:p-8">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark dark:text-sage">
                <span className="h-px w-4 bg-terracotta" aria-hidden="true" />
                Manual check-in
              </p>
              <h2 className="mt-2 text-2xl font-medium text-brand-blue dark:text-[#96B7DA]">Enter ticket QR token</h2>
              <form onSubmit={redeemManualTicket} className="mt-5 flex flex-col gap-3">
                <label>
                  <span className="sr-only">Ticket QR token</span>
                  <input
                    value={scanToken}
                    onChange={(event) => setScanToken(event.target.value)}
                    autoComplete="off"
                    spellCheck="false"
                    placeholder="Paste the 43-character token"
                    className="w-full rounded-2xl border border-charcoal/20 bg-white px-4 py-3 text-sm text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={scanToken.trim().length !== 43}
                  className="btn-interactive self-start rounded-full bg-terracotta-dark px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#9D4D38] hover:shadow-[0_10px_22px_-8px_rgba(181,91,68,0.42)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Validate and redeem
                </button>
              </form>
              {scanResult && (
                <div
                  className={`mt-5 rounded-2xl border p-4 ${scanResult.status === "valid"
                    ? "border-sage/60 bg-sage/25 text-charcoal dark:border-sage/45 dark:bg-sage/18 dark:text-[#E8ECEF]"
                    : scanResult.status === "already_used"
                      ? "border-gold/70 bg-gold/25 text-charcoal dark:border-gold/45 dark:bg-gold/15 dark:text-[#F4E6C5]"
                      : "border-terracotta/50 bg-terracotta/12 text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]"
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
                    <p className="mt-2 text-sm font-medium">
                      {scanResult.customerName} · {scanResult.workshopName}
                    </p>
                  )}
                  {scanResult.sessionDate && (
                    <p className="mt-1 text-xs opacity-80">
                      {formatWorkshopDate(scanResult.sessionDate)} · {scanResult.start}–{scanResult.end}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
          {dashboard.adminRole === "super_admin" && <AdminAdminsSection user={user} />}
          {selectedRegistration && (
            <div className="fixed inset-0 z-30 flex items-center justify-center bg-charcoal/55 p-4 backdrop-blur-xs dark:bg-black/75" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setSelectedRegistration(null); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="registration-details-title" className="w-full max-w-lg rounded-3xl border border-sage/45 border-t-4 border-t-brand-blue bg-white p-6 shadow-2xl dark:border-white/10 dark:border-t-[#96B7DA] dark:bg-[#21292E] dark:shadow-black/50">
                <div className="flex items-start justify-between gap-4">
                  <h2 id="registration-details-title" className="text-2xl font-medium text-brand-blue dark:text-[#96B7DA]">Registration details</h2>
                  <button type="button" aria-label="Close details" onClick={() => setSelectedRegistration(null)} className="rounded-full border border-charcoal/25 px-3.5 py-1 text-sm font-medium text-charcoal hover:bg-brand-blue hover:text-white dark:border-white/20 dark:text-[#E8ECEF] dark:hover:bg-[#324D69]">Close</button>
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Customer</dt><dd className="mt-0.5 dark:text-[#E8ECEF]">{selectedRegistration.customerName || "—"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Email</dt><dd className="mt-0.5 break-all dark:text-[#E8ECEF]">{selectedRegistration.email || "—"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Phone</dt><dd className="mt-0.5 dark:text-[#E8ECEF]">{selectedRegistration.phone || "—"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Booking ID</dt><dd className="mt-0.5 break-all dark:text-[#E8ECEF]">{selectedRegistration.bookingId}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Event</dt><dd className="mt-0.5 dark:text-[#E8ECEF]">{selectedRegistration.workshopName}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Event date and time</dt><dd className="mt-0.5 dark:text-[#E8ECEF]">{selectedRegistration.sessionDate ? `${formatWorkshopDate(selectedRegistration.sessionDate)} · ${selectedRegistration.start}–${selectedRegistration.end}` : "—"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Booking status</dt><dd className="mt-0.5 dark:text-[#E8ECEF]">{selectedRegistration.bookingStatus}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Payment status</dt><dd className="mt-0.5 dark:text-[#E8ECEF]">{selectedRegistration.paymentStatus}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wider text-sage-dark dark:text-sage">Ticket status</dt><dd className="mt-0.5 dark:text-[#E8ECEF]">{selectedRegistration.ticketStatus}</dd></div>
                </dl>
              </section>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
