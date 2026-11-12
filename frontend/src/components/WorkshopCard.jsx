import Button from "./ui/Button.jsx";
import { formatINR } from "../data/siteData.js";

const statusStyles = {
  open: "border-sage/60 bg-sage/30 text-sage-dark",
  not_open: "border-gold/70 bg-gold/25 text-[#6B4D16]",
  paused: "border-gold/70 bg-gold/25 text-[#6B4D16]",
  closed: "border-terracotta/45 bg-terracotta/15 text-terracotta-dark",
  sold_out: "border-terracotta/45 bg-terracotta/15 text-terracotta-dark",
  unpublished: "border-terracotta/45 bg-terracotta/15 text-terracotta-dark",
  completed: "border-brand-blue/25 bg-brand-blue/10 text-brand-blue",
};

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
  const badgeStyle = statusStyles[registrationStatus] || "border-charcoal/20 bg-charcoal/5 text-charcoal";

  return (
    <article className="group flex h-full flex-col rounded-3xl border border-charcoal/10 bg-white p-7 shadow-[0_6px_24px_-6px_rgba(48,58,64,0.07)] transition-all duration-300 hover:-translate-y-1 hover:border-terracotta/45 hover:shadow-[0_16px_36px_-10px_rgba(64,95,128,0.16)]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-sage/50 bg-sage/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sage-dark">
          {workshop.category || "EVENT"}
        </span>
        <svg viewBox="0 0 80 24" className="h-6 w-20 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M2 14 C14 -2 24 -2 34 12 S56 26 78 8" />
        </svg>
      </div>
      {workshop.imageUrl && (
        <img
          src={workshop.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="mt-5 aspect-[16/9] w-full rounded-2xl border border-charcoal/10 object-cover"
        />
      )}
      <h3 className="mt-5 text-3xl leading-tight font-medium text-brand-blue">{title}</h3>
      <div className="mt-3 border-l-2 border-gold pl-3">
        <p className="font-medium text-charcoal">{start} – {end}</p>
        <p className="mt-0.5 text-sm text-charcoal/70">{dateLabel}</p>
      </div>
      <p className="mt-5 flex-1 leading-relaxed text-charcoal/85">{description}</p>
      {workshop.fullDescription && workshop.fullDescription !== description && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-medium text-brand-blue underline decoration-terracotta/50 underline-offset-4 hover:text-terracotta-dark">
            More about this event
          </summary>
          <p className="mt-2 leading-relaxed text-charcoal/80">{workshop.fullDescription}</p>
        </details>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sage/35 bg-brand-ivory px-4 py-3 text-sm">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}>
          {registrationStatus === "open" && (
            <span className="h-1.5 w-1.5 rounded-full bg-sage-dark" aria-hidden="true" />
          )}
          {registrationLabel}
        </span>
        <span
          className={`font-medium ${
            availableSeats > 0 && availableSeats <= 5
              ? "text-terracotta-dark"
              : availableSeats === 0
                ? "text-charcoal/55"
                : "text-charcoal/80"
          }`}
        >
          {availableSeats} {availableSeats === 1 ? "seat" : "seats"} available
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-charcoal/10 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-charcoal/55">
            Workshop fee
          </p>
          <p className="font-serif text-3xl font-semibold text-brand-blue">{formatINR(price)}</p>
        </div>
        <Button
          variant={workshop.canRegister ? "accent" : "secondary"}
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
