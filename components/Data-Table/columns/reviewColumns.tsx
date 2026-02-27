"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Star, CheckCircle2, Eye, EyeOff, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TFacilityReviewWithData } from "@/schemas/facility-reviews.schema";

const formatDate = (value: any) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString(undefined, { dateStyle: "short" });
};

const RatingStars = ({ rating }: { rating: number | null | undefined }) => {
  if (!rating)
    return <span className="text-xs text-muted-foreground">No rating</span>;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const starId = `rating-star-${Math.random()}-${i}`;
        return (
          <Star
            key={starId}
            className={`h-4 w-4 ${
              i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        );
      })}
      <span className="ml-1 text-sm font-medium">{rating}/5</span>
    </div>
  );
};

export const reviewColumns: ColumnDef<TFacilityReviewWithData>[] = [
  {
    accessorKey: "rating",
    header: () => (
      <div className="font-semibold text-sm xl:text-base">Rating</div>
    ),
    cell: ({ row }) => (
      <div className="min-w-35 flex items-center">
        <RatingStars rating={row.original.rating} />
      </div>
    ),
  },
  {
    accessorKey: "user",
    header: () => (
      <div className="font-semibold text-sm xl:text-base hidden sm:table-cell">
        Reviewer
      </div>
    ),
    cell: ({ row }) => (
      <div className="hidden sm:table-cell min-w-40">
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {row.original.user_profiles?.name || "Anonymous"}
          </span>
          <span className="text-xs text-muted-foreground truncate">
            {row.original.user_profiles?.email}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "facility",
    header: () => (
      <div className="font-semibold text-sm xl:text-base hidden md:table-cell">
        Facility
      </div>
    ),
    cell: ({ row }) => (
      <div className="hidden md:table-cell min-w-40">
        <span className="text-sm">
          {row.original.facility_profile?.facility_name || "N/A"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "comment",
    header: () => (
      <div className="font-semibold text-sm xl:text-base">Comment</div>
    ),
    cell: ({ row }) => (
      <div className="min-w-50 max-w-xs">
        <p className="text-sm line-clamp-2 text-muted-foreground">
          {row.original.comment_text}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "is_verified_visit",
    header: () => (
      <div className="font-semibold text-sm xl:text-base hidden lg:table-cell">
        Verified
      </div>
    ),
    cell: ({ row }) => (
      <div className="hidden lg:table-cell">
        {row.original.is_verified_visit ? (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span>Verified Visit</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Unverified</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "is_published",
    header: () => (
      <div className="font-semibold text-sm xl:text-base hidden xl:table-cell">
        Published
      </div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell">
        {row.original.is_published ? (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <Eye className="h-4 w-4" />
            <span>Published</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <EyeOff className="h-4 w-4" />
            <span>Hidden</span>
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "helpful_count",
    header: () => (
      <div className="font-semibold text-sm xl:text-base hidden xl:table-cell">
        Helpful
      </div>
    ),
    cell: ({ row }) => (
      <div className="hidden xl:table-cell">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Heart className="h-4 w-4" />
          <span>{row.original.helpful_count || 0}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: () => (
      <div className="font-semibold text-sm xl:text-base hidden 2xl:table-cell">
        Date
      </div>
    ),
    cell: ({ row }) => (
      <div className="hidden 2xl:table-cell">
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.created_at)}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    header: () => <div className="sr-only">Actions</div>,
    cell: ({ row }) => {
      const review = row.original;
      return (
        <div className="min-w-12.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-muted"
                aria-label="Open actions menu"
              >
                <span className="sr-only">Open menu</span>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>
                {review.is_published ? "Hide Review" : "Publish Review"}
              </DropdownMenuItem>
              <DropdownMenuItem>Reply to Review</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Remove Review
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
