import React, { useEffect, useState } from "react";
import {
  Star,
  MessageSquare,
  Trophy,
  Send,
  UserCircle,
  ShieldCheck,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { usePerformFacilityReview } from "@/hooks/supabase-calls/useReviews";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  facility: any;
  adminId: string;
  auditData: any;
};

export function FacilityRatingSection({ facility, adminId, auditData }: Props) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [localRating, setLocalRating] = useState<number | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const { mutate: submitAction, isPending } = usePerformFacilityReview();

  // Get live facility data from query cache
  const liveFacility = queryClient.getQueryData([
    "facility-profile",
    facility.id,
  ]) as any;

  // Use live data if available, fallback to props
  const currentFacility = liveFacility || facility;

  const { myReviews, summary } = auditData || {
    myReviews: [],
    summary: { avgRating: 0, totalReviews: 0 },
  };

  // Handle star click
  const handleStarClick = (rating: number) => {
    // We don't set isSubmittingRating manually; we use 'isPending' from the hook
    submitAction(
      {
        adminId,
        facilityId: facility.id,
        isTopRated: facility.is_top_rated,
        comment: "", // Now works because of SQL fix
        rating: rating,
        parentId: null,
      },
      {
        onSuccess: () => {
          setLocalRating(null);
          toast.success("Rating updated!");
          // REMOVED: window.location.reload()
          // React Query handles the update via invalidateQueries in usePerformFacilityReview
        },
        onError: (error) => {
          console.error("Rating error:", error);
          setLocalRating(null);
        },
      },
    );
  };

  // Handle comment submission (with optional rating)
  const handleCommentSubmit = () => {
    if (!comment.trim()) return;

    submitAction(
      {
        adminId,
        facilityId: facility.id,
        isTopRated: facility.is_top_rated,
        comment: comment,
        rating: localRating || undefined, // Include rating if set
        parentId: null,
      },
      {
        onSuccess: () => {
          setComment("");
          setLocalRating(null);
        },
      },
    );
  };

  // Handle status toggle
  const handleStatusToggle = (isTopRated: boolean) => {
    // Optimistically update local state

    submitAction({
      adminId,
      facilityId: facility.id,
      isTopRated,
      comment: null,
      rating: null,
      parentId: null,
    });
  };

  console.log("Reviews: ");

  return (
    <div className="space-y-8 mt-10">
      {/* 1. Summary Header */}
      <div className="flex items-center justify-between bg-primary/5 p-4 md:p-6 rounded-2xl border border-primary/10">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-white p-3 md:p-4 rounded-xl shadow-lg">
            <span className="text-sm md:text-2xl font-black">
              {summary.avgRating?.toFixed(1) || "0.0"}
            </span>
          </div>
          <div>
            {/* Star Rating Component */}
            <div className="flex gap-1 mb-1">
              <StarRating
                rating={summary.avgRating || 0}
                size={20}
                handleClick={handleStarClick}
                isSubmittingRating={isSubmittingRating}
              />

              {(isSubmittingRating || isPending) && (
                <span className="ml-2 text-xs text-muted-foreground animate-pulse">
                  Submitting...
                </span>
              )}
            </div>
            <p className="text-[0.55rem] md:text-xs font-bold text-muted-foreground uppercase tracking-widest">
              Total {summary.totalReviews} Reviews
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm font-bold text-slate-700">
              Top-Rated Status
            </span>
            <Switch
              disabled={isPending || isSubmittingRating}
              checked={currentFacility.is_top_rated}
              onCheckedChange={handleStatusToggle}
            />
          </div>
          {currentFacility.is_top_rated && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 animate-in fade-in zoom-in">
              <Trophy size={12} /> Featured
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Admin Interaction Box */}
      <div className="relative group">
        <div className="absolute -top-3 left-4 px-2 bg-background text-[10px] font-bold text-primary uppercase tracking-widest z-10">
          Admin Audit Note
        </div>

        {/* Star Rating in Comment Box (Optional) */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Add rating with comment:
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setLocalRating(star)}
                disabled={isPending || isSubmittingRating}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={16}
                  fill={localRating && star <= localRating ? "#facc15" : "none"}
                  stroke={
                    localRating && star <= localRating ? "#facc15" : "#94a3b8"
                  }
                />
              </button>
            ))}
          </div>
          {localRating && (
            <span className="text-xs text-amber-600 font-medium">
              {localRating} star{localRating !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <Textarea
          placeholder="Log an internal observation or follow-up note..."
          className="min-h-32 rounded-2xl border-slate-200 focus:border-primary focus:ring-primary/20 transition-all resize-none p-4 pt-5 bg-slate-50/30"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={isPending || isSubmittingRating}
        />

        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-muted-foreground">
            {localRating ? (
              <span className="text-amber-600 font-medium">
                Rating will be saved with comment
              </span>
            ) : (
              "Comment only (no rating)"
            )}
          </div>

          <Button
            onClick={handleCommentSubmit}
            disabled={
              (!comment.trim() && !localRating) ||
              isPending ||
              isSubmittingRating
            }
            className="rounded-xl gap-2 shadow-md"
          >
            {isPending || isSubmittingRating ? (
              <span className="animate-spin text-lg">...</span>
            ) : (
              <Send size={16} />
            )}
            Post {localRating ? "Rating & Note" : "Note"}
          </Button>
        </div>
      </div>

      {/* 3. Threaded Personal History List */}
      <div className="space-y-4">
        <h4 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/70 flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> Your Internal
          History
        </h4>

        {myReviews.length > 0 ? (
          <div className="grid gap-4">
            {myReviews.map((review: any) => (
              <ReviewBox key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center border-2 border-dashed rounded-2xl">
            <p className="text-sm text-muted-foreground">
              No personal audit history for this facility.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewBox({ review }: { review: any }) {
  const isInternalNote = !review.rating;

  return (
    <div className="group relative bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
          <UserCircle size={24} />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-bold text-slate-800">You</h5>
              {isInternalNote && (
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase tracking-tighter h-4 px-1.5 bg-slate-50 font-bold"
                >
                  Internal Audit
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {formatDistanceToNow(new Date(review.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          {review.rating && (
            <div className="flex gap-0.5 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  fill={i < review.rating ? "#facc15" : "none"}
                  stroke="#facc15"
                />
              ))}
            </div>
          )}

          <p className="text-sm text-slate-600 leading-relaxed">
            {review.comment_text || (
              <span className="text-slate-300 italic">
                Updated facility status.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function StarRating({
  rating,
  size = 20,
  handleClick,
  isSubmittingRating,
}: {
  rating: number;
  size?: number;
  handleClick: (rating: number) => void;
  isSubmittingRating: boolean;
}) {
  // Use local state to track "Hover" or "Selection" intent
  const [hoveredStar, setHoveredStar] = React.useState<number | null>(null);

  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((index) => {
        // LOGIC:
        // 1. If hovering, show solid gold up to the hovered star.
        // 2. Otherwise, show the precise decimal fill of the actual rating.
        const isHovering = hoveredStar !== null;
        const fillAmount = isHovering
          ? index <= hoveredStar
            ? 1
            : 0
          : Math.max(0, Math.min(1, rating - (index - 1)));

        return (
          <button
            type="button"
            key={index}
            onMouseEnter={() => setHoveredStar(index)}
            onMouseLeave={() => setHoveredStar(null)}
            onClick={() => handleClick(index)}
            disabled={isSubmittingRating}
            className={`relative transition-all duration-150 ${
              isSubmittingRating
                ? "opacity-50 cursor-wait"
                : "hover:scale-110 active:scale-90"
            }`}
            style={{ width: size, height: size }}
          >
            {/* Layer 1: The Empty Gray Base */}
            <Star
              size={size}
              className="text-slate-200"
              style={{ position: "absolute", top: 0, left: 0 }}
            />

            {/* Layer 2: The Golden Fill (Clipped) */}
            <div
              className="absolute top-0 left-0 overflow-hidden transition-all duration-300"
              style={{ width: `${fillAmount * 100}%` }}
            >
              <Star size={size} fill="#facc15" stroke="#facc15" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
