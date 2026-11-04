import Reveal from "./Reveal.jsx";

// Shared wrapper: spacing, max width and the eyebrow / title / intro block.
export default function Section({ id, eyebrow, title, intro, className = "", children }) {
  return (
    <section id={id} className={`px-6 py-20 md:py-28 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 max-w-2xl">
          {eyebrow && (
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
              {eyebrow}
            </p>
          )}
          <h2 className="text-4xl leading-tight font-medium md:text-5xl">{title}</h2>
          {intro && <p className="mt-5 text-lg leading-relaxed text-charcoal/80">{intro}</p>}
        </Reveal>
        {children}
      </div>
    </section>
  );
}
