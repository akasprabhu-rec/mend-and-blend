import { useCallback, useEffect, useState } from "react";
import { bookingApi } from "../../booking/api.js";

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function AdminControls({ admin, user, busy, updateAdmin, removeAdmin }) {
  if (admin.uid === user.uid) {
    return <span className="text-xs text-charcoal/60">Current account — protected</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        aria-label={`Change role for ${admin.email}`}
        value={admin.role}
        disabled={busy !== ""}
        onChange={(event) => updateAdmin(
          admin,
          { role: event.target.value },
          `Change ${admin.email} to ${event.target.value === "super_admin" ? "Super Admin" : "Event Admin"}?`,
        )}
        className="min-h-11 rounded-xl border border-charcoal/20 bg-white px-2 text-sm text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]"
      >
        <option value="event_admin">Event Admin</option>
        <option value="super_admin">Super Admin</option>
      </select>
      <button
        type="button"
        disabled={busy !== ""}
        onClick={() => updateAdmin(
          admin,
          { disabled: !admin.disabled },
          `${admin.disabled ? "Reactivate" : "Deactivate"} ${admin.email}'s administrator account?`,
        )}
        className="min-h-11 rounded-full border border-charcoal/25 px-3 text-sm font-medium text-charcoal hover:border-brand-blue hover:bg-brand-blue/5 hover:text-brand-blue disabled:opacity-50 dark:border-white/20 dark:text-[#E8ECEF] dark:hover:border-[#96B7DA]/60 dark:hover:bg-[#96B7DA]/12 dark:hover:text-[#96B7DA]"
      >
        {admin.disabled ? "Reactivate" : "Deactivate"}
      </button>
      <button
        type="button"
        disabled={busy !== ""}
        onClick={() => removeAdmin(admin)}
        className="min-h-11 rounded-full border border-terracotta/50 px-3 text-sm font-medium text-terracotta-dark hover:bg-terracotta/10 disabled:opacity-50 dark:border-terracotta/45 dark:text-[#F09E88] dark:hover:bg-terracotta/15"
      >
        Remove
      </button>
    </div>
  );
}

