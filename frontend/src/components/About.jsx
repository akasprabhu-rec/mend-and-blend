import Section from "./ui/Section.jsx";
import Reveal from "./ui/Reveal.jsx";
import logo from "../assets/logo.jpg";

const VALUES = [
  {
    title: "Self-discovery",
    text: "Notice what you need, what you carry and what you're ready to let go of.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" />
      </svg>
    ),
  },
  {
    title: "Emotional wellness",
    text: "Make room for feelings without judging them or rushing past them.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20.5s-7-4.35-7-10A4.25 4.25 0 0 1 12 7.4a4.25 4.25 0 0 1 7 3.1c0 5.65-7 10-7 10Z" />
      </svg>
    ),
  },
  {
    title: "Mindfulness",
    text: "Practise being present with your thoughts, your body and the people around you.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    title: "Human connection",
    text: "Be heard, and hear others, in a room built for honest conversation.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="12" r="5" />
        <circle cx="15" cy="12" r="5" />
      </svg>
    ),
  },
];

export default function About() {
  return (
    <Section
      id="about"
      eyebrow="About Mend and Blend"
      title="Mend what feels worn. Blend with what is real."
      intro="Our workshops invite you to explore the mind with curiosity instead of pressure. To mend is to tend to yourself with care. To blend is to bring all your parts, and the people around you, into the same room."
      className="bg-about-atmosphere border-t border-sage/30 dark:border-white/10"
      decorations={
        <svg
          viewBox="0 0 180 180"
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-10 hidden h-40 w-40 text-sage-dark/22 dark:text-sage/18 lg:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        >
          <path d="M144 24 C112 58 98 104 106 156" />
          <path d="M118 70 C92 66 80 80 86 96 C104 96 114 86 118 70 Z" />
          <path d="M106 112 C132 104 148 118 140 134 C122 136 110 126 106 112 Z" />
        </svg>
      }
    >
      <div className="grid items-center gap-12 md:grid-cols-5">
        <Reveal className="mx-auto w-full max-w-sm md:col-span-2">
          <div className="relative">
            <div
              className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-sage/30 via-transparent to-terracotta/20 blur-xl dark:from-sage/15 dark:to-terracotta/15"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -inset-2.5 rounded-3xl border border-gold/50 bg-brand-ivory/80 dark:border-gold/30 dark:bg-[#21292E]"
              aria-hidden="true"
            />
            <div className="image-frame relative rounded-2xl border border-brand-blue/15 bg-[#416187] p-2.5 shadow-lg dark:border-white/15">
              <div className="overflow-hidden rounded-xl">
                <img
                  src={logo}
                  alt="Mend and Blend logo"
                  className="image-frame__img aspect-square w-full object-contain"
                />
              </div>
            </div>
          </div>
        </Reveal>

        <ul className="grid gap-5 sm:grid-cols-2 md:col-span-3">
          {VALUES.map((v, i) => (
            <Reveal
              as="li"
              key={v.title}
              delay={i * 100}
              className="h-full"
            >
              <article className="feature-card group h-full rounded-2xl border border-sage/50 bg-brand-ivory/95 p-6 shadow-sm hover:bg-white hover:shadow-md dark:border-white/10 dark:bg-[#21292E] dark:hover:bg-[#263036]">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center rounded-full border border-gold/70 bg-gold/25 px-3 py-0.5 text-xs font-semibold tracking-[0.16em] text-terracotta-dark dark:border-gold/40 dark:bg-gold/15 dark:text-gold">
                    0{i + 1}
                  </span>
                  <span className="feature-card__icon flex h-9 w-9 items-center justify-center rounded-full bg-sage/25 text-brand-blue ring-1 ring-brand-blue/20 group-hover:bg-terracotta/18 group-hover:text-terracotta-dark group-hover:ring-terracotta/45 dark:bg-white/8 dark:text-[#96B7DA] dark:ring-white/15 dark:group-hover:bg-terracotta/25 dark:group-hover:text-terracotta dark:group-hover:ring-terracotta/50">
                    {v.icon}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-medium text-brand-blue dark:text-[#96B7DA]">{v.title}</h3>
                <p className="mt-2 leading-relaxed text-charcoal/80 dark:text-brand-ivory/80">{v.text}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
