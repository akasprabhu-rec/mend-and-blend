import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import Button from "./ui/Button.jsx";
import { NAV_LINKS } from "../data/siteData.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const { user, signOut } = useAuth();
  const close = () => setOpen(false);

  async function handleSignOut() {
    setAuthError("");
    try {
      await signOut();
      close();
    } catch (error) {
      setAuthError(error.message || "Could not sign out. Please try again.");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-charcoal/10 bg-ivory/90 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" onClick={close} className="flex items-center gap-3">
          <img src={logo} alt="" className="h-11 w-11 rounded-xl object-cover" />
          <span className="font-serif text-2xl font-medium">Mend and Blend</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm font-medium hover:text-lavender-dark">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <Button href="#workshops" className="!hidden md:!inline-flex">
          Register
        </Button>
        <div className="hidden items-center gap-4 md:flex">
          {user ? (
            <>
              <Link to="/my-tickets" className="text-sm font-medium hover:text-lavender-dark">
                My tickets
              </Link>
              <button type="button" onClick={handleSignOut} className="text-sm hover:underline">
                Sign out
              </button>
            </>
          ) : (
            <Link to="/login" className="text-sm font-medium hover:text-lavender-dark">
              Sign in
            </Link>
          )}
        </div>

        <button
          type="button"
          className="min-h-11 min-w-11 rounded-full p-2 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-charcoal/10 px-6 pb-6 md:hidden">
          <ul className="flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={close} className="block py-3 text-lg font-medium">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          {user ? (
            <div className="flex flex-col gap-4">
              <Link to="/my-tickets" onClick={close} className="py-2 text-lg font-medium">
                My tickets
              </Link>
              <button type="button" onClick={handleSignOut} className="py-2 text-left">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={close} className="block py-3 text-lg font-medium">
              Sign in
            </Link>
          )}
          <Button href="#workshops" onClick={close} className="w-full">
            Register for a workshop
          </Button>
        </div>
      )}
      {authError && (
        <p className="mx-auto max-w-6xl px-6 pb-3 text-sm text-red-800" role="alert">
          {authError}
        </p>
      )}
    </header>
  );
}
