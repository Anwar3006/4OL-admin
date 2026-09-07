"use client";

/**
 * Admin Profile / Access / Security modal — the single destination for
 * "my profile, access and details" from the top nav.
 *
 * Reads and writes ONLY through the guarded self-service endpoints
 * (/api/admin/profile, /password, /access, /end-other-sessions, /activity),
 * never the browser Supabase client, which previously leaked sensitive
 * user_profiles columns via select('*').
 *
 * Three tabs:
 *   Profile   — editable identity fields + password change
 *   Access    — effective RBAC permissions, grouped by resource
 *   Security  — MFA/status facts, recorded sessions, recent activity
 *
 * Styling uses theme tokens throughout (background/foreground/border/muted)
 * rather than the previous hard-coded slate palette, so the modal is legible
 * once dark mode is reachable from the top nav.
 */

import React, { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Check,
  KeyRound,
  Loader2,
  LogOut,
  Minus,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminProfile {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  department: string | null;
  location: string | null;
  role: string | null;
  status: string | null;
  mfa_enabled: boolean | null;
  last_login_at: string | null;
  created_at: string | null;
}

interface ActivityRow {
  action_type: string;
  target_table: string;
  new_data: { description?: string } | null;
  ip_address?: string | null;
  created_at: string;
}

interface PermissionItem {
  key: string;
  action: string;
  description: string;
  granted: boolean;
}

interface PermissionGroup {
  resource: string;
  items: PermissionItem[];
  grantedCount: number;
}

interface SessionRow {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  location: string | null;
  started_at: string | null;
  last_active_at: string | null;
  ended_at: string | null;
  is_active: boolean | null;
  mfa_verified: boolean | null;
}

interface AccessPayload {
  role: string | null;
  isSuperAdmin: boolean;
  source: "rpc" | "role_defaults" | "super_admin" | "denied";
  totalPermissions: number;
  grantedPermissions: number;
  permissionGroups: PermissionGroup[];
  sessions: SessionRow[];
}

const inputCls =
  "w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed";
const labelCls = "text-xs font-semibold text-muted-foreground";
const sectionCls =
  "text-2xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-1.5 mb-3";

function fmt(value: string | null | undefined, pattern: string): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : format(d, pattern);
}

/** Condenses a UA string to something a human can scan in a session list. */
function shortUa(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : /Firefox\//.test(ua) ? "Firefox"
    : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad/.test(ua) ? "iOS"
    : /Linux/.test(ua) ? "Linux"
    : "";
  return os ? `${browser} · ${os}` : browser;
}

