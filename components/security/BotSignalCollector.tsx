"use client";

import { useEffect } from "react";

/**
 * Part AK (AK-D8) — headless/agent detection + copy telemetry.
 *
 * On mount, probes the classic automation fingerprints (navigator.webdriver,
 * HeadlessChrome UA, missing window.chrome on Chrome, zero outer size,
 * missing languages array). If any trip, a 'headless_indicators' signal is
 * posted to /api/admin/security/signals. No blocking happens client-side —
 * detection feeds the server-side picture; hard challenges belong to the
 * login flow (Turnstile/OTP step-up, tracked as AK-D8.2).
 *
 * Separately, every document 'copy'/'cut' event is reported with ONLY the
 * selection length and current route — never the selected text itself, so
 * the telemetry channel can't become a PII side-channel. Bursts of large
 * copies are the signature of scripted extraction (manual or AI-driven).
 */

const SIGNALS_ENDPOINT = "/api/admin/security/signals";

function postSignal(kind: string, detail: Record<string, unknown>) {
  try {
    void fetch(SIGNALS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, detail }),
    }).catch(() => {
      // Telemetry is best-effort.
    });
  } catch {
    // ignore
  }
}

export default function BotSignalCollector() {
  useEffect(() => {
    // ── One-time headless fingerprint probe ────────────────────────────────
    const indicators: string[] = [];
    if (navigator.webdriver) indicators.push("navigator.webdriver");
    if (/HeadlessChrome/i.test(navigator.userAgent)) indicators.push("headless_ua");
    if (/Chrome/.test(navigator.userAgent) && !(window as unknown as { chrome?: unknown }).chrome) {
      indicators.push("chrome_object_missing");
    }
    if (window.outerWidth === 0 && window.outerHeight === 0) indicators.push("zero_outer_size");
    if (!navigator.languages || navigator.languages.length === 0) indicators.push("no_languages");
    // AI computer-use drivers frequently run with CDP artifacts exposed.
    const doc = document as unknown as { $cdc_asdjflasutdffhvcZLCmc?: unknown };
    if (doc.$cdc_asdjflasutdffhvcZLCmc) indicators.push("chromedriver_artifact");

    if (indicators.length > 0) {
      postSignal("headless_indicators", {
        indicators,
        user_agent: navigator.userAgent.slice(0, 400),
        route: window.location.pathname,
      });
    }

    // ── Copy/cut telemetry (length only — never content) ─────────────────
    const onCopy = (event: ClipboardEvent) => {
      const length = (window.getSelection()?.toString() ?? "").length;
      if (length === 0) return;
      postSignal("copy_event", {
        type: event.type,
        selection_length: length,
        route: window.location.pathname,
      });
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);

    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
    };
  }, []);

  return null;
}
