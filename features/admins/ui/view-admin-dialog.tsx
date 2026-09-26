"use client";

import {
  User,
  UserCog,
  KeyRound,
  Activity,
  Mail,
  Coins,
  Bell,
  Flag,
  StickyNote,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DetailModal,
  DetailIdLine,
  DetailSection,
  DetailField,
  BoolRow,
  EmptyState,
  StatusBadge,
  RoleBadge,
  MaskedNotice,
  humanize,
  list,
  num,
  fmtDate,
} from "@/components/detail";
import { useViewAdminDialog } from "@/features/admins/data/dialog-hooks";
import { useUser } from "@/features/users/data/useUser";

/**
 * Comprehensive administrator-detail modal.
 *
 * Admins are user_profiles rows, so this reuses useUser → getProfileById(id),
 * which returns the target admin's full profile (all 43 columns) with PHI
 * masked server-side unless the caller is super_admin. It renders the same
 * complete section set as the View User dialog — Identity, Contact & Location,
 * Role & Access, Security & Authentication, Engagement & Consents, Fitcoins,
 * Notifications, Moderation and Notes — so both modals are equally
 * comprehensive and empty values show an em-dash. Permission *grants* live in
 * the Roles & Permissions tab, not on the profile row; staff accounts are not
 * flagged from here (no moderation action is wired for admins), so the footer
 * stays Close-only.
 */
