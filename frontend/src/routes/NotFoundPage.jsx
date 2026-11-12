import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-ivory via-sage/15 to-brand-ivory">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-sage/45 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark">404</p>
          <h1 className="mt-2 text-4xl font-medium text-brand-blue">Page not found</h1>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-terracotta-dark px-6 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#9D4D38]"
          >
            Return to the homepage
          </Link>
        </div>
      </main>
    </div>
  );
}
