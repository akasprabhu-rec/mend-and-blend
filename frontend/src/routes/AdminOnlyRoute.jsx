import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { bookingApi } from "../booking/api.js";

export default function AdminOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const [access, setAccess] = useState({ checking: true, allowed: false, error: "" });

  useEffect(() => {
    if (!user || loading) return undefined;
    let active = true;

    async function verifyAdmin() {
      try {
        await bookingApi("/admin/session", user);
        if (active) setAccess({ checking: false, allowed: true, error: "" });
      } catch (error) {
        if (active) {
          setAccess({ checking: false, allowed: false, error: error.message || "" });
        }
      }
    }

    verifyAdmin();
    return () => {
      active = false;
    };
  }, [user, loading]);

  if (loading || (user && access.checking)) {
    return <p className="p-8 text-center" role="status">Verifying administrator access…</p>;
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (access.error.includes("Administrator access is required")) {
    return <Navigate to="/admin/login" replace />;
  }
  if (!access.allowed) {
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <p className="rounded-2xl border border-terracotta/50 bg-terracotta/10 p-5 text-sm text-terracotta-dark" role="alert">
          {access.error || "Could not verify administrator access. Please try again."}
        </p>
      </main>
    );
  }
  return children;
}
