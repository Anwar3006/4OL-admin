import React, { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { cn } from '@/lib/utils';
import { Trash2, AlertCircle, Save, KeyRound, LogOut } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
        setProfile(data);
      }
    };
    if (isOpen) fetchProfile();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[13px] w-[800px] max-w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start px-[18px] py-[16px] border-b border-slate-200">
          <div>
            <div className="text-[15px] font-black text-slate-900">👤 Admin Profile</div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{profile?.name} · {profile?.role || "Super Admin"} · {profile?.user_id?.slice(0,8) || "4OL-000001"}</div>
          </div>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 transition-all" onClick={onClose}>×</button>
        </div>

        <div className="p-[18px] overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center gap-4 bg-gradient-to-tr from-slate-900 to-slate-800 rounded-[10px] p-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-xl font-black text-white shadow-lg">
                {profile?.name ? profile.name.split(' ').map((n: string) => n[0]).join('') : 'FN'}
            </div>
            <div className="flex-1">
              <div className="text-[18px] font-black text-white">{profile?.name || "Francis N. Mensah"}</div>
              <div className="text-[12px] text-slate-400 mt-0.5 font-bold">Super Administrator · 4 Our Life</div>
              <div className="flex gap-2 mt-2">
                <span className="bg-green-100 text-green-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">📋 Super Admin</span>
                <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">ID: {profile?.user_id?.slice(0,8) || "4OL-000001"}</span>
                <span className="bg-green-100 text-green-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">✅ MFA Active</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Personal Info */}
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">Personal Information</h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="space-y-1"><label className="text-[11px] font-bold text-slate-600">First Name</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.name?.split(' ')[0] || "Francis"} readOnly /></div>
                <div className="space-y-1"><label className="text-[11px] font-bold text-slate-600">Last Name</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.name?.split(' ').slice(1).join(' ') || "N. Mensah"} readOnly /></div>
              </div>
              <div className="space-y-1 mb-3"><label className="text-[11px] font-bold text-slate-600">Email Address</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.email || ""} readOnly /></div>
              <div className="space-y-1 mb-3"><label className="text-[11px] font-bold text-slate-600">Phone Number</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs" value={profile?.phone || "+233 24 XXX XXXX"} readOnly /></div>
              <div className="space-y-1 mb-3"><label className="text-[11px] font-bold text-slate-600">Role</label><input className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50 cursor-not-allowed" value={profile?.role || "Super Administrator"} readOnly /></div>
            </div>

            {/* Security & Access */}
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">Security & Access</h4>
              <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4 text-xs font-bold text-slate-600 space-y-2">
                <div className="flex justify-between"><span>Account Status</span><span className="text-green-600">✅ Active</span></div>
                <div className="flex justify-between"><span>MFA Status</span><span className="text-green-600">✅ Enabled</span></div>
                <div className="flex justify-between"><span>Active Sessions</span><span className="text-slate-800">1 device</span></div>
                <div className="flex justify-between border-t border-slate-50 pt-2"><span>Account Created</span><span className="text-slate-800">Jan 1, 2026</span></div>
              </div>
              <button className="btn btn-secondary w-full text-xs font-bold mb-2">📋 Update Password</button>
              <button className="btn btn-secondary w-full text-xs font-bold">📋 Reconfigure MFA</button>
            </div>
          </div>
        </div>

        <div className="px-[18px] py-[11px] border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-[13px]">
          <button className="btn btn-secondary text-xs" onClick={onClose}>Close</button>
          <button className="btn btn-primary text-white text-xs" onClick={() => alert("Profile Saved")}>📋 Save Profile</button>
        </div>
      </div>
    </div>
  );
}