export default function ViewAdminDialog() {
  const { isOpen, entityId, close } = useViewAdminDialog();

  const { data: admin, isLoading, isError, error } = useUser({
    id: entityId || "",
    enabled: isOpen && !!entityId,
  });

  if (!isOpen) return null;

  return (
    <DetailModal
      open={isOpen}
      onClose={close}
      title={admin?.name || (isLoading ? "Loading…" : "Administrator")}
      badges={
        <>
          {admin?.role && <RoleBadge role={admin.role} />}
          {admin?.status && <StatusBadge status={admin.status} />}
          {admin?.department && (
            <Badge
              variant="outline"
              className="text-2xs font-black uppercase tracking-widest bg-white dark:bg-slate-800"
            >
              {admin.department}
            </Badge>
          )}
        </>
      }
      idLine={
        <DetailIdLine id={admin?.public_id || admin?.user_id || entityId} />
      }
      banner={admin?._masked ? <MaskedNotice /> : undefined}
      footer={
        <Button
          variant="outline"
          className="flex-1 h-11 font-black uppercase tracking-widest text-2xs"
          onClick={close}
        >
          Close
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          <p className="text-xs font-semibold text-slate-400">
            Loading administrator…
          </p>
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load this administrator"
          message={error?.message || "The profile could not be retrieved."}
        />
      ) : admin ? (
        <>
          <DetailSection title="Identity" icon={User}>
            <DetailField label="Full name" value={admin.name} />
            <DetailField label="Sex" value={humanize(admin.sex)} />
            <DetailField label="Date of birth" value={fmtDate(admin.dob)} />
            <DetailField label="NHIS number" value={admin.nhis_number} mono />
            <DetailField label="Public ID" value={admin.public_id} mono />
            <DetailField label="User ID" value={admin.user_id} mono />
          </DetailSection>
          <Separator />

          <DetailSection title="Contact & Location" icon={Mail}>
            <DetailField label="Email" value={admin.email} />
            <DetailField label="Phone" value={admin.phone_number} />
            <DetailField label="Region" value={admin.region} />
            <DetailField label="Location" value={admin.location} />
            <DetailField label="Timezone" value={admin.timezone} />
            <BoolRow label="WhatsApp opt-in" value={admin.whatsapp_opt_in} />
            <DetailField
              label="WhatsApp since"
              value={fmtDate(admin.whatsapp_opt_in_at)}
            />
          </DetailSection>
          <Separator />

          <DetailSection title="Role & Access" icon={UserCog}>
            <DetailField label="Role" value={humanize(admin.role)} />
            <DetailField label="Department" value={admin.department} />
            <DetailField label="User type" value={humanize(admin.user_type)} />
            <DetailField label="Account types" value={list(admin.account_types)} />
            <DetailField label="Status" value={humanize(admin.status)} />
            <BoolRow
              label="Password change required"
              value={admin.requires_password_change}
              invert
            />
            <DetailField label="Member since" value={fmtDate(admin.created_at)} />
            <DetailField
              label="Last updated"
              value={fmtDate(admin.updated_at, true)}
            />
            <DetailField
              label="Deleted at"
              value={fmtDate(admin.deleted_at, true)}
            />
          </DetailSection>
          <Separator />

          <DetailSection title="Security & Authentication" icon={KeyRound}>
            <BoolRow label="MFA enabled" value={admin.mfa_enabled} />
            <DetailField
              label="MFA verified"
              value={fmtDate(admin.mfa_verified_at, true)}
            />
            <DetailField
              label="Last login"
              value={fmtDate(admin.last_login_at, true)}
            />
            <DetailField
              label="Failed login attempts"
              value={num(admin.login_attempts)}
            />
            <BoolRow label="Account locked" value={!!admin.locked_until} invert />
            <DetailField
              label="Locked until"
              value={admin.locked_until ? fmtDate(admin.locked_until, true) : "Not locked"}
            />
            <DetailField
              label="Whitelisted IPs"
              value={
                admin.whitelisted_ips?.length
                  ? admin.whitelisted_ips.join(", ")
                  : "Any"
              }
              className="sm:col-span-2"
            />
          </DetailSection>
          <Separator />

          <DetailSection title="Engagement & Consents" icon={Activity}>
            <DetailField
              label="Last active"
              value={fmtDate(admin.last_active, true)}
            />
            <BoolRow
              label="Fitness onboarding done"
              value={admin.has_completed_fitness_onboarding}
            />
            <BoolRow label="Marketing consent" value={admin.marketing_consent} />
            <BoolRow label="Research consent" value={admin.research_consent} />
            <DetailField
              label="Medical disclaimer"
              value={fmtDate(admin.medical_disclaimer_acknowledged_at, true)}
            />
            <DetailField
              label="Last review prompt"
              value={fmtDate(admin.last_review_prompt_at, true)}
            />
          </DetailSection>
          <Separator />

          <DetailSection title="Fitcoins & Rewards" icon={Coins}>
            <DetailField label="Balance" value={num(admin.fitcoins_balance)} />
            <DetailField
              label="Lifetime earned"
              value={num(admin.lifetime_fitcoins_earned)}
            />
          </DetailSection>
          <Separator />

          <DetailSection title="Notifications" icon={Bell}>
            <BoolRow
              label="Push (master)"
              value={admin.push_notifications_enabled}
            />
            <BoolRow label="Chats" value={admin.push_chats_enabled} />
            <BoolRow label="Medication" value={admin.push_medication_enabled} />
            <BoolRow label="Workouts" value={admin.push_workouts_enabled} />
            <BoolRow label="Promotions" value={admin.push_promotions_enabled} />
            <BoolRow label="Device push token" value={!!admin.expo_push_token} />
          </DetailSection>
          <Separator />

          <DetailSection title="Moderation" icon={Flag}>
            <BoolRow label="Flagged" value={admin.is_flagged} invert />
            <DetailField
              label="Flag reason"
              value={admin.flag_reason}
              className="sm:col-span-2"
            />
            <DetailField
              label="Flagged at"
              value={fmtDate(admin.flagged_at, true)}
            />
            <DetailField label="Flagged by" value={admin.flagged_by} mono />
          </DetailSection>

          {(admin.notes || "").trim().length > 0 && (
            <>
              <Separator />
              <DetailSection title="Notes" icon={StickyNote} cols={1}>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                  {admin.notes}
                </p>
              </DetailSection>
            </>
          )}
        </>
      ) : (
        <EmptyState
          icon={User}
          title="Administrator not found"
          message="No admin profile matches this id."
        />
      )}
    </DetailModal>
  );
}
