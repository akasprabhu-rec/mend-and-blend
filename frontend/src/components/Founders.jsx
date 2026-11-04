import Section from "./ui/Section.jsx";
import Reveal from "./ui/Reveal.jsx";
import { FOUNDERS, FOUNDER_BIO_PLACEHOLDER } from "../data/siteData.js";

export default function Founders() {
  return (
    <Section
      id="founders"
      eyebrow="The founders"
      title="Two co-founders, one shared intention"
      intro="Mend and Blend was founded to create rooms where people feel seen, heard and a little more at home in themselves."
    >
      <div className="grid gap-8 sm:grid-cols-2">
        {FOUNDERS.map((f, i) => (
          <Reveal key={f.name} delay={i * 150} className="flex min-w-0 flex-col items-start gap-4 rounded-[2rem] border border-charcoal/10 bg-white/50 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
            <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[46%_54%_50%_50%/55%_45%_55%_45%] font-serif text-3xl sm:h-28 sm:w-28 sm:text-4xl ${f.tone}`} aria-hidden="true">
              {f.initials}
            </div>
            <div className="min-w-0">
              <h3 className="break-words text-2xl font-medium sm:text-3xl">{f.name}</h3>
              <p className="mt-1 text-sm font-medium uppercase tracking-[0.15em] text-olive-dark">Co-founder</p>
              {/* TEMPORARY: replace with the founder's real bio and photo */}
              <p className="mt-3 italic text-charcoal/70">{FOUNDER_BIO_PLACEHOLDER}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
