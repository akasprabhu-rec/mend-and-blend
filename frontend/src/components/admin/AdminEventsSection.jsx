import { useCallback, useEffect, useMemo, useState } from "react";
import { bookingApi, formatWorkshopDate } from "../../booking/api.js";
import { formatINR } from "../../data/siteData.js";

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date).replace(" ", "T");
}

function inputTime(value) {
  if (/^\d{2}:\d{2}$/.test(value || "")) return value;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value || "");
  if (!match) return "";
  const hour = Number(match[1]) % 12 + (match[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function formFromEvent(event) {
  const venueParts = (event.venue || "").split(", ");
  return {
    title: event.title || "",
    category: event.category || "",
    shortDescription: event.shortDescription || event.description || "",
    fullDescription: event.fullDescription || event.description || "",
    date: event.date || "",
    start: inputTime(event.start),
    end: inputTime(event.end),
    venueName: event.venueName || venueParts[0] || "",
    venueAddress: event.venueAddress || venueParts.slice(1).join(", "),
    price: String(event.price ?? ""),
    capacity: String(event.capacity ?? ""),
    imageUrl: event.imageUrl || "",
    registrationOpenAt: localDateTime(event.registrationOpenAt),
    registrationCloseAt: localDateTime(event.registrationCloseAt),
    status: event.status || (event.published ? "published" : "unpublished"),
    salesPaused: event.salesPaused === true,
  };
}

function newEventForm() {
  return {
    title: "",
    category: "",
    shortDescription: "",
    fullDescription: "",
    date: "",
    start: "",
    end: "",
    venueName: "",
    venueAddress: "",
    price: "",
    capacity: "",
    imageUrl: "",
    registrationOpenAt: localDateTime(new Date().toISOString()),
    registrationCloseAt: "",
    status: "draft",
    salesPaused: false,
  };
}

const salesLabels = {
  open: "Registration open",
  not_open: "Not yet open",
  closed: "Sales closed",
  paused: "Sales paused",
  sold_out: "Sold out",
  completed: "Completed",
  archived: "Archived",
  unpublished: "Unpublished",
};

const salesBadgeStyles = {
  open: "border-sage/60 bg-sage/30 text-sage-dark",
  not_open: "border-gold/70 bg-gold/25 text-[#6B4D16]",
  paused: "border-gold/70 bg-gold/25 text-[#6B4D16]",
  closed: "border-terracotta/45 bg-terracotta/15 text-terracotta-dark",
  sold_out: "border-terracotta/45 bg-terracotta/15 text-terracotta-dark",
  completed: "border-brand-blue/25 bg-brand-blue/10 text-brand-blue",
  archived: "border-charcoal/20 bg-charcoal/8 text-charcoal/75",
  unpublished: "border-charcoal/20 bg-charcoal/8 text-charcoal/75",
};

function EventForm({ event, onCancel, onSaved, user }) {
  const [values, setValues] = useState(event ? formFromEvent(event) : newEventForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(eventObject) {
    eventObject.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await bookingApi(
        event ? `/admin/events/${encodeURIComponent(event.id)}` : "/admin/events",
        user,
        {
          method: event ? "PATCH" : "POST",
          body: JSON.stringify({
            ...values,
            price: Number(values.price),
            capacity: Number(values.capacity),
          }),
        },
      );
      if (typeof result.status !== "string") {
        throw new Error("The server did not confirm the event status.");
      }
      const status = result.status[0].toUpperCase() + result.status.slice(1);
      await onSaved(
        event
          ? `Event updated. Status: ${status}.`
          : `Event created as ${status}.`,
      );
    } catch (saveError) {
      setError(saveError.message || "Could not save this event.");
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = "mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2.5 text-sm font-normal text-charcoal";
  const labelClass = "block text-sm font-medium text-charcoal";

  return (
    <form onSubmit={submit} className="mt-5 grid gap-4 rounded-3xl border border-sage/45 border-t-4 border-t-terracotta bg-white p-6 shadow-sm md:grid-cols-2">
      {error && <p className="rounded-xl border border-terracotta/50 bg-terracotta/10 p-3 text-sm text-terracotta-dark md:col-span-2" role="alert">{error}</p>}
      <label className={labelClass}>Event/workshop name<input className={fieldClass} value={values.title} onChange={(e) => change("title", e.target.value)} required maxLength={120} /></label>
      <label className={labelClass}>Event status
        <select className={fieldClass} value={values.status} onChange={(e) => change("status", e.target.value)}>
          <option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option>{event?.status === "completed" && <option value="completed">Completed (legacy)</option>}
        </select>
      </label>
      <div className={labelClass} role="status">
        Ticket sales
        <p className={`${fieldClass} ${values.salesPaused ? "text-terracotta-dark font-medium" : "text-sage-dark font-medium"}`}>
          {values.salesPaused
            ? "Paused — use Resume sales on the event card to resume."
            : "Active — use Pause sales on the event card to pause."}
        </p>
      </div>
      <label className={labelClass}>Category<input className={fieldClass} value={values.category} onChange={(e) => change("category", e.target.value)} maxLength={80} placeholder="Optional" /></label>
      <label className={`${labelClass} md:col-span-2`}>Short description<input className={fieldClass} value={values.shortDescription} onChange={(e) => change("shortDescription", e.target.value)} required maxLength={300} /></label>
      <label className={`${labelClass} md:col-span-2`}>Full description<textarea className={fieldClass} rows={4} value={values.fullDescription} onChange={(e) => change("fullDescription", e.target.value)} required maxLength={10000} /></label>
      <label className={labelClass}>Event date<input className={fieldClass} type="date" value={values.date} onChange={(e) => change("date", e.target.value)} required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>Start time<input className={fieldClass} type="time" value={values.start} onChange={(e) => change("start", e.target.value)} required /></label>
        <label className={labelClass}>End time<input className={fieldClass} type="time" value={values.end} onChange={(e) => change("end", e.target.value)} required /></label>
      </div>
      <label className={labelClass}>Venue name<input className={fieldClass} value={values.venueName} onChange={(e) => change("venueName", e.target.value)} required maxLength={200} /></label>
      <label className={labelClass}>Venue address<input className={fieldClass} value={values.venueAddress} onChange={(e) => change("venueAddress", e.target.value)} required maxLength={500} /></label>
      <label className={labelClass}>Ticket price (INR)<input className={fieldClass} type="number" min="1" step="1" value={values.price} onChange={(e) => change("price", e.target.value)} required /></label>
      <label className={labelClass}>Total seat capacity<input className={fieldClass} type="number" min="1" step="1" value={values.capacity} onChange={(e) => change("capacity", e.target.value)} required /></label>
      <label className={labelClass}>Registration opens (India time)<input className={fieldClass} type="datetime-local" value={values.registrationOpenAt} onChange={(e) => change("registrationOpenAt", e.target.value)} required={!event || Boolean(event.registrationOpenAt || event.registrationCloseAt)} /></label>
      <label className={labelClass}>Registration closes (India time)<input className={fieldClass} type="datetime-local" value={values.registrationCloseAt} onChange={(e) => change("registrationCloseAt", e.target.value)} required={!event || Boolean(event.registrationOpenAt || event.registrationCloseAt)} /></label>
      <label className={`${labelClass} md:col-span-2`}>Poster image URL (optional, HTTPS)<input className={fieldClass} type="url" placeholder="https://…" value={values.imageUrl} onChange={(e) => change("imageUrl", e.target.value)} /></label>
      {values.imageUrl && (
        <img
          src={values.imageUrl}
          alt="Event poster preview"
          className="aspect-video w-full rounded-2xl border border-charcoal/10 object-cover md:col-span-2"
        />
      )}
      <p className="text-xs text-charcoal/65 md:col-span-2">Event schedule and ticket-sales dates are independent. This project has no image-storage integration; use a public HTTPS poster URL if needed. Date/time fields use India Standard Time.</p>
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <button disabled={busy} className="rounded-full bg-terracotta-dark px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#9D4D38] disabled:opacity-50">{busy ? "Saving…" : event ? "Save event" : "Create event"}</button>
        <button type="button" onClick={onCancel} disabled={busy} className="rounded-full border border-charcoal/25 px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-charcoal/5">Cancel</button>
      </div>
    </form>
  );
}

export default function AdminEventsSection({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formEvent, setFormEvent] = useState(undefined);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await bookingApi("/admin/events", user);
      setEvents(result.events);
    } catch (loadError) {
      setError(loadError.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    if (phaseFilter !== "all" && event.phase !== phaseFilter) return false;
    if (statusFilter !== "all" && (event.status || (event.published ? "published" : "unpublished")) !== statusFilter) return false;
    if (salesFilter === "open" && event.registrationStatus !== "open") return false;
    if (salesFilter === "closed" && event.registrationStatus === "open") return false;
    return true;
  }), [events, phaseFilter, statusFilter, salesFilter]);

  async function saved(text) {
    setFormEvent(undefined);
    setMessage(text);
    await loadEvents();
  }

  async function duplicate(event) {
    if (!window.confirm(`Create a draft copy of “${event.title}”?`)) return;
    setBusy(event.id);
    setError("");
    try {
      const result = await bookingApi(`/admin/events/${encodeURIComponent(event.id)}/duplicate`, user, { method: "POST" });
      setMessage("Draft copy created. Review its schedule and registration dates before publishing.");
      await loadEvents();
      const refreshed = await bookingApi("/admin/events", user);
      setEvents(refreshed.events);
      setFormEvent(refreshed.events.find((item) => item.id === result.id));
    } catch (requestError) {
      setError(requestError.message || "Could not duplicate this event.");
    } finally {
      setBusy("");
    }
  }

  async function pauseSales(event) {
    const paused = !event.salesPaused;
    if (!window.confirm(`${paused ? "Pause" : "Resume"} ticket sales for “${event.title}”?`)) return;
    setBusy(event.id);
    setError("");
    setMessage("");
    try {
      await bookingApi(`/admin/events/${encodeURIComponent(event.id)}/sales`, user, {
        method: "PATCH",
        body: JSON.stringify({ paused }),
      });
      setMessage(`Ticket sales ${paused ? "paused" : "resumed"}.`);
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message || "Could not change ticket sales.");
    } finally {
      setBusy("");
    }
  }

  async function setRegistration(event) {
    const isClosed =
      event.registrationClosedManually || event.registrationStatus === "closed";
    const action = isClosed ? "open" : "close";
    if (!window.confirm(`${action === "open" ? "Open" : "Close"} registrations for “${event.title}”?`)) return;
    setBusy(event.id);
    setError("");
    setMessage("");
    try {
      await bookingApi(`/admin/events/${encodeURIComponent(event.id)}/registration`, user, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      setMessage(action === "open" ? "Registrations opened." : "Registrations closed.");
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message || "Could not change registration status.");
    } finally {
      setBusy("");
    }
  }

  async function removeEvent(event) {
    if (!window.confirm(`Delete “${event.title}”? Confirmed bookings, active reservations, or financially relevant payment records prevent deletion.`)) return;
    setBusy(event.id);
    setError("");
    try {
      await bookingApi(`/admin/events/${encodeURIComponent(event.id)}`, user, { method: "DELETE" });
      setMessage("Event deleted.");
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message || "Could not delete this event.");
    } finally {
      setBusy("");
    }
  }

  async function changeStatus(event, status) {
    setBusy(event.id);
    setError("");
    setMessage("");
    try {
      await bookingApi(`/admin/events/${encodeURIComponent(event.id)}/status`, user, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setMessage(`“${event.title}” is now ${status}.`);
      await loadEvents();
    } catch (requestError) {
      setError(requestError.message || "Could not update event status.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section id="manage-events" className="mt-12 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark">
            <span className="h-px w-4 bg-terracotta" aria-hidden="true" />
            Event management
          </p>
          <h2 className="mt-2 text-3xl font-medium text-brand-blue">Manage events</h2>
        </div>
        <button type="button" onClick={() => setFormEvent(null)} className="rounded-full bg-terracotta-dark px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#9D4D38]">Add event</button>
      </div>
      <p className="mt-2 max-w-3xl text-sm text-charcoal/75">Create and manage events here. Registration dates, manual controls, and seat availability determine when customers can register.</p>
      {error && <p className="mt-5 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark" role="alert">{error}</p>}
      {message && <p className="mt-5 rounded-2xl border border-sage/60 bg-sage/20 p-4 text-sm text-charcoal" role="status">{message}</p>}
      {formEvent !== undefined && <EventForm key={formEvent?.id || "new"} event={formEvent} user={user} onCancel={() => setFormEvent(undefined)} onSaved={saved} />}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-charcoal">Event schedule<select className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2 font-normal" value={phaseFilter} onChange={(e) => setPhaseFilter(e.target.value)}><option value="all">All events</option><option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="past">Past</option></select></label>
        <label className="text-sm font-medium text-charcoal">Status<select className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2 font-normal" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="unpublished">Unpublished</option><option value="archived">Archived</option></select></label>
        <label className="text-sm font-medium text-charcoal">Ticket sales<select className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2 font-normal" value={salesFilter} onChange={(e) => setSalesFilter(e.target.value)}><option value="all">All sales states</option><option value="open">Registration open</option><option value="closed">Registration closed / paused</option></select></label>
      </div>
      {loading && <p className="mt-5 text-charcoal/75" role="status">Loading events…</p>}
      {!loading && filteredEvents.length === 0 && !error && <p className="mt-5 rounded-2xl border border-sage/40 bg-white p-5 text-charcoal/75">No events match these filters.</p>}
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => (
          <article key={event.id} className="rounded-3xl border border-sage/40 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-sage-dark">{event.phase} · {event.status}</p>
                <h3 className="mt-2 break-words text-2xl font-medium text-brand-blue">{event.title}</h3>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${salesBadgeStyles[event.registrationStatus] || "border-brand-blue/25 bg-brand-blue/10 text-brand-blue"}`}>
                {salesLabels[event.registrationStatus] || event.registrationStatus}
              </span>
            </div>
            {event.category && <p className="mt-3 inline-block rounded-full border border-gold/60 bg-gold/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#6B4D16]">{event.category}</p>}
            <p className="mt-3 text-sm font-medium text-charcoal">{event.date ? formatWorkshopDate(event.date) : "Date not set"} · {event.start}–{event.end}</p>
            <p className="mt-1 text-sm text-charcoal/70">{event.venueName || event.venue}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-charcoal/10 pt-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-charcoal/60">Price</dt><dd className="font-medium text-brand-blue">{formatINR(event.price)}</dd></div>
              <div><dt className="text-xs text-charcoal/60">Registered</dt><dd className="font-medium">{event.registrationCount}</dd></div>
              <div><dt className="text-xs text-charcoal/60">Booked / capacity</dt><dd className="font-medium">{event.bookedSeats} / {event.capacity}</dd></div>
              <div><dt className="text-xs text-charcoal/60">Available</dt><dd className="font-medium">{event.availableSeats}</dd></div>
              <div><dt className="text-xs text-charcoal/60">Revenue</dt><dd className="font-medium text-brand-blue">{formatINR(event.revenue)}</dd></div>
              <div><dt className="text-xs text-charcoal/60">Registration deadline</dt><dd>{event.registrationCloseAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(event.registrationCloseAt)) : "No deadline"}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setFormEvent(event)} className="rounded-full border border-charcoal/25 px-3 py-2 text-xs font-medium text-charcoal hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue">Edit</button>
              <button type="button" disabled={busy === event.id} onClick={() => changeStatus(event, event.published ? "unpublished" : "published")} className="rounded-full border border-charcoal/25 px-3 py-2 text-xs font-medium text-charcoal hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50">{event.published ? "Unpublish" : "Publish"}</button>
              {event.status !== "archived" && <button type="button" disabled={busy === event.id} onClick={() => changeStatus(event, "archived")} className="rounded-full border border-charcoal/25 px-3 py-2 text-xs font-medium text-charcoal hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50">Archive</button>}
              <button type="button" disabled={busy === event.id} onClick={() => pauseSales(event)} className="rounded-full border border-charcoal/25 px-3 py-2 text-xs font-medium text-charcoal hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50">{event.salesPaused ? "Resume sales" : "Pause sales"}</button>
              <button type="button" disabled={busy === event.id} onClick={() => setRegistration(event)} className="rounded-full border border-charcoal/25 px-3 py-2 text-xs font-medium text-charcoal hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50">{event.registrationClosedManually || event.registrationStatus === "closed" ? "Open registrations" : "Close registrations"}</button>
              <button type="button" disabled={busy === event.id} onClick={() => duplicate(event)} className="rounded-full border border-charcoal/25 px-3 py-2 text-xs font-medium text-charcoal hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50">Duplicate</button>
              <button type="button" disabled={busy === event.id} onClick={() => removeEvent(event)} className="rounded-full border border-terracotta/50 px-3 py-2 text-xs font-medium text-terracotta-dark hover:bg-terracotta/10 disabled:opacity-50">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
