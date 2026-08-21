/**
 * Shared fetch helper for hooks talking to our own /api routes.
 * Gap Analysis Part M Phase 3: hooks migrate off client-side Supabase and
 * onto RBAC-guarded server routes. Throws Error with the server message so
 * TanStack Query onError/toasts keep working unchanged.
 */

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // Non-JSON responses fall through to the generic message below.
  }

  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export const jsonBody = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
