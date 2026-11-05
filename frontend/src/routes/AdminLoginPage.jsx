import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { bookingApi } from "../booking/api.js";

export default function AdminLoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <Link to="/" className="text-sm font-medium text-olive-dark hover:underline">
        ← Back to Mend and Blend
      </Link>
      <section className="mt-8 rounded-[2rem] border border-rose/30 bg-white/80 p-8 shadow-sm sm:p-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
          Administrator access
        </p>
        <h1 className="mt-3 text-4xl font-medium">Sign in to the dashboard</h1>
        <p className="mt-4 leading-relaxed text-charcoal/75">
          Continue with the Google account that has been granted administrator access. The server
          verifies the account’s trusted Firebase claim before opening the dashboard.
        </p>
        {error && (
          <p className="mt-6 rounded-2xl border border-rose p-4 text-sm" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={submitting}
          className="mt-8 w-full rounded-full bg-brand-blue px-6 py-3 font-medium text-white transition-colors hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Verifying account…" : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}
