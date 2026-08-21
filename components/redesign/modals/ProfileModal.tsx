/**
 * Admin Profile modal (Gap Analysis Part W).
 *
 * Reads/writes ONLY through the guarded self-service endpoints —
 * /api/admin/profile, /password, /end-other-sessions, /activity — never
 * the browser Supabase client, which previously leaked sensitive
 * user_profiles columns via select('*').
 */
import React, { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

const inputCls =
  "w-full h-8 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    department: "",
    location: "",
  });
  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, activityRes] = await Promise.all([
        fetch("/api/admin/profile"),
        fetch("/api/admin/profile/activity"),
      ]);
      if (profileRes.ok) {
        const json = await profileRes.json();
        setProfile(json.profile);
        setEmail(json.email);
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    load();
    // Resolve user id for the header badge without touching user_profiles.
    import("@/lib/supabase-browser").then(({ getSupabaseBrowserClient }) =>
      getSupabaseBrowserClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)),
    );
  }, [isOpen, load]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  if (!isOpen) return null;

  const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "User Name";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const saveProfile = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      setMessage(res.ok ? { kind: "ok", text: "Profile saved." } : { kind: "err", text: json.error });
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
        setMessage({ kind: "err", text: json.error });
      }
    } finally {
      setBusy(false);
    }
  };

  const endOtherSessions = async () => {
    if (!confirm("Retire all other recorded admin sessions for this account?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/profile/end-other-sessions", { method: "POST" });
      const json = await res.json();
      setMessage(
        res.ok
          ? { kind: "ok", text: `${json.sessions_ended} session record(s) retired.` }
          : { kind: "err", text: json.error },
      );
    } finally {
      setBusy(false);
    }
  };

  const label = "text-[11px] font-bold text-slate-600";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-[13px] w-[860px] max-w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start px-[18px] py-[16px] border-b border-slate-200">
          <div>
            <div className="text-[15px] font-black text-slate-900">👤 Admin Profile</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {loading ? "Loading..." : `${name} · ${profile?.role?.replace("_", " ") ?? "Admin"} · ${userId?.slice(0, 8) ?? "4OL-000000"}`}
            </div>
          </div>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 transition-all" onClick={onClose}>×</button>
        </div>

        <div className="p-[18px] overflow-y-auto flex-1">
          {loading ? (
            <div className="py-20 text-center text-slate-500 font-bold text-sm">Fetching profile details...</div>
          ) : (
            <>
              {/* Hero */}
              <div className="flex items-center gap-4 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-[10px] p-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/20">
                  {initials}
                </div>
                <div className="flex-1">
                  <div className="text-[18px] font-black text-white">{name}</div>
                  <div className="text-[12px] text-slate-400 mt-0.5 font-bold capitalize">{profile?.role?.replace("_", " ") || "Administrator"} · 4 Our Life</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="bg-green-100 text-green-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">📋 {profile?.role || "Admin"}</span>
                    <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">ID: {userId?.slice(0, 8)}</span>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                      profile?.mfa_enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                    )}>
                      {profile?.mfa_enabled ? "✅ MFA Active" : "❌ MFA Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              {message && (
                <div className={cn(
                  "mb-3 px-3 py-2 rounded-lg text-xs font-bold",
                  message.kind === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
                )}>
                  {message.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Information — editable */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="space-y-1">
                      <label className={label}>First Name</label>
                      <input className={inputCls} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className={label}>Last Name</label>
                      <input className={inputCls} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    <label className={label}>Email Address</label>
                    <input className={cn(inputCls, "bg-slate-50 cursor-not-allowed")} value={email ?? ""} readOnly />
                  </div>
                  <div className="space-y-1 mb-3">
                    <label className={label}>Phone Number</label>
                    <input className={inputCls} value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="space-y-1">
                      <label className={label}>Department</label>
                      <input className={inputCls} value={form.department} placeholder="e.g. Operations" onChange={(e) => setForm({ ...form, department: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className={label}>Location</label>
                      <input className={inputCls} value={form.location} placeholder="e.g. Accra HQ" onChange={(e) => setForm({ ...form, location: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1 mb-3">
                    <label className={label}>Role</label>
                    <input className={cn(inputCls, "bg-slate-50 cursor-not-allowed capitalize")} value={profile?.role?.replace("_", " ") ?? ""} readOnly />
                  </div>

                  {/* Change password */}
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3 mt-4">Change Password</h4>
                  <div className="space-y-2">
                    <input type="password" className={inputCls} placeholder="Current password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
                    <input type="password" className={inputCls} placeholder="New password (min 8, A–Z, a–z, 0–9)" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
                    <input type="password" className={inputCls} placeholder="Confirm new password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                    <button
                      className="btn btn-secondary w-full text-xs font-bold"
                      disabled={busy || !pw.current_password || !pw.new_password || !pw.confirm}
                      onClick={changePassword}
                    >
                      🔑 Update Password
                    </button>
                  </div>
                </div>

                {/* Security & Access */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">Security & Access</h4>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 text-xs font-bold text-slate-600 space-y-2">
                    <div className="flex justify-between"><span>Account Status</span><span className={cn("capitalize", profile?.status === "active" ? "text-green-600" : "text-amber-600")}>{profile?.status === "active" ? "✅ Active" : profile?.status}</span></div>
                    <div className="flex justify-between"><span>MFA Status</span><span className={profile?.mfa_enabled ? "text-green-600" : "text-red-600"}>{profile?.mfa_enabled ? "✅ Enabled" : "❌ Disabled"}</span></div>
                    <div className="flex justify-between border-t border-slate-50 pt-2"><span>Account Created</span><span className="text-slate-800">{profile?.created_at ? format(new Date(profile.created_at), "MMM dd, yyyy") : "—"}</span></div>
                    <div className="flex justify-between"><span>Last Login</span><span className="text-slate-800">{profile?.last_login_at ? format(new Date(profile.last_login_at), "MMM dd, HH:mm") : "—"}</span></div>
                  </div>
                  <button className="btn btn-secondary w-full text-xs font-bold mb-2" disabled={busy} onClick={endOtherSessions}>
                    🚪 End Other Sessions
                  </button>
                  <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                    Retires recorded session telemetry for this account. Active JWT tokens remain valid until expiry — Supabase cannot revoke them early.
                  </p>

                  {/* Recent Activity */}
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">Recent Activity</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[9px]">
                        <tr>
                          <th className="px-2 py-1.5 text-left">Action</th>
                          <th className="px-2 py-1.5 text-left">Module</th>
                          <th className="px-2 py-1.5 text-left">IP</th>
                          <th className="px-2 py-1.5 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activity.length === 0 && (
                          <tr><td colSpan={4} className="px-2 py-3 text-center text-slate-400">No recorded activity yet.</td></tr>
                        )}
                        {activity.map((row) => (
                          <tr key={row.created_at + row.action_type}>
                            <td className="px-2 py-1.5 font-bold text-slate-700">{row.new_data?.description ?? row.action_type}</td>
                            <td className="px-2 py-1.5 text-slate-500">{row.target_table}</td>
                            <td className="px-2 py-1.5 text-slate-400">{row.ip_address ?? "—"}</td>
                            <td className="px-2 py-1.5 text-right text-slate-500 whitespace-nowrap">{format(new Date(row.created_at), "MMM dd, HH:mm")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-[18px] py-[11px] border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-[13px]">
          <button className="btn btn-secondary text-xs" onClick={onClose}>Close</button>
          <button className="btn btn-primary text-white text-xs" disabled={busy || loading} onClick={saveProfile}>💾 Save Profile</button>
        </div>
      </div>
    </div>
  );
}
