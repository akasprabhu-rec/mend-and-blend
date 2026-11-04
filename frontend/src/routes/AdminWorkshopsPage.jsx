import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { bookingApi, formatWorkshopDate } from "../booking/api.js";
import { formatINR } from "../data/siteData.js";

export default function AdminWorkshopsPage() {
  const { user } = useAuth();
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadWorkshops = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await bookingApi("/admin/workshops", user);
      setWorkshops(result.workshops);
    } catch (loadError) {
      setError(loadError.message || "Could not load workshop sessions.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  async function seedWorkshops() {
    setBusy("seed");
    setError("");
    setMessage("");
    try {
      const result = await bookingApi("/admin/workshops/seed", user, { method: "POST" });
      setMessage(result.message);
      await loadWorkshops();
    } catch (seedError) {
      setError(seedError.message || "Could not initialize workshop sessions.");
    } finally {
      setBusy("");
    }
  }

  async function setPublished(workshop, published) {
    setBusy(workshop.id);
    setError("");
    setMessage("");
    try {
      await bookingApi(`/admin/workshops/${encodeURIComponent(workshop.id)}/publication`, user, {
        method: "PATCH",
        body: JSON.stringify({ published }),
      });
      setWorkshops((current) =>
        current.map((item) => item.id === workshop.id ? { ...item, published } : item),
      );
      setMessage(`${workshop.title} on ${formatWorkshopDate(workshop.date)} is now ${
        published ? "published" : "unpublished"
      }.`);
    } catch (updateError) {
      setError(updateError.message || "Could not update publication status.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12 sm:py-16">
      <Link to="/" className="text-sm font-medium text-olive-dark hover:underline">
        ← Back to Mend and Blend
      </Link>
      <header className="mt-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
          Admin
        </p>
        <h1 className="mt-3 text-4xl font-medium">Workshop publishing</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-charcoal/75">
          Publishing is manual. December 20 sessions stay unpublished until an administrator
          explicitly publishes them. Only the server can change session publication.
        </p>
      </header>

      {error && <p className="mt-6 rounded-2xl border border-rose p-4" role="alert">{error}</p>}
      {message && <p className="mt-6 rounded-2xl bg-sage/40 p-4" role="status">{message}</p>}

      {!loading && workshops.length === 0 && !error && (
        <section className="mt-8 rounded-[2rem] bg-white/70 p-6">
          <h2 className="text-2xl font-medium">No sessions initialized</h2>
          <p className="mt-2 leading-relaxed">
            Initialize the six scheduled sessions. This creates only missing records and does not
            change publication settings on existing sessions.
          </p>
          <button
            type="button"
            disabled={busy !== ""}
            onClick={seedWorkshops}
            className="mt-5 rounded-full bg-charcoal px-6 py-3 text-sm font-medium text-ivory disabled:opacity-50"
          >
            {busy === "seed" ? "Initializing…" : "Initialize six sessions"}
          </button>
        </section>
      )}

      {loading && <p className="mt-8" role="status">Loading sessions…</p>}
      {!loading && workshops.length > 0 && (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {workshops.map((workshop) => (
            <article key={workshop.id} className="rounded-[2rem] bg-white/70 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.15em] text-olive-dark">
                    Session {workshop.number}
                  </p>
                  <h2 className="mt-2 text-2xl font-medium">{workshop.title}</h2>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    workshop.published ? "bg-sage/50" : "border border-charcoal/30"
                  }`}
                >
                  {workshop.published ? "Published" : "Unpublished"}
                </span>
              </div>
              <p className="mt-4 text-sm">
                {formatWorkshopDate(workshop.date)} · {workshop.start}–{workshop.end}
              </p>
              <p className="mt-1 text-sm">
                {formatINR(workshop.price)} · Capacity {workshop.capacity}
              </p>
              <button
                type="button"
                disabled={busy !== ""}
                onClick={() => setPublished(workshop, !workshop.published)}
                className="mt-6 rounded-full border border-charcoal/50 px-5 py-2 text-sm font-medium hover:bg-charcoal hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === workshop.id
                  ? "Saving…"
                  : workshop.published
                    ? "Unpublish session"
                    : "Publish session"}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
