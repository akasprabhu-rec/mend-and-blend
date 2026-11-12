import { useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { firebaseConfigured } from "../firebase.js";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  if (loading) return <p className="p-8 text-center" role="status">Checking your sign-in…</p>;
  if (user) return <Navigate to="/my-tickets" replace />;

  async function handleGoogleSignIn() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      const destination = location.state?.from
        ? `${location.state.from.pathname || "/my-tickets"}${location.state.from.search || ""}${location.state.from.hash || ""}`
        : "/my-tickets";
      navigate(destination, { replace: true });
    } catch (signInError) {
      setError(
        signInError.code === "auth/popup-closed-by-user"
          ? "The Google sign-in window was closed before sign-in completed."
          : signInError.code === "auth/unauthorized-domain"
            ? "This domain is not authorized in Firebase Authentication."
            : signInError.message || "Google sign-in failed. Please try again.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-ivory via-sage/15 to-brand-ivory dark:from-[#181E22] dark:via-[#1C2322] dark:to-[#181E22]">
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="text-sm font-medium text-brand-blue underline-offset-4 hover:text-terracotta-dark hover:underline dark:text-[#96B7DA] dark:hover:text-gold">
            ← Back to Mend and Blend
          </Link>
          <ThemeToggle variant="surface" />
        </div>
        <section className="mt-8 rounded-3xl border border-sage/45 border-t-4 border-t-terracotta bg-white p-8 shadow-md dark:border-white/10 dark:border-t-terracotta dark:bg-[#21292E] sm:p-10">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark dark:text-sage">
            <span className="h-px w-5 bg-terracotta" aria-hidden="true" />
            Customer account
          </p>
          <h1 className="mt-3 text-4xl font-medium text-brand-blue dark:text-[#96B7DA]">Sign in to your account</h1>
          <p className="mt-4 leading-relaxed text-charcoal/80 dark:text-brand-ivory/80">
            Use your Google account to view your workshop tickets. We do not offer email and password
            registration.
          </p>

          {!firebaseConfigured && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F0A592]" role="alert">
              Firebase is not configured. Add the frontend Firebase values to{" "}
              <code>frontend/.env</code>, then restart the development server.
            </p>
          )}
          {error && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F0A592]" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={!firebaseConfigured || submitting}
            className="btn-interactive mt-8 w-full rounded-full bg-brand-blue px-6 py-3 font-medium text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.42)] dark:bg-[#496D92] dark:hover:bg-[#3B5B7D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-3">
                <span className="loading-spinner" aria-hidden="true" />
                Signing in with Google…
              </span>
            ) : "Continue with Google"}
          </button>
          <p className="mt-6 text-center text-sm text-charcoal/70 dark:text-brand-ivory/70">
            Administrator?{" "}
            <Link to="/admin/login" className="font-medium text-terracotta-dark underline underline-offset-4 hover:text-brand-blue dark:text-terracotta dark:hover:text-gold">
              Open the admin sign-in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
