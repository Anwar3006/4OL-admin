"use client";

import Image from "next/image";
import {
  CalendarDays,
  Link2,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BoolRow,
  DetailField,
  DetailIdLine,
  DetailModal,
  DetailSection,
  EmptyState,
  StatusBadge,
  fmtDate,
  humanize,
  list,
  num,
} from "@/components/detail";
import {
  useAddTrainerDialog,
  useViewTrainerDialog,
} from "@/features/fitness/data/dialog-hooks";
import { useTrainer } from "@/features/fitness/data/useTrainer";

/**
 * Fitness ▸ Trainers row detail. Fetches the full trainer by id
 * (useTrainer) and renders on the shared detail-modal shell so it matches
 * the Admins / Reviews / Users modals.
 *
 * Binds to the real TTrainerOutput shape (user_profiles.{first_name,
 * last_name,email,avatar_url}, specialties[], certifications[],
 * years_experience, is_verified, rating_*, total_*, social_links, ...). The
 * previous version read non-existent fields (.image_url/.name/.phone/
 * .whatsapp/.specialization/.services) through `(data as any)`, so most of
 * the panel rendered undefined.
 */
const ViewTrainerDialog = () => {
  const { isOpen, close, entityId } = useViewTrainerDialog();
  const { open: openAdd } = useAddTrainerDialog();
  const { data, isLoading } = useTrainer(entityId ?? null);

  if (!isOpen) return null;

  const profile = data?.user_profiles;
  const name = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
      "Trainer"
    : "Trainer";
  // availability_schedule is z.any() (default {}); flatten whatever shape the
  // row carries into label/value pairs, or an empty list so the section hides.
  const availability = data ? availabilityEntries(data.availability_schedule) : [];

  return (
    <DetailModal
      open={isOpen}
      onClose={close}
      maxWidth="sm:max-w-2xl"
      title={name}
      avatar={
        profile?.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : undefined
      }
      badges={
        data ? (
          <>
            <StatusBadge status={data.status} />
            {data.is_verified && (
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <ShieldCheck className="mr-1 h-3 w-3" /> Verified
              </Badge>
            )}
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <Star className="mr-1 h-3 w-3" />
              {Number(data.rating_average ?? 0).toFixed(1)} ({num(data.rating_count) ?? 0})
            </Badge>
          </>
        ) : undefined
      }
      idLine={<DetailIdLine id={data?.id ?? entityId} />}
      footer={
        data ? (
          <>
            <Button onClick={() => openAdd(data)}>Edit Trainer Profile</Button>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={close} className="ml-auto">
            Close
          </Button>
        )
      }
    >
      {isLoading ? (
        <p className="py-16 text-center text-sm italic text-muted-foreground">
          Loading trainer profile…
        </p>
      ) : !data ? (
        <EmptyState
          icon={User}
          title="Trainer not found"
          message="This trainer profile could not be loaded."
        />
      ) : (
        <>
          <DetailSection title="Profile" icon={User}>
            <DetailField label="Email" value={profile?.email} />
            <DetailField
              label="Years experience"
              value={num(data.years_experience)}
            />
            <DetailField label="Specialties" value={list(data.specialties)} />
            <DetailField
              label="Certifications"
              value={
                data.certifications?.length
                  ? data.certifications.join(", ")
                  : null
              }
            />
            <DetailField
              label="Bio"
              value={data.bio}
              className="sm:col-span-2"
            />
          </DetailSection>

          <DetailSection title="Performance" icon={Star}>
            <DetailField
              label="Average rating"
              value={Number(data.rating_average ?? 0).toFixed(1)}
            />
            <DetailField label="Rating count" value={num(data.rating_count)} />
            <DetailField
              label="Total sessions"
              value={num(data.total_sessions)}
            />
            <DetailField label="Total clients" value={num(data.total_clients)} />
          </DetailSection>

          <DetailSection title="Verification" icon={ShieldCheck}>
            <BoolRow label="Verified" value={data.is_verified} />
            <DetailField label="Verified at" value={fmtDate(toIso(data.verified_at), true)} />
            <DetailField label="Verified by" value={data.verified_by} mono />
            <DetailField
              label="Profile video"
              value={data.profile_video_url}
              mono
              className="sm:col-span-2"
            />
          </DetailSection>

          {availability.length > 0 && (
            <DetailSection title="Availability" icon={CalendarDays}>
              {availability.map((entry) => (
                <DetailField
                  key={entry.label}
                  label={entry.label}
                  value={entry.value}
                  className="sm:col-span-2"
                />
              ))}
            </DetailSection>
          )}

          <DetailSection title="Social links" icon={Link2}>
            <DetailField label="Instagram" value={data.social_links?.instagram} mono />
            <DetailField label="LinkedIn" value={data.social_links?.linkedin} mono />
            <DetailField label="Twitter" value={data.social_links?.twitter} mono />
          </DetailSection>

          <DetailSection title="Lifecycle" icon={CalendarDays}>
            <DetailField label="Created" value={fmtDate(toIso(data.created_at), true)} />
            <DetailField label="Updated" value={fmtDate(toIso(data.updated_at), true)} />
            <DetailField label="User ID" value={data.user_id} mono />
          </DetailSection>
        </>
      )}
    </DetailModal>
  );
};

/** TTrainerOutput date fields are typed `string | Date`; fmtDate wants a string. */
function toIso(value?: string | Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Flatten the free-form `availability_schedule` (z.any()) into label/value
 * pairs without assuming a fixed shape. Handles a plain object, an array of
 * scalars/objects, and nested values; returns an empty list when there is
 * nothing meaningful to show so the section can be omitted entirely.
 */
function availabilityEntries(value: unknown): { label: string; value: string }[] {
  const fmt = (v: unknown): string => {
    if (v == null) return "";
    if (Array.isArray(v)) {
      return v
        .map((x) => (typeof x === "string" ? humanize(x) || x : fmt(x)))
        .filter(Boolean)
        .join(", ");
    }
    if (typeof v === "object") {
      return Object.entries(v as Record<string, unknown>)
        .map(([k, val]) => {
          const rendered = fmt(val);
          return rendered ? `${humanize(k) || k}: ${rendered}` : "";
        })
        .filter(Boolean)
        .join("; ");
    }
    if (typeof v === "boolean") return v ? "Yes" : "No";
    return String(v);
  };

  if (Array.isArray(value)) {
    return value
      .map((item, i) => ({ label: `Slot ${i + 1}`, value: fmt(item) }))
      .filter((e) => e.value);
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => ({ label: humanize(k) || k, value: fmt(v) }))
      .filter((e) => e.value);
  }
  return [];
}

export default ViewTrainerDialog;