export default function ProfileModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    department: "",
    location: "",
  });
  const [pw, setPw] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, activityRes, accessRes] = await Promise.all([
        fetch("/api/admin/profile"),
        fetch("/api/admin/profile/activity"),
        fetch("/api/admin/profile/access"),
      ]);
      if (profileRes.ok) {
        const json = await profileRes.json();
        setProfile(json.profile);
        setEmail(json.email);
        setPublicId(json.publicId ?? null);
        if (json.profile) {
          setForm({
            first_name: json.profile.first_name ?? "",
            last_name: json.profile.last_name ?? "",
            phone_number: json.profile.phone_number ?? "",
            department: json.profile.department ?? "",
            location: json.profile.location ?? "",
          });
        }
      }
      if (activityRes.ok) {
        const json = await activityRes.json();
        setActivity(json.activity ?? []);
      }
      if (accessRes.ok) setAccess(await accessRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    load();
  }, [isOpen, load]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const name =
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Admin";
  const initials =
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";
  const roleLabel = (profile?.role ?? "administrator").replace(/_/g, " ");

  const saveProfile = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      setMessage(
        res.ok
          ? { kind: "ok", text: "Profile saved." }
          : { kind: "err", text: json.error ?? "Save failed." },
      );
      if (res.ok) load();
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (pw.new_password !== pw.confirm) {
      setMessage({ kind: "err", text: "New passwords do not match." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: pw.current_password,
          new_password: pw.new_password,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ kind: "ok", text: "Password updated." });
        setPw({ current_password: "", new_password: "", confirm: "" });
      } else {
        setMessage({ kind: "err", text: json.error ?? "Update failed." });
      }
    } finally {
      setBusy(false);
    }
  };

  const endOtherSessions = async () => {
    if (!confirm("Retire all other recorded admin sessions for this account?"))
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/profile/end-other-sessions", {
        method: "POST",
      });
      const json = await res.json();
      setMessage(
        res.ok
          ? {
              kind: "ok",
              text: `${json.sessions_ended} session record(s) retired.`,
            }
          : { kind: "err", text: json.error ?? "Request failed." },
      );
      if (res.ok) load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      {/* max-w-3xl! — DialogContent's base sets max-w-7xl! / 2xl:max-w-[1440px]!
          as !important, so a plain max-w-3xl here would silently lose. */}
      <DialogContent className="max-w-3xl! gap-0 p-0 2xl:max-w-3xl!">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-bold">
            Profile, access &amp; security
          </DialogTitle>
          <DialogDescription className="text-xs">
            {loading
              ? "Loading your account…"
              : `${name} · ${roleLabel}${publicId ? ` · ${publicId}` : ""}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Fetching account
            details…
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <div className="px-5 pt-4">
              {/* Identity hero */}
              <div className="mb-4 flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base font-bold">{name}</div>
                  <div className="truncate text-xs capitalize text-muted-foreground">
                    {roleLabel} · 4 Our Life
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Pill tone={profile?.status === "active" ? "ok" : "warn"}>
                      {profile?.status ?? "unknown"}
                    </Pill>
                    <Pill tone={profile?.mfa_enabled ? "ok" : "bad"}>
                      {profile?.mfa_enabled ? "MFA active" : "MFA disabled"}
                    </Pill>
                    {access && (
                      <Pill tone="info">
                        {access.isSuperAdmin
                          ? "All permissions"
                          : `${access.grantedPermissions}/${access.totalPermissions} permissions`}
                      </Pill>
                    )}
                  </div>
                </div>
              </div>

              {message && (
                <div
                  className={cn(
                    "mb-3 rounded-md px-3 py-2 text-xs font-semibold",
                    message.kind === "ok"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {message.text}
                </div>
              )}

              <TabsList className="w-full justify-start">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="access">Access</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>
            </div>

            {/* ─── Profile ─────────────────────────────────────────── */}
            <TabsContent value="profile" className="mt-0">
              <ScrollArea className="max-h-[52vh] px-5 py-4">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <h4 className={sectionCls}>Personal information</h4>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <Field label="First name">
                        <input
                          className={inputCls}
                          value={form.first_name}
                          onChange={(e) =>
                            setForm({ ...form, first_name: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Last name">
                        <input
                          className={inputCls}
                          value={form.last_name}
                          onChange={(e) =>
                            setForm({ ...form, last_name: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Email address" className="mb-3">
                      <input
                        className={cn(inputCls, "bg-muted")}
                        value={email ?? ""}
                        readOnly
                      />
                    </Field>
                    <Field label="Phone number" className="mb-3">
                      <input
                        className={inputCls}
                        value={form.phone_number}
                        onChange={(e) =>
                          setForm({ ...form, phone_number: e.target.value })
                        }
                      />
                    </Field>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <Field label="Department">
                        <input
                          className={inputCls}
                          placeholder="e.g. Operations"
                          value={form.department}
                          onChange={(e) =>
                            setForm({ ...form, department: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Location">
                        <input
                          className={inputCls}
                          placeholder="e.g. Accra HQ"
                          value={form.location}
                          onChange={(e) =>
                            setForm({ ...form, location: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <Field label="Role">
                      <input
                        className={cn(inputCls, "bg-muted capitalize")}
                        value={roleLabel}
                        readOnly
                      />
                    </Field>
                  </div>

                  <div>
                    <h4 className={sectionCls}>Change password</h4>
                    <div className="space-y-2">
                      <input
                        type="password"
                        autoComplete="current-password"
                        className={inputCls}
                        placeholder="Current password"
                        value={pw.current_password}
                        onChange={(e) =>
                          setPw({ ...pw, current_password: e.target.value })
                        }
                      />
                      <input
                        type="password"
                        autoComplete="new-password"
                        className={inputCls}
                        placeholder="New password (min 8, A–Z, a–z, 0–9)"
                        value={pw.new_password}
                        onChange={(e) =>
                          setPw({ ...pw, new_password: e.target.value })
                        }
                      />
                      <input
                        type="password"
                        autoComplete="new-password"
                        className={inputCls}
                        placeholder="Confirm new password"
                        value={pw.confirm}
                        onChange={(e) =>
                          setPw({ ...pw, confirm: e.target.value })
                        }
                      />
                      <Button
                        variant="secondary"
                        className="w-full gap-2"
                        disabled={
                          busy ||
                          !pw.current_password ||
                          !pw.new_password ||
                          !pw.confirm
                        }
                        onClick={changePassword}
                      >
                        <KeyRound className="size-4" /> Update password
                      </Button>
                    </div>

                    <h4 className={cn(sectionCls, "mt-5")}>Account</h4>
                    <dl className="space-y-2 rounded-lg border border-border p-3 text-xs">
                      <Row
                        label="Account created"
                        value={fmt(profile?.created_at, "MMM dd, yyyy")}
                      />
                      <Row
                        label="Last login"
                        value={fmt(profile?.last_login_at, "MMM dd, HH:mm")}
                      />
                    </dl>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ─── Access ──────────────────────────────────────────── */}
            <TabsContent value="access" className="mt-0">
              <ScrollArea className="max-h-[52vh] px-5 py-4">
                {!access ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Access details unavailable.
                  </p>
                ) : (
                  <>
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="font-semibold capitalize">
                          {roleLabel}
                          {access.isSuperAdmin && " — unrestricted"}
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          {access.isSuperAdmin
                            ? "Super admins implicitly hold every permission in the catalog."
                            : `${access.grantedPermissions} of ${access.totalPermissions} permissions granted. This view is read-only — role and permission changes are made in Admin Management.`}
                        </p>
                        {access.source === "role_defaults" && (
                          <p className="mt-1 flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" />
                            Showing role defaults — the RBAC catalog migration
                            is not applied yet.
                          </p>
                        )}
                        {access.source === "denied" && (
                          <p className="mt-1 flex items-center gap-1 font-medium text-destructive">
                            <AlertTriangle className="size-3" />
                            Permission lookup failed; showing none (fail
                            closed).
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {access.permissionGroups.map((group) => (
                        <div
                          key={group.resource}
                          className="overflow-hidden rounded-lg border border-border"
                        >
                          <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5">
                            <span className="text-xs font-bold capitalize">
                              {group.resource}
                            </span>
                            <span className="text-2xs text-muted-foreground">
                              {group.grantedCount}/{group.items.length}
                            </span>
                          </div>
                          <ul className="divide-y divide-border">
                            {group.items.map((item) => (
                              <li
                                key={item.key}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-1.5 text-xs",
                                  !item.granted && "opacity-50",
                                )}
                              >
                                {item.granted ? (
                                  <Check className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Minus className="size-3.5 shrink-0 text-muted-foreground" />
                                )}
                                <span className="w-20 shrink-0 font-mono text-2xs capitalize text-muted-foreground">
                                  {item.action}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                  {item.description}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </ScrollArea>
            </TabsContent>

            {/* ─── Security ────────────────────────────────────────── */}
            <TabsContent value="security" className="mt-0">
              <ScrollArea className="max-h-[52vh] px-5 py-4">
                <h4 className={sectionCls}>Account security</h4>
                <dl className="mb-4 space-y-2 rounded-lg border border-border p-3 text-xs">
                  <Row
                    label="Account status"
                    value={profile?.status ?? "—"}
                    tone={profile?.status === "active" ? "ok" : "warn"}
                  />
                  <Row
                    label="Multi-factor auth"
                    value={profile?.mfa_enabled ? "Enabled" : "Disabled"}
                    tone={profile?.mfa_enabled ? "ok" : "bad"}
                  />
                  <Row
                    label="Last login"
                    value={fmt(profile?.last_login_at, "MMM dd, HH:mm")}
                  />
                </dl>

                <h4 className={sectionCls}>Recorded sessions</h4>
                <div className="mb-2 overflow-hidden rounded-lg border border-border">
                  {!access || access.sessions.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No recorded sessions.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {access.sessions.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-center gap-3 px-3 py-2 text-xs"
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              s.is_active && !s.ended_at
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {s.device_info || shortUa(s.user_agent)}
                            </span>
                            <span className="block truncate text-2xs text-muted-foreground">
                              {s.ip_address ?? "unknown IP"}
                              {s.location ? ` · ${s.location}` : ""}
                              {s.mfa_verified ? " · MFA verified" : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-2xs text-muted-foreground">
                            {s.is_active && !s.ended_at ? "Active" : "Ended"}
                            <br />
                            {fmt(s.last_active_at, "MMM dd, HH:mm")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  disabled={busy}
                  onClick={endOtherSessions}
                >
                  <LogOut className="size-4" /> End other sessions
                </Button>
                <p className="mb-4 mt-1.5 text-2xs leading-relaxed text-muted-foreground">
                  Retires recorded session telemetry for this account. Active
                  JWT tokens remain valid until expiry — Supabase cannot revoke
                  them early.
                </p>

                <h4 className={sectionCls}>Recent activity</h4>
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 text-3xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Action</th>
                        <th className="px-2 py-1.5 text-left">Module</th>
                        <th className="px-2 py-1.5 text-left">IP</th>
                        <th className="px-2 py-1.5 text-right">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activity.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-2 py-3 text-center text-muted-foreground"
                          >
                            No recorded activity yet.
                          </td>
                        </tr>
                      )}
                      {activity.map((row) => (
                        <tr key={row.created_at + row.action_type}>
                          <td className="px-2 py-1.5 font-medium">
                            {row.new_data?.description ?? row.action_type}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {row.target_table}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {row.ip_address ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right text-muted-foreground">
                            {fmt(row.created_at, "MMM dd, HH:mm")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="border-t border-border px-5 py-3">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button disabled={busy || loading} onClick={saveProfile}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save profile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-semibold capitalize",
          tone === "ok" && "text-emerald-600 dark:text-emerald-400",
          tone === "warn" && "text-amber-600 dark:text-amber-400",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "bad" | "info";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-3xs font-bold uppercase tracking-wider",
        tone === "ok" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        tone === "warn" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        tone === "bad" && "bg-destructive/10 text-destructive",
        tone === "info" && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </span>
  );
}
