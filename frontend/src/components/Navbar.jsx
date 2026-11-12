import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";
import Button from "./ui/Button.jsx";
import ThemeToggle from "./ui/ThemeToggle.jsx";
import { NAV_LINKS } from "../data/siteData.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { bookingApi } from "../booking/api.js";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const signingOutRef = useRef(false);
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const close = () => setOpen(false);
  const sectionHref = (href) => location.pathname === "/" ? href : `/${href}`;

  useEffect(() => {
    if (!user || loading) {
      setIsAdmin(false);
      return undefined;
    }

    let active = true;
    setIsAdmin(false);
    bookingApi("/admin/session", user)
      .then(() => {
        if (active) setIsAdmin(true);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [user, loading]);

  async function handleSignOut() {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setAuthError("");
    setSigningOut(true);
    try {
      await signOut();
      close();
      navigate("/", { replace: true });
    } catch (error) {
      setAuthError(error.message || "Could not sign out. Please try again.");
    } finally {
      signingOutRef.current = false;
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gold/25 bg-brand-blue text-white shadow-sm transition-colors duration-200 dark:border-gold/20 dark:bg-[#2A4058]">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link to="/" onClick={close} className="flex items-center gap-3">
          <img src={logo} alt="" className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/25" />
          <span className="font-serif text-2xl font-medium tracking-wide text-white">Mend and Blend</span>
        </Link>

        <ul className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={sectionHref(link.href)}
                aria-current={location.pathname === "/" && location.hash === link.href ? "location" : undefined}
                className={`nav-link text-sm font-medium text-brand-ivory/95 hover:text-white ${
                  location.pathname === "/" && location.hash === link.href ? "nav-link-active font-semibold" : ""
                }`}
              >
                {link.label}
              </a>
            </li>
          ))}
          {isAdmin && (
            <li>
              <Link
                to="/admin"
                aria-current={location.pathname.startsWith("/admin") ? "page" : undefined}
                className={`nav-link text-sm font-medium text-brand-ivory/95 hover:text-white ${
                  location.pathname.startsWith("/admin") ? "nav-link-active font-semibold" : ""
                }`}
              >
                Admin Dashboard
              </Link>
            </li>
          )}
        </ul>
        <Button
          href={sectionHref("#workshops")}
          variant="accent"
          className="!hidden border border-white/15 bg-terracotta text-[#181E22] font-semibold shadow-sm hover:bg-[#CC725B] hover:text-[#181E22] dark:bg-terracotta dark:text-[#181E22] dark:hover:bg-[#CC725B] md:!inline-flex"
        >
          Register
        </Button>
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link
                to="/my-reservations"
                aria-current={location.pathname === "/my-reservations" ? "page" : undefined}
                className={`nav-link text-sm font-medium text-brand-ivory/95 hover:text-white ${
                  location.pathname === "/my-reservations" ? "nav-link-active font-semibold" : ""
                }`}
              >
                My Reservations
              </Link>
              <Link
                to="/my-tickets"
                aria-current={location.pathname === "/my-tickets" ? "page" : undefined}
                className={`nav-link text-sm font-medium text-brand-ivory/95 hover:text-white ${
                  location.pathname === "/my-tickets" ? "nav-link-active font-semibold" : ""
                }`}
              >
                My tickets
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="text-sm font-medium text-brand-ivory/90 hover:text-gold hover:underline disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <Link to="/login" className="nav-link text-sm font-medium text-brand-ivory/95 hover:text-white">
              Sign in
            </Link>
          )}
          <ThemeToggle variant="navbar" />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle variant="navbar" compact />
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-full p-2 text-white hover:bg-white/10"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="mobile-menu-enter border-t border-white/15 bg-brand-blue-dark/40 px-6 pb-6 dark:bg-[#1E2E3F]/80 md:hidden">
          <ul className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={sectionHref(link.href)}
                  onClick={close}
                  aria-current={location.pathname === "/" && location.hash === link.href ? "location" : undefined}
                  className={`nav-link block py-3 text-lg font-medium text-brand-ivory/95 hover:text-white ${
                    location.pathname === "/" && location.hash === link.href ? "nav-link-active font-semibold" : ""
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
            {isAdmin && (
              <li>
                <Link
                  to="/admin"
                  onClick={close}
                  aria-current={location.pathname.startsWith("/admin") ? "page" : undefined}
                  className={`nav-link block py-3 text-lg font-medium text-brand-ivory/95 hover:text-white ${
                    location.pathname.startsWith("/admin") ? "nav-link-active font-semibold" : ""
                  }`}
                >
                  Admin Dashboard
                </Link>
              </li>
            )}
          </ul>
          {user ? (
            <div className="mb-4 flex flex-col gap-3 border-t border-white/15 pt-4">
              <Link
                to="/my-reservations"
                onClick={close}
                aria-current={location.pathname === "/my-reservations" ? "page" : undefined}
                className={`nav-link py-2 text-lg font-medium text-brand-ivory/95 hover:text-white ${
                  location.pathname === "/my-reservations" ? "nav-link-active font-semibold" : ""
                }`}
              >
                My Reservations
              </Link>
              <Link
                to="/my-tickets"
                onClick={close}
                aria-current={location.pathname === "/my-tickets" ? "page" : undefined}
                className={`nav-link py-2 text-lg font-medium text-brand-ivory/95 hover:text-white ${
                  location.pathname === "/my-tickets" ? "nav-link-active font-semibold" : ""
                }`}
              >
                My tickets
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="py-2 text-left text-brand-ivory/90 hover:text-gold disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={close} className="mb-4 block border-t border-white/15 py-3 pt-4 text-lg font-medium text-brand-ivory/95 hover:text-white">
              Sign in
            </Link>
          )}
          <Button
            href={sectionHref("#workshops")}
            onClick={close}
            variant="accent"
            className="w-full border border-white/15 bg-terracotta text-[#181E22] font-semibold hover:bg-[#CC725B] hover:text-[#181E22] dark:bg-terracotta dark:text-[#181E22] dark:hover:bg-[#CC725B]"
          >
            Register for a workshop
          </Button>
        </div>
      )}
      {authError && (
        <div className="mx-auto max-w-6xl px-6 pb-3">
          <p className="rounded-xl bg-terracotta-dark px-4 py-2 text-sm text-white" role="alert">
            {authError}
          </p>
        </div>
      )}
    </header>
  );
}
