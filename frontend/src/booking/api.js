const apiBase = import.meta.env.VITE_API_URL || "";

export async function bookingApi(path, user, options = {}) {
  const token = user ? await user.getIdToken() : null;
  const response = await fetch(`${apiBase}/api${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Request failed (${response.status}).`);
  }
  return result;
}

export function formatWorkshopDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(`${date}T00:00:00+05:30`));
}