export default function AdminAdminsSection({ user }) {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("event_admin");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await bookingApi("/admin/admins", user);
      setAdmins(result.admins);
    } catch (loadError) {
      setError(loadError.message || "Could not load administrators.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  async function addAdmin(event) {
    event.preventDefault();
    setBusy("add");
    setError("");
    setMessage("");
    try {
      await bookingApi("/admin/admins", user, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      setEmail("");
      setMessage("Administrator access granted. The new administrator must sign in again to refresh their token.");
      await loadAdmins();
    } catch (addError) {
      setError(addError.message || "Could not add this administrator.");
    } finally {
      setBusy("");
    }
  }

  async function updateAdmin(admin, changes, confirmation) {
    if (!window.confirm(confirmation)) return;
    setBusy(admin.uid);
    setError("");
    setMessage("");
    try {
      await bookingApi(`/admin/admins/${encodeURIComponent(admin.uid)}`, user, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setMessage("Administrator access updated. They must refresh their sign-in token for role changes to take effect.");
      await loadAdmins();
    } catch (updateError) {
      setError(updateError.message || "Could not update administrator access.");
    } finally {
      setBusy("");
    }
  }

  async function removeAdmin(admin) {
    if (!window.confirm(`Remove administrator access from ${admin.name || admin.email}? They will remain a normal Google-authenticated customer.`)) return;
    setBusy(admin.uid);
    setError("");
    setMessage("");
    try {
      await bookingApi(`/admin/admins/${encodeURIComponent(admin.uid)}`, user, { method: "DELETE" });
      setMessage("Administrator access removed.");
      await loadAdmins();
    } catch (removeError) {
      setError(removeError.message || "Could not remove administrator access.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section id="manage-admins" className="mt-12 scroll-mt-24">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-sage-dark dark:text-sage">
        <span className="h-px w-4 bg-terracotta" aria-hidden="true" />
        Access control
      </p>
      <h2 className="mt-2 text-3xl font-medium text-brand-blue dark:text-[#96B7DA]">Manage admins</h2>
      <p className="mt-2 max-w-3xl text-sm text-charcoal/75 dark:text-[#C5CCD1]">Roles are trusted Firebase Authentication custom claims managed by the backend. Event Admins can manage events and tickets but cannot manage administrators.</p>
      {error && <p className="mt-5 rounded-2xl border border-terracotta/50 bg-terracotta/10 p-4 text-sm text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" role="alert">{error}</p>}
      {message && <p className="mt-5 rounded-2xl border border-sage/60 bg-sage/20 p-4 text-sm text-charcoal dark:border-sage/45 dark:bg-sage/15 dark:text-[#E8ECEF]" role="status">{message}</p>}
      <form onSubmit={addAdmin} className="mt-5 grid gap-3 rounded-3xl border border-sage/45 bg-white p-6 shadow-xs dark:border-white/10 dark:bg-[#21292E] sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="text-sm font-medium text-charcoal dark:text-[#D9DFE3]">Google account email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="person@example.com" className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2.5 font-normal text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]" /></label>
        <label className="text-sm font-medium text-charcoal dark:text-[#D9DFE3]">Role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 w-full rounded-xl border border-charcoal/20 bg-white px-3 py-2.5 font-normal text-charcoal dark:border-white/15 dark:bg-[#192024] dark:text-[#E8ECEF]"><option value="event_admin">Event Admin</option><option value="super_admin">Super Admin</option></select></label>
        <button disabled={busy !== ""} className="btn-interactive rounded-full bg-terracotta-dark px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#9D4D38] hover:shadow-[0_10px_22px_-8px_rgba(181,91,68,0.42)] disabled:opacity-50">{busy === "add" ? "Adding…" : "Add administrator"}</button>
        <p className="text-xs text-charcoal/65 dark:text-[#9DA7AE] sm:col-span-3">The person must have signed in with Google at least once so their Firebase Auth account exists. Only Super Admins can use this section.</p>
      </form>
      {loading && <p className="mt-5 text-charcoal/75 dark:text-[#C5CCD1]" role="status">Loading administrators…</p>}
      {!loading && (
        <>
        <ul className="mt-5 grid gap-3 lg:hidden">
          {admins.map((admin) => (
            <li key={admin.uid} className="min-w-0 rounded-2xl border border-sage/40 bg-white p-4 shadow-xs dark:border-white/10 dark:bg-[#21292E]">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium text-brand-blue dark:text-[#96B7DA]">{admin.name || "Google account"}</p>
                  <p className="mt-1 break-all text-sm text-charcoal/65 dark:text-[#9DA7AE]">{admin.email}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${admin.disabled ? "border-terracotta/45 bg-terracotta/15 text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" : "border-sage/60 bg-sage/30 text-sage-dark dark:border-sage/45 dark:bg-sage/18 dark:text-sage"}`}>
                  {admin.disabled ? "Deactivated" : "Active"}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-charcoal/10 pt-3 text-sm dark:border-white/10">
                <div><dt className="text-xs text-charcoal/60 dark:text-[#9DA7AE]">Role</dt><dd className="dark:text-[#E8ECEF]">{admin.role === "super_admin" ? "Super Admin" : "Event Admin"}</dd></div>
                <div><dt className="text-xs text-charcoal/60 dark:text-[#9DA7AE]">Date added</dt><dd className="dark:text-[#E8ECEF]">{displayDate(admin.createdAt)}</dd></div>
              </dl>
              <div className="mt-3 border-t border-charcoal/10 pt-3 dark:border-white/10">
                <AdminControls admin={admin} user={user} busy={busy} updateAdmin={updateAdmin} removeAdmin={removeAdmin} />
              </div>
            </li>
          ))}
          {admins.length === 0 && <li className="rounded-2xl border border-sage/35 bg-white p-6 text-center text-sm text-charcoal/65 dark:border-white/10 dark:bg-[#21292E] dark:text-[#9DA7AE]">No administrator claims found.</li>}
        </ul>
        <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-sage/40 bg-white shadow-xs dark:border-white/10 dark:bg-[#21292E] lg:block">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-sage/15 text-xs font-semibold uppercase tracking-wide text-sage-dark dark:bg-white/5 dark:text-sage"><tr><th className="px-4 py-3.5">Administrator</th><th className="px-4 py-3.5">Role</th><th className="px-4 py-3.5">Date added</th><th className="px-4 py-3.5">Account status</th><th className="px-4 py-3.5">Actions</th></tr></thead>
            <tbody className="divide-y divide-charcoal/10 dark:divide-white/10">
              {admins.map((admin) => {
                return (
                  <tr key={admin.uid} className="transition-colors hover:bg-brand-ivory/60 dark:hover:bg-white/5">
                    <td className="px-4 py-4"><p className="font-medium text-brand-blue dark:text-[#96B7DA]">{admin.name || "Google account"}</p><p className="mt-1 text-xs text-charcoal/65 dark:text-[#9DA7AE]">{admin.email}</p></td>
                    <td className="px-4 py-4 dark:text-[#E8ECEF]">{admin.role === "super_admin" ? "Super Admin" : "Event Admin"}</td>
                    <td className="px-4 py-4 dark:text-[#C5CCD1]">{displayDate(admin.createdAt)}</td>
                    <td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-semibold ${admin.disabled ? "border-terracotta/45 bg-terracotta/15 text-terracotta-dark dark:border-terracotta/45 dark:bg-terracotta/15 dark:text-[#F09E88]" : "border-sage/60 bg-sage/30 text-sage-dark dark:border-sage/45 dark:bg-sage/18 dark:text-sage"}`}>{admin.disabled ? "Deactivated" : "Active"}</span></td>
                    <td className="px-4 py-4">
                      <AdminControls admin={admin} user={user} busy={busy} updateAdmin={updateAdmin} removeAdmin={removeAdmin} />
                    </td>
                  </tr>
                );
              })}
              {admins.length === 0 && <tr><td className="px-4 py-8 text-center text-charcoal/65 dark:text-[#9DA7AE]" colSpan="5">No administrator claims found.</td></tr>}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}
