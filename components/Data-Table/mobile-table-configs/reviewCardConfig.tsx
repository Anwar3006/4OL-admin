"use client";

import { Star, CheckCircle2, EyeOff, Heart } from "lucide-react";
import { MobileCardConfig } from "../mobile-card-types";
import type { TFacilityReviewWithData } from "@/schemas/facility-reviews.schema";

const RatingStars = ({ rating }: { rating: number | null | undefined }) => {
  if (!rating)
    return <span className="text-xs text-muted-foreground">No rating</span>;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starId = `mobile-star-${Math.random()}-${i}`;
        return (
          <Star
            key={starId}
            className={`h-3 w-3 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        );
      })}
      <span className="ml-1 text-xs font-medium">{rating}/5</span>
    </div>
  );
};

const formatDate = (value: any) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, { dateStyle: "short" });
};

/**
 * Mobile card configuration for Facility Reviews
 * This defines how review data should be displayed in card format on mobile devices
 */
export const reviewCardConfig: MobileCardConfig<TFacilityReviewWithData> = {
  // Header configuration
  header: {
    title: (review) =>
      `${review.facility_profile?.facility_name || "Facility"} Review`,
    subtitle: (review) => review.user_profiles?.name || "Anonymous",
    badge: (review) => (
      <div className="flex items-center gap-1">
        {review.is_verified_visit && (
          <div className="inline-flex items-center gap-0.5 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </div>
        )}
        {!review.is_published && (
          <div className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
            <EyeOff className="h-3 w-3" />
            Hidden
          </div>
        )}
      </div>
    ),
  },

  // Fields to display in card body
  fields: [
    {
      id: "rating",
      label: "Rating",
      render: (review) => <RatingStars rating={review.rating} />,
      className: "justify-between items-center",
    },
    {
      id: "comment",
      label: "Comment",
      render: (review) => (
        <div className="text-sm text-muted-foreground line-clamp-3">
          {review.comment_text}
        </div>
      ),
      className: "pt-3 flex-col items-start",
    },
    {
      id: "email",
      label: "Email",
      render: (review) => (
        <span className="text-xs text-muted-foreground truncate">
          {review.user_profiles?.email || "N/A"}
        </span>
      ),
      className: "justify-between text-xs",
    },
    {
      id: "helpful",
      icon: <Heart className="h-3.5 w-3.5 shrink-0 text-red-500" />,
      render: (review) => (
        <span className="text-xs font-medium">
          {review.helpful_count || 0} helpful
        </span>
      ),
      className: "justify-between text-xs",
    },
    {
      id: "date",
      label: "Date",
      render: (review) => (
        <span className="text-xs">{formatDate(review.created_at)}</span>
      ),
      className: "justify-between text-xs",
    },
  ],

  // Action menu items
  actions: [
    {
      label: "View Details",
      onClick: (review) => {
        console.log("View review details:", review.id);
      },
    },
    {
      label: "Reply to Review",
      onClick: (review) => {
        console.log("Reply to review:", review.id);
      },
    },
    {
      label: "Toggle Published Status",
      onClick: (review) => {
        console.log(
          review.is_published ? "Hide review:" : "Publish review:",
          review.id,
        );
      },
    },
    {
      label: "Remove Review",
      onClick: (review) => {
        console.log("Remove review:", review.id);
      },
      destructive: true,
    },
  ],

  // Custom ID getter
  getId: (review) => review.id,
};
