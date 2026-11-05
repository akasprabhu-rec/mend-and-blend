import Button from "./ui/Button.jsx";
import { formatINR } from "../data/siteData.js";

export default function WorkshopCard({ workshop, dateLabel, onRegister }) {
  const { title, start, end, price, description, availableSeats } = workshop;
  const registrationStatus = workshop.registrationStatus || "open";
  const registrationLabel = {
    open: "Registration open",
    not_open: "Registration not yet open",
    closed: "Sales closed",
    paused: "Sales paused",
    sold_out: "Sold out",
    completed: "Completed",
    unpublished: "Unpublished",
  }[registrationStatus] || "Registration unavailable";

  return (
    <article className="flex h-full flex-col rounded-[2rem] border border-brand-blue/15 bg-white p-8 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium tracking-[0.2em] text-charcoal/70">{workshop.category || "EVENT"}</span>
        <svg viewBox="0 0 80 24" className="h-6 w-20 text-brand-blue" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M2 14 C14 -2 24 -2 34 12 S56 26 78 8" />
        </svg>
      </div>
      {workshop.imageUrl && (
        <img
          src={workshop.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="mt-5 aspect-[16/9] w-full rounded-2xl object-cover"
        />
      )}
      <h3 className="mt-6 text-3xl leading-tight font-medium">{title}</h3>
      <p className="mt-3 font-medium">{start} – {end}</p>
      <p className="mt-1 text-sm text-charcoal/70">{dateLabel}</p>
      <p className="mt-5 flex-1 leading-relaxed text-charcoal/85">{description}</p>
      {workshop.fullDescription && workshop.fullDescription !== description && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium underline">More about this event</summary>
          <p className="mt-2 leading-relaxed text-charcoal/80">{workshop.fullDescription}</p>
        </details>
      )}
      <p className="mt-4 text-sm font-medium">{registrationLabel}</p>
      <p className="mt-5 text-sm font-medium">
        {availableSeats} {availableSeats === 1 ? "seat" : "seats"} available
      </p>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="font-serif text-3xl font-medium">{formatINR(price)}</p>
        <Button
          onClick={() => onRegister(workshop)}
          disabled={!workshop.canRegister}
          aria-label={`Reserve a place for ${title}`}
        >
          Register
        </Button>
      </div>
    </article>
  );
}
