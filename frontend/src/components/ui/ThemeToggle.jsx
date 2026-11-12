import { useTheme } from "../../theme/ThemeContext.jsx";

export default function ThemeToggle({ variant = "navbar", compact = false, className = "" }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  const styleClass =
    variant === "navbar"
      ? "border-white/25 bg-white/10 text-brand-ivory hover:border-gold/70 hover:bg-white/15 hover:text-gold"
      : "border-charcoal/20 bg-white/85 text-brand-blue hover:border-brand-blue/50 hover:bg-white dark:border-white/15 dark:bg-[#21292E] dark:text-brand-ivory dark:hover:border-gold/60 dark:hover:text-gold";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={`btn-interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-full border text-xs font-medium tracking-wide shadow-xs ${
        compact ? "min-w-11 px-2.5" : "px-3.5 py-2"
      } ${styleClass} ${className}`}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
      {!compact && <span>{isDark ? "Light" : "Dark"}</span>}
    </button>
  );
}

