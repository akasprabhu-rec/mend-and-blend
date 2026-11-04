import Section from "./ui/Section.jsx";
import Reveal from "./ui/Reveal.jsx";
import FaceLine from "./ui/FaceLine.jsx";

const VALUES = [
  { title: "Self-discovery", text: "Notice what you need, what you carry and what you're ready to let go of." },
  { title: "Emotional wellness", text: "Make room for feelings without judging them or rushing past them." },
  { title: "Mindfulness", text: "Practise being present with your thoughts, your body and the people around you." },
  { title: "Human connection", text: "Be heard, and hear others, in a room built for honest conversation." },
];

export default function About() {
  return (
    <Section
      id="about"
      eyebrow="About Mend and Blend"
      title="Mend what feels worn. Blend with what is real."
      intro="Our workshops invite you to explore the mind with curiosity instead of pressure. To mend is to tend to yourself with care. To blend is to bring all your parts, and the people around you, into the same room."
    >
      <div className="grid items-center gap-12 md:grid-cols-5">
        <Reveal className="relative mx-auto aspect-[4/3] w-full max-w-md md:col-span-2">
          <div className="absolute inset-0 rounded-[48%_52%_44%_56%/52%_46%_54%_48%] bg-lavender/25" />
          <FaceLine className="absolute left-[2%] top-[8%] h-4/5 w-1/2 text-lavender-dark" />
          <FaceLine flip className="absolute right-[2%] top-[8%] h-4/5 w-1/2 text-charcoal" />
        </Reveal>

        <ul className="grid gap-5 sm:grid-cols-2 md:col-span-3">
          {VALUES.map((v, i) => (
            <Reveal as="li" key={v.title} delay={i * 100} className="rounded-3xl border border-charcoal/10 bg-white/50 p-6">
              <p className="text-sm font-medium text-olive-dark">0{i + 1}</p>
              <h3 className="mt-2 text-2xl font-medium">{v.title}</h3>
              <p className="mt-2 leading-relaxed text-charcoal/80">{v.text}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </Section>
  );
}
