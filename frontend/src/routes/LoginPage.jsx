import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { firebaseConfigured } from "../firebase.js";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <p className="p-8 text-center" role="status">Checking your sign-in…</p>;
  if (user) return <Navigate to="/my-tickets" replace />;

  async function handleGoogleSignIn() {
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
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <Link to="/" className="text-sm font-medium text-olive-dark hover:underline">
        ← Back to Mend and Blend
      </Link>
      <section className="mt-8 rounded-[2rem] bg-white/70 p-8 shadow-sm sm:p-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-olive-dark">
          Customer account
        </p>
        <h1 className="mt-3 text-4xl font-medium">Sign in to your account</h1>
        <p className="mt-4 leading-relaxed text-charcoal/75">
          Use your Google account to view your workshop tickets. We do not offer email and password
          registration.
        </p>

        {!firebaseConfigured && (
          <p className="mt-6 rounded-2xl border border-rose p-4 text-sm" role="alert">
            Firebase is not configured. Add the frontend Firebase values to{" "}
            <code>frontend/.env</code>, then restart the development server.
          </p>
        )}
        {error && <p className="mt-6 text-sm text-red-800" role="alert">{error}</p>}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={!firebaseConfigured || submitting}
          className="mt-8 w-full rounded-full bg-brand-blue px-6 py-3 font-medium text-white transition-colors hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Continue with Google"}
        </button>
        <p className="mt-6 text-center text-sm text-charcoal/70">
          Administrator?{" "}
          <Link to="/admin/login" className="font-medium text-olive-dark underline">
            Open the admin sign-in
          </Link>
        </p>
      </section>
    </main>
  );
}
