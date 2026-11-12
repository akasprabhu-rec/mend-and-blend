import { Link } from "react-router-dom";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-ivory via-sage/15 to-brand-ivory dark:from-[#181E22] dark:via-[#1C2322] dark:to-[#181E22]">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <div className="flex justify-end">
          <ThemeToggle variant="surface" />
        </div>
        <div className="mt-6 rounded-3xl border border-sage/45 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-[#21292E] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark dark:text-sage">404</p>
          <h1 className="mt-2 text-4xl font-medium text-brand-blue dark:text-[#96B7DA]">Page not found</h1>
          <Link
            to="/"
            className="btn-interactive mt-6 inline-flex items-center justify-center rounded-full bg-terracotta-dark px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#9D4D38] hover:shadow-[0_10px_22px_-8px_rgba(181,91,68,0.42)] dark:bg-terracotta dark:font-semibold dark:text-[#181E22] dark:hover:bg-[#CC725B]"
          >
            Return to the homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
