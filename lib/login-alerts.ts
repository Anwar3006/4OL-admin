/**
 * Shared constants for the super-admin concurrent-login alert
 * (migration: 20260821_admin_login_alerts.sql). Used by both the server
 * routes (/api/admin/session, /api/admin/login-alerts/*) and the client
 * guard (LoginAlertGuard.tsx) so the countdown can never drift.
 */

/** Modal countdown before the new device is implicitly acknowledged. */
export const LOGIN_ALERT_COUNTDOWN_SECONDS = 60;

/**
 * Suppress duplicate alerts raised within this window. Opening extra tabs in
 * the same browser starts a fresh admin_sessions row per tab (sessionStorage
 * is per-tab), and without this guard each new tab would re-raise the modal
 * and re-send the email.
 */
export const LOGIN_ALERT_DEDUPE_MINUTES = 5;
