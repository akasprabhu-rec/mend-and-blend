import Button from "./ui/Button.jsx";
import FaceLine from "./ui/FaceLine.jsx";

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:pt-24 lg:gap-20">
        <div className="animate-fade-up">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
            Psychology-inspired workshops · Chennai
          </p>
          <h1 className="text-5xl leading-[1.05] font-medium sm:text-6xl lg:text-7xl">
            Listen inward.
            <br />
            <em className="text-lavender-dark">Grow outward.</em>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-charcoal/80">
            Mend and Blend is a quiet space for self-discovery, emotional wellness and human
            connection. Slow down, understand your inner world and meet others with honesty.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button href="#workshops">Explore workshops</Button>
            <Button href="#about" variant="secondary">Our story</Button>
          </div>
          <p className="mt-8 text-sm text-charcoal/70">
            Next workshop day: 12 December 2026 · Nungambakkam, Chennai
          </p>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-0 animate-float rounded-[58%_42%_47%_53%/46%_55%_45%_54%] bg-sage/50" />
          <div className="absolute inset-8 animate-float rounded-[44%_56%_52%_48%/55%_45%_55%_45%] bg-rose/40 [animation-delay:-4s]" />
          <FaceLine className="absolute inset-0 h-full w-full p-10 text-charcoal" />
        </div>
      </div>
    </section>
  );
}
