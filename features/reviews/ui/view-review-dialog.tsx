"use client";

import {
  Star,
  MessageSquareText,
  User as UserIcon,
  Building2,
  Clock,
  ShieldCheck,
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
  humanize,
  num,
  fmtDate,
} from "@/components/detail";
import { useFacilityReview } from "@/features/reviews/data/useReviews";

/** Five-star rating renderer (filled amber up to `rating`). */
function Stars({ rating }: { rating?: number | null }) {
  const n = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < n ? "fill-amber-400 text-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Comprehensive facility-review detail modal.
 *
 * Refetches the full facility_reviews row by id (all columns + reviewer and
 * facility joins) so every real field is surfaced — the list query only pulls a
 * display subset. Read-only: moderation state changes are handled by the row
 * actions / a future edit form.
 */
export default function ReviewDetailDialog({
  reviewId,
  open,
  onClose,
}: {
  reviewId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, isError, error } = useFacilityReview(
    open ? reviewId : null,
  );

  const reviewer = data?.user;
  const facility = data?.facility;
  const reviewerName = data?.is_anonymous
    ? "Anonymous"
    : [reviewer?.first_name, reviewer?.last_name].filter(Boolean).join(" ").trim() ||
      "Unknown reviewer";

  return (
    <DetailModal
      open={open}
      onClose={onClose}
      maxWidth="sm:max-w-2xl"
      title={isLoading ? "Loading…" : `${reviewerName}'s Review`}
      avatar={<Star className="h-6 w-6" />}
      badges={
        data ? (
          <>
            <StatusBadge status={String(data.status || "pending")} />
            {data.rating != null && (
              <Badge
                variant="outline"
                className="gap-1 text-2xs font-black uppercase tracking-widest bg-white dark:bg-slate-800"
              >
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {data.rating}/5
              </Badge>
            )}
            {data.is_verified_visit && (
              <Badge className="gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 text-2xs font-black uppercase tracking-widest">
                <ShieldCheck className="h-3 w-3" /> Verified visit
              </Badge>
            )}
          </>
        ) : undefined
      }
      idLine={<DetailIdLine id={data?.id || reviewId} />}
      footer={
        <Button
          variant="outline"
          className="flex-1 h-11 font-black uppercase tracking-widest text-2xs"
          onClick={onClose}
        >
          Close
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          <p className="text-xs font-semibold text-slate-400">Loading review…</p>
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load this review"
          message={error?.message || "The review could not be retrieved."}
        />
      ) : data ? (
        <>
          <DetailSection title="Feedback" icon={MessageSquareText} cols={1}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Stars rating={data.rating} />
                <span className="text-xs font-bold text-slate-500">
                  {data.rating ?? "—"} out of 5
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                {data.comment_text || "No comment provided."}
              </p>
            </div>
          </DetailSection>
          <Separator />

          <DetailSection title="Review Meta" icon={ShieldCheck}>
            <DetailField label="Status" value={humanize(String(data.status || ""))} />
            <DetailField label="Helpful count" value={num(data.helpful_count)} />
            <BoolRow label="Verified visit" value={data.is_verified_visit} />
            <BoolRow label="Anonymous" value={data.is_anonymous} />
            <BoolRow label="Provider reply" value={data.is_provider_reply} />
            <DetailField label="Reply to (parent)" value={data.parent_id} mono />
          </DetailSection>
          <Separator />

          <DetailSection title="Reviewer" icon={UserIcon}>
            <DetailField
              label="Name"
              value={data.is_anonymous ? "Anonymous" : reviewerName}
            />
            <DetailField
              label="Email"
              value={data.is_anonymous ? "Hidden" : reviewer?.email}
            />
            <DetailField label="Role" value={humanize(reviewer?.role)} />
            <DetailField label="User ID" value={data.user_id} mono />
          </DetailSection>
          <Separator />

          <DetailSection title="Facility" icon={Building2}>
            <DetailField label="Facility" value={facility?.facility_name} />
            <DetailField label="Facility ID" value={data.facility_id} mono />
          </DetailSection>
          <Separator />

          <DetailSection title="Timestamps" icon={Clock}>
            <DetailField label="Created" value={fmtDate(data.created_at, true)} />
            <DetailField label="Updated" value={fmtDate(data.updated_at, true)} />
          </DetailSection>
        </>
      ) : (
        <EmptyState
          icon={MessageSquareText}
          title="Review not found"
          message="No review matches this id."
        />
      )}
    </DetailModal>
  );
}
