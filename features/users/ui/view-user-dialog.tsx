"use client";

import {
  User,
  Mail,
  Flag,
  Loader2,
  Shield,
  Coins,
  Bell,
  Activity,
  StickyNote,
  BadgeCheck,
  AlertTriangle,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  useViewUserDialog,
  useFlagUserDialog,
} from "@/features/users/data/dialog-hooks";
import { useUser } from "@/features/users/data/useUser";
import {
  DetailSection as Section,
  DetailField as Field,
  BoolRow,
  EmptyState,
  StatusBadge,
  RoleBadge,
  MaskedNotice,
  humanize,
  list,
  num,
  fmtDate,
  initials,
} from "@/components/detail";

/**
 * Comprehensive user-detail modal.
 *
 * Data comes from useUser → getProfileById(id), which returns the TARGET
 * user's full user_profiles row (all 43 columns) with PHI masked server-side
 * unless the caller is super_admin. Every meaningful column is surfaced below,
 * grouped into scannable sections; masked fields render their masked value and
 * a banner explains why. Empty values show an em-dash so admins can tell "no
 * data" apart from "field not collected".
 *
 * Presentational building blocks (Section/Field/BoolRow/badges/formatters) are
 * shared from @/components/detail so every detail modal in the panel is
 * visually consistent.
 */
