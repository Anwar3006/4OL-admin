"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { getIsolatedAuthClient } from "@/lib/db/isolated-auth";

// Module scope on purpose: signInWithPassword, the insert and signOut below
// must all run on the SAME client, or the insert will not see the session the
// sign-in just created. Deliberately session-isolated from the admin panel —
// see lib/db/isolated-auth.ts.
const supabase = getIsolatedAuthClient();

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "verify" | "confirm" | "done" | "already_pending";

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  error?: string;
  multiline?: boolean;
}

// ─── Reusable Field Component ─────────────────────────────────────────────────
function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  multiline,
}: FieldProps) {
  const [focused, setFocused] = useState(false);

  const inputClasses = `
    w-full px-3.5 py-3 bg-[#0c0f14] border rounded-xl text-slate-100 text-sm outline-none transition-colors duration-150 font-sans
    ${error ? "border-red-900 bg-[#160b0b]" : focused ? "border-slate-700" : "border-[#1e2433]"}
  `;

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold text-slate-400 mb-1.5 tracking-widest uppercase">
        {label}
      </label>
      {multiline ? (
        <textarea
          className={`${inputClasses} min-h-[80px] resize-y`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      ) : (
        <input
          type={type}
          className={inputClasses}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      )}
      {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DeleteAccountPage() {
  const [step, setStep] = useState<Step>("verify");
  const [loading, setLoading] = useState(false);

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [authError, setAuthError] = useState("");

  // Step 2 fields
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // Cached user after step-1 auth
  const [verifiedUserId, setVerifiedUserId] = useState("");

  // ── Step 1: authenticate ──
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;

    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email");
      hasError = true;
    } else setEmailError("");

    if (!password.trim()) {
      setPasswordError("Password is required");
      hasError = true;
    } else setPasswordError("");

    if (hasError) return;

    setLoading(true);
    setAuthError("");

    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (signInError) {
        setAuthError("Invalid email or password.");
        return;
      }

      const userId = signInData?.user?.id;
      if (!userId) {
        setAuthError("Failed to retrieve account information.");
        return;
      }

      const { data: existing } = await supabase
        .from("delete_account_requests")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        setStep("already_pending");
        return;
      }

      setVerifiedUserId(userId);
      setStep("confirm");
    } catch (err) {
      setAuthError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setReasonError("Please tell us why you're leaving");
      return;
    }
    if (!confirmed) return;

    setLoading(true);
    setReasonError("");

    try {
      const { error } = await supabase.from("delete_account_requests").insert({
        user_id: verifiedUserId,
        email: email.trim().toLowerCase(),
        reason: reason.trim(),
        status: "pending",
      });

      if (error) {
        setReasonError(`Failed to submit request: ${error.message}`);
        return;
      }

      await supabase.auth.signOut();
      setStep("done");
    } catch (err) {
      setReasonError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 md:p-6 font-sans">
      <div className="w-full max-w-[700px] bg-[#1e2433] border border-[#1e2433] rounded-[20px] p-5 md:p-10 relative overflow-hidden shadow-2xl">
        {/* Top-right red glow decoration */}
        <div className="absolute -top-[60px] -right-[60px] w-48 h-48 rounded-full bg-red-500/10 blur-[60px] pointer-events-none" />

        {/* Logo */}
        <div className="flex justify-center gap-2 md:justify-start items-end mb-3 ">
          <div className="flex items-center gap-2">
            <div className="p-1 text-primary-foreground flex size-full items-center justify-center rounded-xl shadow-sm border border-muted">
              <Image
                src="/assets/images/all-img/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="w-10 rounded-md"
              />
            </div>
          </div>
          <span className="text-sm font-medium underline underline-offset-3 text-white">
            4 Our Life.
          </span>
        </div>

        {/* ── Step: Verify ── */}
        {step === "verify" && (
          <>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-2xs font-bold text-red-500 uppercase tracking-widest">
                Danger Zone
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-100 leading-tight mb-2 tracking-tight">
              Delete your account
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed mb-7">
              This action is permanent and cannot be undone. All your data —
              including health records and personal information — will be
              permanently removed.
            </p>

            <div className="h-px bg-[#1e2433] mb-6" />

            <form onSubmit={handleVerify}>
              <Field
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                error={emailError}
              />
              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                error={passwordError}
              />

              {authError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <p className="text-xs text-red-400 m-0">{authError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full p-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all duration-150 tracking-wide"
              >
                {loading ? "Verifying..." : "Continue to Deletion Request"}
              </button>
            </form>
          </>
        )}

        {/* ── Step: Confirm ── */}
        {step === "confirm" && (
          <>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-2xs font-bold text-red-500 uppercase tracking-widest">
                Final Step
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-100 leading-tight mb-2">
              Confirm deletion
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed mb-7">
              Your identity has been verified. Tell us why you're leaving to
              finish the request.
            </p>

            <div className="h-px bg-[#1e2433] mb-6" />

            <form onSubmit={handleSubmit}>
              <Field
                label="Reason for leaving"
                value={reason}
                onChange={setReason}
                placeholder="Help us understand why you're leaving..."
                error={reasonError}
                multiline
              />

              <div
                className="flex gap-2.5 p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl mb-5 cursor-pointer"
                onClick={() => setConfirmed(!confirmed)}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 mt-0.5 accent-red-500 cursor-pointer flex-shrink-0"
                  checked={confirmed}
                  onChange={() => setConfirmed(!confirmed)}
                  onClick={(e) => e.stopPropagation()}
                />
                <p className="text-sm text-slate-400 leading-normal">
                  I understand this action is{" "}
                  <strong className="text-red-400">irreversible</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={!confirmed || loading}
                className="w-full p-3.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all duration-150"
              >
                {loading ? "Submitting..." : "Submit Deletion Request"}
              </button>

              <button
                type="button"
                className="w-full p-3.5 bg-transparent border border-[#1e2433] text-slate-500 hover:text-slate-400 text-sm font-semibold rounded-xl mt-2.5"
                onClick={() => setStep("verify")}
              >
                Go back
              </button>
            </form>
          </>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              Request received
            </h1>
            <p className="text-sm text-slate-500 mb-7">
              Your request is pending. Our team will process it within 30 days.
              You have been signed out.
            </p>
            <div className="p-3.5 bg-slate-400/5 border border-[#1e2433] rounded-xl mb-2">
              <p className="text-xs text-slate-500 leading-relaxed m-0">
                Contact us at{" "}
                <a
                  href="mailto:support@4ourlife.com"
                  className="text-[#4ade80]"
                >
                  support@4ourlife.com
                </a>{" "}
                if you change your mind.
              </p>
            </div>
          </div>
        )}

        {/* ── Step: Already pending ── */}
        {step === "already_pending" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mb-2">
              Request already pending
            </h1>
            <p className="text-sm text-slate-500 mb-2">
              A deletion request for this account is already pending review.
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Questions?{" "}
              <a href="mailto:support@4ourlife.com" className="text-[#4ade80]">
                Contact support
              </a>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-7 pt-5 border-t border-[#1e2433] text-center">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} 4 Our Life · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
