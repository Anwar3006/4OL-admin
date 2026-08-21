/**
 * Client-side auth hardening (security audit follow-up):
 *
 * 1. Progressive lockout — after repeated failed logins the form stops
 *    calling Supabase until a back-off window elapses. Supabase Auth
 *    also rate-limits on the server side; this layer gives instant UX
 *    feedback and throttles scripted attempts per-browser.
 * 2. Honeypot — a hidden field humans never see; bots that fill it are
 *    rejected silently (no auth call is made).
 */

const LOCK_KEY = "4ol_admin_login_lock";
const MAX_ATTEMPTS = 5;
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 600;

type LockState = {
  failures: number;
  lockedUntil: number;
};

function readState(): LockState {
  if (typeof window === "undefined") return { failures: 0, lockedUntil: 0 };
  try {
    const raw = window.sessionStorage.getItem(LOCK_KEY);
    if (!raw) return { failures: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<LockState>;
    return {
      failures: Number(parsed.failures ?? 0),
      lockedUntil: Number(parsed.lockedUntil ?? 0),
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

function writeState(state: LockState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LOCK_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode) — degrade to no lockout.
  }
}

/** Returns the remaining lock window, if any. */
export function getLoginLock(): { locked: boolean; retryAfterSeconds: number } {
  const state = readState();
  const remainingMs = state.lockedUntil - Date.now();
  if (remainingMs <= 0) return { locked: false, retryAfterSeconds: 0 };
  return { locked: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

/** Call after a failed sign-in; escalates the lock past MAX_ATTEMPTS. */
export function recordLoginFailure(): void {
  const state = readState();
  const failures = state.failures + 1;
  let lockedUntil = 0;
  if (failures >= MAX_ATTEMPTS) {
    // Double the lock per extra failure, capped at MAX_LOCK_SECONDS.
    const overshoot = failures - MAX_ATTEMPTS;
    const lockSeconds = Math.min(
      BASE_LOCK_SECONDS * 2 ** overshoot,
      MAX_LOCK_SECONDS,
    );
    lockedUntil = Date.now() + lockSeconds * 1000;
  }
  writeState({ failures, lockedUntil });
}

/** Call after a successful sign-in to reset the counter. */
export function clearLoginFailures(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LOCK_KEY);
  } catch {
    // ignore
  }
}

/**
 * Honeypot check — the trap field must stay empty. Bots that fill it
 * are treated as spam; callers should abort without hitting auth APIs.
 */
export function isHoneypotTripped(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}