export default function ViewUserDialog() {
  const { isOpen, entityId, close } = useViewUserDialog();
  const { open: openFlagDialog } = useFlagUserDialog();

  const { data: user, isLoading, isError, error } = useUser({
    id: entityId || "",
    enabled: isOpen && !!entityId,
  });

  if (!isOpen) return null;

  const handleFlagUser = () => {
    if (entityId && user) {
      openFlagDialog(entityId, user);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        aria-describedby={undefined}
        className="sm:max-w-3xl max-h-[90vh] p-0 overflow-hidden flex flex-col"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <DialogHeader className="p-6 border-b bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 text-lg font-black">
              {initials(user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold truncate">
                {user?.name || (isLoading ? "Loading…" : "User Details")}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {user?.role && <RoleBadge role={user.role} />}
                {user?.user_type && (
                  <Badge
                    variant="outline"
                    className="text-2xs font-black uppercase tracking-widest bg-white dark:bg-slate-800"
                  >
                    {humanize(user.user_type)}
                  </Badge>
                )}
                {user?.status && <StatusBadge status={user.status} />}
              </div>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground font-mono min-w-0">
                <Hash className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {user?.public_id || user?.user_id || entityId}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ── PHI-masked banner ──────────────────────────────────────────── */}
        {user?._masked && <MaskedNotice />}

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-7">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-xs font-semibold text-slate-400">
                  Loading profile…
                </p>
              </div>
            ) : isError ? (
              <EmptyState
                icon={AlertTriangle}
                title="Couldn't load this user"
                message={error?.message || "The profile could not be retrieved."}
              />
            ) : user ? (
              <>
                <Section title="Identity" icon={User}>
                  <Field label="Full name" value={user.name} />
                  <Field label="Sex" value={humanize(user.sex)} />
                  <Field label="Date of birth" value={fmtDate(user.dob)} />
                  <Field label="NHIS number" value={user.nhis_number} mono />
                  <Field label="Public ID" value={user.public_id} mono />
                  <Field label="User ID" value={user.user_id} mono />
                </Section>
                <Separator />

                <Section title="Contact & Location" icon={Mail}>
                  <Field label="Email" value={user.email} />
                  <Field label="Phone" value={user.phone_number} />
                  <Field label="Region" value={user.region} />
                  <Field label="Location" value={user.location} />
                  <Field label="Timezone" value={user.timezone} />
                  <BoolRow label="WhatsApp opt-in" value={user.whatsapp_opt_in} />
                  <Field
                    label="WhatsApp since"
                    value={fmtDate(user.whatsapp_opt_in_at)}
                  />
                </Section>
                <Separator />

                <Section title="Account & Role" icon={BadgeCheck}>
                  <Field label="Role" value={humanize(user.role)} />
                  <Field label="User type" value={humanize(user.user_type)} />
                  <Field label="Account types" value={list(user.account_types)} />
                  <Field label="Status" value={humanize(user.status)} />
                  <Field label="Department" value={user.department} />
                  <BoolRow
                    label="Password change required"
                    value={user.requires_password_change}
                    invert
                  />
                  <Field label="Member since" value={fmtDate(user.created_at)} />
                  <Field
                    label="Last updated"
                    value={fmtDate(user.updated_at, true)}
                  />
                  <Field
                    label="Deleted at"
                    value={fmtDate(user.deleted_at, true)}
                  />
                </Section>
                <Separator />

                <Section title="Security & Authentication" icon={Shield}>
                  <BoolRow label="MFA enabled" value={user.mfa_enabled} />
                  <Field
                    label="MFA verified"
                    value={fmtDate(user.mfa_verified_at, true)}
                  />
                  <Field
                    label="Last login"
                    value={fmtDate(user.last_login_at, true)}
                  />
                  <Field label="Failed login attempts" value={num(user.login_attempts)} />
                  <Field
                    label="Locked until"
                    value={
                      user.locked_until
                        ? fmtDate(user.locked_until, true)
                        : "Not locked"
                    }
                  />
                  <Field
                    label="Whitelisted IPs"
                    value={
                      user.whitelisted_ips?.length
                        ? user.whitelisted_ips.join(", ")
                        : "Any"
                    }
                  />
                </Section>
                <Separator />

                <Section title="Engagement & Consents" icon={Activity}>
                  <Field label="Last active" value={fmtDate(user.last_active, true)} />
                  <BoolRow
                    label="Fitness onboarding done"
                    value={user.has_completed_fitness_onboarding}
                  />
                  <BoolRow label="Marketing consent" value={user.marketing_consent} />
                  <BoolRow label="Research consent" value={user.research_consent} />
                  <Field
                    label="Medical disclaimer"
                    value={fmtDate(user.medical_disclaimer_acknowledged_at, true)}
                  />
                  <Field
                    label="Last review prompt"
                    value={fmtDate(user.last_review_prompt_at, true)}
                  />
                </Section>
                <Separator />

                <Section title="Fitcoins & Rewards" icon={Coins}>
                  <Field label="Balance" value={num(user.fitcoins_balance)} />
                  <Field label="Lifetime earned" value={num(user.lifetime_fitcoins_earned)} />
                </Section>
                <Separator />

                <Section title="Notifications" icon={Bell}>
                  <BoolRow
                    label="Push (master)"
                    value={user.push_notifications_enabled}
                  />
                  <BoolRow label="Chats" value={user.push_chats_enabled} />
                  <BoolRow label="Medication" value={user.push_medication_enabled} />
                  <BoolRow label="Workouts" value={user.push_workouts_enabled} />
                  <BoolRow label="Promotions" value={user.push_promotions_enabled} />
                  <BoolRow label="Device push token" value={!!user.expo_push_token} />
                </Section>
                <Separator />

                <Section title="Moderation" icon={Flag}>
                  <BoolRow label="Flagged" value={user.is_flagged} invert />
                  <Field
                    label="Flag reason"
                    value={user.flag_reason}
                    className="sm:col-span-2"
                  />
                  <Field label="Flagged at" value={fmtDate(user.flagged_at, true)} />
                  <Field label="Flagged by" value={user.flagged_by} mono />
                </Section>

                {(user.notes || "").trim().length > 0 && (
                  <>
                    <Separator />
                    <Section title="Notes" icon={StickyNote} cols={1}>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                        {user.notes}
                      </p>
                    </Section>
                  </>
                )}
              </>
            ) : (
              <EmptyState
                icon={User}
                title="User not found"
                message="No profile matches this id."
              />
            )}
          </div>
        </ScrollArea>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        {user && (
          <div className="p-6 border-t bg-slate-50/70 dark:bg-slate-900/60 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 font-black uppercase tracking-widest text-2xs"
              onClick={close}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-11 font-black uppercase tracking-widest text-2xs"
              onClick={handleFlagUser}
            >
              <Flag className="h-4 w-4 mr-2" />
              {user.is_flagged ? "Update Flag" : "Flag User"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
