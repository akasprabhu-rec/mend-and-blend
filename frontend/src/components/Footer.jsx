import logo from "../assets/logo.jpg";
import { NAV_LINKS, SITE } from "../data/siteData.js";

export default function Footer() {
  return (
    <footer className="bg-brand-blue px-6 py-14 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-12 w-12 rounded-xl object-cover" />
            <span className="font-serif text-2xl">Mend and Blend</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/80">
            Psychology-inspired workshops for self-discovery, emotional wellness and human connection.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-2 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-white/80 hover:text-white">{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="text-sm leading-relaxed text-white/80">
          <p>{SITE.phoneDisplay}</p>
          <p className="break-all">{SITE.email}</p>
          <p className="mt-2">Nungambakkam, Chennai</p>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl border-t border-white/20 pt-6 text-xs text-white/70">
        © {new Date().getFullYear()} Mend and Blend. All rights reserved.
      </p>
    </footer>
  );
}
