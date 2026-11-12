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
      className="bg-founders-atmosphere border-t border-sage/30 dark:border-white/10"
    >
      <div className="grid gap-8 sm:grid-cols-2">
        {FOUNDERS.map((f, i) => (
          <Reveal key={f.name} delay={i * 150} className="h-full">
            <article className="feature-card flex h-full min-w-0 flex-col items-start gap-5 rounded-3xl border border-sage/45 bg-white/95 p-6 shadow-sm hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-[#21292E] dark:hover:bg-[#263036] sm:flex-row sm:items-center sm:gap-7 sm:p-8">
              <div className="relative shrink-0 p-1.5" aria-hidden="true">
                <div className="pointer-events-none absolute -inset-1 rounded-[54%_46%_48%_52%/46%_54%_46%_54%] bg-gradient-to-tr from-sage/35 via-gold/20 to-terracotta/25 blur-[2px] dark:from-sage/20 dark:via-gold/10 dark:to-terracotta/20" />
                <div className="pointer-events-none absolute inset-0 rounded-[48%_52%_54%_46%/52%_44%_56%_48%] border border-terracotta/30 dark:border-gold/30" />
                <div className={`relative flex h-20 w-20 items-center justify-center rounded-[46%_54%_50%_50%/55%_45%_55%_45%] font-serif text-3xl shadow-sm sm:h-28 sm:w-28 sm:text-4xl ${f.tone}`}>
                  {f.initials}
                </div>
              </div>
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark dark:text-sage">
                  <span className="h-px w-4 bg-terracotta/75" aria-hidden="true" />
                  Co-founder
                </p>
                <h3 className="mt-1.5 break-words text-2xl font-medium text-brand-blue dark:text-[#96B7DA] sm:text-3xl">{f.name}</h3>
                {/* TEMPORARY: replace with the founder's real bio and photo */}
                <p className="mt-3 italic leading-relaxed text-charcoal/70 dark:text-brand-ivory/65">{FOUNDER_BIO_PLACEHOLDER}</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
