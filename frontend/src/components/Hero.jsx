import Button from "./ui/Button.jsx";
import logo from "../assets/logo.jpg";

export default function Hero() {
  return (
    <section
      id="home"
      className="bg-hero-atmosphere relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sage/25 blur-3xl dark:bg-sage/10" />
        <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-terracotta/14 blur-3xl dark:bg-terracotta/10" />
        <div className="absolute right-1/3 top-1/4 h-64 w-64 rounded-full bg-gold/15 blur-3xl dark:bg-gold/8" />
        <svg
          viewBox="0 0 220 220"
          className="absolute right-[4%] top-8 hidden h-48 w-48 text-sage-dark/25 dark:text-sage/20 lg:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        >
          <path d="M180 28 C140 62 126 112 132 184" />
          <path d="M148 78 C122 72 106 86 112 104 C132 104 144 94 148 78 Z" />
          <path d="M134 124 C162 114 182 126 176 146 C154 148 140 138 134 124 Z" />
        </svg>
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:pb-24 md:pt-24 lg:gap-20">
        <div className="animate-fade-up">
          <p className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-sage/60 bg-sage/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark dark:border-sage/35 dark:bg-sage/15 dark:text-sage">
            <span className="h-2 w-2 rounded-full bg-terracotta" aria-hidden="true" />
            Psychology-inspired workshops · Chennai
          </p>
          <h1 className="text-5xl leading-[1.06] font-medium text-brand-blue dark:text-[#96B7DA] sm:text-6xl lg:text-7xl">
            Listen inward.
            <br />
            <em className="italic text-terracotta-dark dark:text-terracotta">Grow outward.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-charcoal/85 dark:text-brand-ivory/85">
            Mend and Blend is a quiet space for self-discovery, emotional wellness and human
            connection. Slow down, understand your inner world and meet others with honesty.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button href="#workshops" variant="accent">Explore workshops</Button>
            <Button href="#about" variant="secondary">Our story</Button>
          </div>
          <p className="mt-8 inline-flex items-center gap-2.5 text-sm text-charcoal/70 dark:text-brand-ivory/65">
            <span className="h-px w-5 bg-gold-dark/60 dark:bg-gold/60" aria-hidden="true" />
            Explore upcoming events and workshops below.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div
            className="pointer-events-none absolute -inset-6 rounded-full bg-terracotta/18 blur-2xl dark:bg-terracotta/16"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -inset-3 rounded-[2.25rem] border border-terracotta/30 bg-gradient-to-tr from-sage/30 via-transparent to-terracotta/25 dark:border-gold/30 dark:from-sage/15 dark:to-terracotta/15"
            aria-hidden="true"
          />
          <div className="image-frame relative rounded-3xl border border-brand-blue/15 bg-[#416187] p-3 shadow-[0_22px_50px_-15px_rgba(64,95,128,0.35)] dark:border-white/15 dark:shadow-[0_24px_54px_-15px_rgba(0,0,0,0.65)]">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={logo}
                alt="Mend and Blend logo, featuring two helping hands within an arch"
                className="image-frame__img aspect-square w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
