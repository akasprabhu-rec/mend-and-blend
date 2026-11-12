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
      className="border-t border-sage/35 bg-gradient-to-br from-brand-blue/[0.06] via-sage/20 to-terracotta/12 dark:border-white/10 dark:from-[#1A232B] dark:via-[#1C2422] dark:to-[#241E1E]"
    >
      <div className="grid gap-8 md:grid-cols-2">
        <Reveal className="h-full">
          <article className="contact-card flex h-full flex-col justify-between rounded-3xl border border-sage/50 bg-white p-8 shadow-sm hover:border-terracotta/45 hover:shadow-md dark:border-white/10 dark:bg-[#21292E] dark:hover:border-terracotta/45">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-sage/50 bg-sage/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sage-dark dark:border-sage/35 dark:bg-sage/15 dark:text-sage">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-dark dark:bg-sage" aria-hidden="true" />
                Our space
              </span>
              <h3 className="mt-4 text-3xl font-medium text-brand-blue dark:text-[#96B7DA]">Venue</h3>
              <address className="mt-4 leading-relaxed not-italic text-charcoal/85 dark:text-brand-ivory/80">
                {SITE.addressLines.map((line) => (
                  <span key={line} className="block">{line}</span>
                ))}
              </address>
            </div>
            <Button href={SITE.mapsUrl} variant="secondary" target="_blank" rel="noopener noreferrer" className="mt-7 self-start">
              Open in Google Maps
            </Button>
          </article>
        </Reveal>

        <Reveal delay={120} className="h-full">
          <article className="contact-card flex h-full flex-col justify-between rounded-3xl border border-brand-blue bg-brand-blue p-8 text-white shadow-lg hover:border-gold/45 hover:shadow-xl dark:border-gold/25 dark:bg-[#2A4058] dark:hover:border-gold/45">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                <span className="h-1.5 w-1.5 rounded-full bg-terracotta" aria-hidden="true" />
                Direct line
              </span>
              <h3 className="mt-4 text-3xl font-medium text-white">Get in touch</h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F2D9A6]">Phone / WhatsApp</dt>
                  <dd className="mt-1">
                    <a className="text-lg text-white underline-offset-4 decoration-terracotta/80 transition-colors duration-250 hover:text-gold hover:underline" href={`tel:${SITE.phoneTel}`}>
                      {SITE.phoneDisplay}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F2D9A6]">Email</dt>
                  <dd className="mt-1">
                    <a className="break-all text-lg text-white underline-offset-4 decoration-terracotta/80 transition-colors duration-250 hover:text-gold hover:underline" href={`mailto:${SITE.email}`}>
                      {SITE.email}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
            <Button
              href={`https://wa.me/${SITE.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 self-start border border-white/15 bg-terracotta text-[#181E22] font-semibold shadow-sm hover:bg-[#CC725B] hover:text-[#181E22] dark:bg-terracotta dark:text-[#181E22] dark:hover:bg-[#CC725B]"
            >
              Chat on WhatsApp
            </Button>
          </article>
        </Reveal>
      </div>
    </Section>
  );
}
