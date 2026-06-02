import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import { Trash2, AlertCircle, Save, KeyRound, LogOut } from 'lucide-react';
import { format } from 'date-fns';

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const supabase = getSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
          if (data) {
            setProfile({
              ...data,
              name: `${data.first_name || ''} ${data.last_name || ''}`.trim()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    if (isOpen) fetchProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  const initials = profile?.name ? profile.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '—';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[13px] w-[800px] max-w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start px-[18px] py-[16px] border-b border-slate-200">
          <div>
            <div className="text-[15px] font-black text-slate-900">👤 Admin Profile</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
              {loading ? 'Loading...' : `${profile?.name || 'User'} · ${profile?.role || "Admin"} · ${profile?.user_id?.slice(0,8) || "4OL-000000"}`}
            </div>
          </div>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 transition-all" onClick={onClose}>×</button>
        </div>

        <div className="p-[18px] overflow-y-auto flex-1">
          {loading ? (
            <div className="py-20 text-center text-slate-500 font-bold text-sm">Fetching profile details...</div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-4 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-[10px] p-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-xl font-black text-white shadow-lg border border-white/20">
                    {initials}
                </div>
                <div className="flex-1">
                  <div className="text-[18px] font-black text-white">{profile?.name || "User Name"}</div>
                  <div className="text-[12px] text-slate-400 mt-0.5 font-bold capitalize">{profile?.role?.replace('_', ' ') || 'Administrator'} · 4 Our Life</div>
                  <div className="flex gap-2 mt-2">
                    <span className="bg-green-100 text-green-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">📋 {profile?.role || 'Admin'}</span>
                    <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">ID: {profile?.user_id?.slice(0,8)}</span>
                    <span className={cn(
                      "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                      profile?.mfa_enabled ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}>
                      {profile?.mfa_enabled ? "✅ MFA Active" : "❌ MFA Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Personal Info */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">Personal Information</h4>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="space-y-1"><label className="text-[11px] font-bold text-slate-600">First Name</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.first_name || ""} readOnly /></div>
                    <div className="space-y-1"><label className="text-[11px] font-bold text-slate-600">Last Name</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.last_name || ""} readOnly /></div>
                  </div>
                  <div className="space-y-1 mb-3"><label className="text-[11px] font-bold text-slate-600">Email Address</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.email || ""} readOnly /></div>
                  <div className="space-y-1 mb-3"><label className="text-[11px] font-bold text-slate-600">Phone Number</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.phone_number || "N/A"} readOnly /></div>
                  <div className="space-y-1 mb-3"><label className="text-[11px] font-bold text-slate-600">Role</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 cursor-not-allowed capitalize" value={profile?.role?.replace('_', ' ') || ""} readOnly /></div>
                </div>

                {/* Security & Access */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">Security & Access</h4>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 text-xs font-bold text-slate-600 space-y-2">
                    <div className="flex justify-between"><span>Account Status</span><span className={cn("capitalize", profile?.status === 'active' ? "text-green-600" : "text-amber-600")}>{profile?.status === 'active' ? '✅ Active' : profile?.status}</span></div>
                    <div className="flex justify-between"><span>MFA Status</span><span className={profile?.mfa_enabled ? "text-green-600" : "text-red-600"}>{profile?.mfa_enabled ? '✅ Enabled' : '❌ Disabled'}</span></div>
                    <div className="flex justify-between border-t border-slate-50 pt-2"><span>Account Created</span><span className="text-slate-800">{profile?.created_at ? format(new Date(profile.created_at), "MMM dd, yyyy") : '—'}</span></div>
                    <div className="flex justify-between"><span>Last Login</span><span className="text-slate-800">{profile?.last_login_at ? format(new Date(profile.last_login_at), "MMM dd, HH:mm") : '—'}</span></div>
                  </div>
                  <button className="btn btn-secondary w-full text-xs font-bold mb-2">📋 Update Password</button>
                  <button className="btn btn-secondary w-full text-xs font-bold">📋 Reconfigure MFA</button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-[18px] py-[11px] border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-[13px]">
          <button className="btn btn-secondary text-xs" onClick={onClose}>Close</button>
          <button className="btn btn-primary text-white text-xs" onClick={() => alert("Profile updates coming soon")}>📋 Save Profile</button>
        </div>
      </div>
    </div>
  );
}
