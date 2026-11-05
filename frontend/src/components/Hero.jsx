import Button from "./ui/Button.jsx";
import logo from "../assets/logo.jpg";

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
            Explore upcoming events and workshops below.
          </p>
        </div>

        <img
          src={logo}
          alt="Mend and Blend logo, featuring two helping hands within an arch"
          className="mx-auto aspect-square w-full max-w-md object-contain"
        />
      </div>
    </section>
  );
}
