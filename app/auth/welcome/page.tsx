"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "@/lib/db/env";
import { Loader2, ShieldCheck } from "lucide-react";

/**
 * Public landing page for the provider invite link (P0-06, D9). Reached from
 * email/WhatsApp/SMS after registerProviderAccount() — see
 * lib/provider-invite.ts, which builds this URL from a magiclink
 * hashed_token and never sends Supabase's own action_link.
 *
 * Does NOT verify the token on page load: a link-preview bot (WhatsApp,
 * email scanners) fetching this URL would otherwise burn the one-time token
 * before the real owner taps it. Verification only happens if they choose
 * "Set password on the web".
 *
 * This client is deliberately its own instance, not
 * lib/db/isolated-auth.ts's getIsolatedAuthClient() — that module documents
 * itself as single-caller (the /delete-account page). Same problem
 * (a public page's sign-in must never touch whoever's admin session is
 * already in this browser), same fix (a localStorage-backed client, isolated
 * from the cookie-based admin session by construction), different call site.
 */
function getPageAuthClient() {
  return createClient(supabaseUrl(), supabaseAnonKey());
}

type FallbackState = "hidden" | "choices" | "password_form" | "done" | "expired";

export default function WelcomePage() {
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "magiclink";

  const [fallback, setFallback] = useState<FallbackState>("hidden");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!tokenHash) {
    return (
      <Shell>
        <ErrorCard title="Invalid link">
          This invite link is missing its token. Ask 4 Our Life to resend your invite.
        </ErrorCard>
      </Shell>
    );
  }

  const handleContinue = () => {
    window.location.href = `fourourlifebusiness://auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;
    window.setTimeout(() => setFallback("choices"), 2000);
  };

  const handleSetPasswordOnWeb = () => setFallback("password_form");

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getPageAuthClient();
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });
      if (verifyError || !verifyData.session) {
        setFallback("expired");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setFormError(updateError.message);
        return;
      }

      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${verifyData.session.access_token}`,
        },
        body: JSON.stringify({ requires_password_change: false }),
      }).catch(() => {
        // Best-effort — the set-password overlay in the Business app clears
        // this same flag on its own next successful login either way.
      });

      await supabase.auth.signOut();
      setFallback("done");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      {fallback === "hidden" && (
        <>
          <Heading />
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 mb-8">
            Tap Continue to open 4 Our Life Business and finish setting up your account.
          </p>
          <button
            onClick={handleContinue}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 transition-colors"
          >
            Continue
          </button>
        </>
      )}

      {fallback === "choices" && (
        <>
          <Heading />
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2 mb-6">
            Don&apos;t have 4 Our Life Business installed yet?
          </p>
          <div className="grid grid-cols-1 gap-2 mb-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-center text-sm text-slate-400">
              4 Our Life Business — coming soon to the App Store
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-center text-sm text-slate-400">
              4 Our Life Business — coming soon to Google Play
            </div>
          </div>
          <button
            onClick={handleSetPasswordOnWeb}
            className="w-full rounded-xl border border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold py-3.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
          >
            Set password on the web instead
          </button>
        </>
      )}

      {fallback === "password_form" && (
        <>
          <Heading />
          <form onSubmit={handleSubmitPassword} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                autoComplete="new-password"
                required
              />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold py-3.5 transition-colors flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Set password
            </button>
          </form>
        </>
      )}

      {fallback === "done" && (
        <SuccessCard>
          Your password is set. Open 4 Our Life Business and sign in with your email and new
          password.
        </SuccessCard>
      )}

      {fallback === "expired" && (
        <ErrorCard title="This link has expired">
          Ask 4 Our Life to resend your invite.
        </ErrorCard>
      )}
    </Shell>
  );
}

function Heading() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center justify-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 mb-4">
        <Image
          src="/assets/images/all-img/logo.png"
          alt="4 Our Life"
          width={40}
          height={40}
          className="rounded-md w-10 h-10"
        />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 text-center">
        Welcome to 4 Our Life Business
      </h1>
    </div>
  );
}

function SuccessCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 mb-4">
        <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">You&apos;re all set</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>
    </div>
  );
}

function ErrorCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{children}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
