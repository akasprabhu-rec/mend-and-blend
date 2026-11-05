import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { bookingApi, formatWorkshopDate } from "../booking/api.js";
import Section from "./ui/Section.jsx";
import Reveal from "./ui/Reveal.jsx";
import WorkshopCard from "./WorkshopCard.jsx";
import RegisterDialog from "./RegisterDialog.jsx";

export default function Workshops() {
  const [selected, setSelected] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user, loading: authLoading } = useAuth();
  const requestInFlight = useRef(false);

  const loadWorkshops = useCallback(async ({ quiet = false } = {}) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const result = await bookingApi("/events");
      setWorkshops(result.workshops);
      setDates(result.dates);
    } catch (loadError) {
      setError(loadError.message || "Could not load events.");
    } finally {
      requestInFlight.current = false;
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkshops();
    let refreshTimer;
    const scheduleRefresh = () => {
      if (document.visibilityState === "hidden" || refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        void loadWorkshops({ quiet: true });
      }, 50);
    };
    const handlePageShow = (event) => {
      if (event.persisted) scheduleRefresh();
    };
    const handleHashChange = () => {
      if (window.location.hash === "#workshops") scheduleRefresh();
    };

    document.addEventListener("visibilitychange", scheduleRefresh);
    window.addEventListener("focus", scheduleRefresh);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      document.removeEventListener("visibilitychange", scheduleRefresh);
      window.removeEventListener("focus", scheduleRefresh);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("hashchange", handleHashChange);
      if (refreshTimer) window.clearTimeout(refreshTimer);
    };
  }, [loadWorkshops]);

  useEffect(() => {
    if (!user || authLoading || workshops.length === 0) return;
    const pendingWorkshopId =
      sessionStorage.getItem("pendingEventId") ||
      sessionStorage.getItem("pendingWorkshopId");
    const pendingWorkshop = workshops.find((workshop) => workshop.id === pendingWorkshopId);
    if (pendingWorkshop) {
      setSelected(pendingWorkshop);
      sessionStorage.removeItem("pendingEventId");
      sessionStorage.removeItem("pendingWorkshopId");
    }
  }, [user, authLoading, workshops]);

  function register(workshop) {
    if (!user) sessionStorage.setItem("pendingEventId", workshop.id);
    setSelected(workshop);
  }

  return (
    <Section
      id="workshops"
      eyebrow="Events"
      title="Gather, explore and grow"
      intro="Explore our published events and workshops. Each gathering offers a welcoming space for curiosity, connection and self-discovery."
      className="bg-sage/25"
    >
      <ul aria-label="Event dates" className="mb-10 flex flex-wrap gap-3">
        {dates.map((d) => (
          <li
            key={d.date}
            className={`rounded-full px-5 py-2 text-sm font-medium ${
              d.publishedCount > 0
                ? "bg-charcoal text-ivory"
                : "border border-charcoal/40 text-charcoal"
            }`}
          >
            {formatWorkshopDate(d.date)}
            {d.publishedCount === 0 && " · events announced soon"}
          </li>
        ))}
      </ul>

      {loading && <p role="status">Loading available events…</p>}
      {error && (
        <div className="mb-6 rounded-2xl border border-rose p-4" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 text-sm font-medium underline disabled:opacity-50"
            onClick={loadWorkshops}
            disabled={loading}
          >
            Retry loading events
          </button>
        </div>
      )}
      {!loading && !error && workshops.length === 0 && (
        <p className="rounded-2xl bg-white/70 p-6">
          No events are currently published. Please check back soon.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {workshops.map((workshop, i) => (
          <Reveal key={workshop.id} delay={i * 120} className="h-full">
            <WorkshopCard
              workshop={workshop}
              dateLabel={formatWorkshopDate(workshop.date)}
              onRegister={register}
            />
          </Reveal>
        ))}
      </div>

      {user && (
        <p className="mt-8 text-sm">
          <Link to="/my-tickets" className="font-medium underline">View my tickets</Link>
        </p>
      )}
      <RegisterDialog
        workshop={selected}
        user={user}
        onClose={() => setSelected(null)}
        onReserved={loadWorkshops}
      />
    </Section>
  );
}
