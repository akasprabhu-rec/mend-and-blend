import Reveal from "./Reveal.jsx";

// Shared wrapper: spacing, max width and the eyebrow / title / intro block.
export default function Section({ id, eyebrow, title, intro, className = "", children }) {
  return (
    <section id={id} className={`px-6 py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 max-w-2xl">
          {eyebrow && (
            <p className="mb-3 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark">
              <span className="h-px w-6 bg-terracotta" aria-hidden="true" />
              {eyebrow}
            </p>
          )}
          <h2 className="text-4xl leading-tight font-medium text-brand-blue md:text-5xl">{title}</h2>
          {intro && <p className="mt-5 text-lg leading-relaxed text-charcoal/80">{intro}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
