import Section from "./ui/Section.jsx";
import Reveal from "./ui/Reveal.jsx";
import Button from "./ui/Button.jsx";
import { SITE } from "../data/siteData.js";

export default function Contact() {
  return (
    <Section
      id="contact"
      eyebrow="Venue and contact"
      title="Come find us in Nungambakkam"
      intro="Questions about a session, or unsure which one is right for you? Reach out and we'll gladly help."
      className="bg-rose/20"
    >
      <div className="grid gap-8 md:grid-cols-2">
        <Reveal className="rounded-[2rem] bg-ivory p-8">
          <h3 className="text-2xl font-medium">Venue</h3>
          <address className="mt-3 leading-relaxed not-italic text-charcoal/85">
            {SITE.addressLines.map((line) => (
              <span key={line} className="block">{line}</span>
            ))}
          </address>
          <Button href={SITE.mapsUrl} variant="secondary" target="_blank" rel="noopener noreferrer" className="mt-6">
            Open in Google Maps
          </Button>
        </Reveal>

        <Reveal delay={120} className="rounded-[2rem] bg-ivory p-8">
          <h3 className="text-2xl font-medium">Get in touch</h3>
          <dl className="mt-3 space-y-4">
            <div>
              <dt className="text-sm font-medium text-olive-dark">Phone / WhatsApp</dt>
              <dd>
                <a className="text-lg underline-offset-4 hover:underline" href={`tel:${SITE.phoneTel}`}>
                  {SITE.phoneDisplay}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-olive-dark">Email</dt>
              <dd>
                <a className="break-all text-lg underline-offset-4 hover:underline" href={`mailto:${SITE.email}`}>
                  {SITE.email}
                </a>
              </dd>
            </div>
          </dl>
          <Button
            href={`https://wa.me/${SITE.whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6"
          >
            Chat on WhatsApp
          </Button>
        </Reveal>
      </div>
    </Section>
  );
}
