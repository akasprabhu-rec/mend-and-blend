import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { bookingApi } from "../booking/api.js";
import ThemeToggle from "../components/ui/ThemeToggle.jsx";

export default function AdminLoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!user || loading) return undefined;
    let active = true;
    setChecking(true);
    setError("");

    async function checkAdminAccess() {
      try {
        await user.getIdToken(true);
        await bookingApi("/admin/session", user);
        if (active) navigate("/admin", { replace: true });
      } catch (accessError) {
        if (active && accessError.message.includes("Administrator access is required")) {
          setError("This Google account has not been granted administrator access.");
        } else if (active) {
          setError(accessError.message || "Could not verify administrator access.");
        }
      } finally {
        if (active) setChecking(false);
      }
    }

    checkAdminAccess();
    return () => {
      active = false;
    };
  }, [user, loading, navigate]);

  if (loading) {
    return <p className="p-8 text-center" role="status">Checking your sign-in…</p>;
  }

  if (user && checking) {
    return <p className="p-8 text-center" role="status">Verifying administrator access…</p>;
  }

  async function handleSignIn() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      const signedInUser = await signInWithGoogle();
      await signedInUser.getIdToken(true);
      await bookingApi("/admin/session", signedInUser);
      navigate("/admin", { replace: true });
    } catch (signInError) {
      setError(
        signInError.message.includes("Administrator access is required")
          ? "Google sign-in succeeded, but this account is not an administrator. Ask an existing project owner to grant the admin claim."
          : signInError.message || "Could not sign in to the admin dashboard.",
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
        <section className="mt-8 rounded-3xl border border-brand-blue/20 border-t-4 border-t-brand-blue bg-white p-8 shadow-md dark:border-white/10 dark:border-t-[#8FB2D6] dark:bg-[#21292E] sm:p-10">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-sage-dark dark:text-sage">
            <span className="h-px w-5 bg-gold-dark dark:bg-gold" aria-hidden="true" />
            Administrator access
          </p>
          <h1 className="mt-3 text-4xl font-medium text-brand-blue dark:text-[#96B7DA]">Sign in to the dashboard</h1>
          <p className="mt-4 leading-relaxed text-charcoal/80 dark:text-brand-ivory/80">
            Continue with the Google account that has been granted administrator access. The server
            verifies the account’s trusted Firebase claim before opening the dashboard.
          </p>
          {error && (
            <p className="mt-6 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F0A592]" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleSignIn}
            disabled={submitting}
            className="btn-interactive mt-8 w-full rounded-full bg-brand-blue px-6 py-3 font-medium text-white shadow-sm hover:bg-brand-blue-dark hover:shadow-[0_10px_22px_-8px_rgba(64,95,128,0.42)] dark:bg-[#496D92] dark:hover:bg-[#3B5B7D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-3">
                <span className="loading-spinner" aria-hidden="true" />
                Verifying account…
              </span>
            ) : "Continue with Google"}
          </button>
        </section>
      </main>
    </div>
  );
}
