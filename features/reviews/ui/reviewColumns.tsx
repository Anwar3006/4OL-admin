"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Star, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const RatingStars = ({ rating }: { rating: number | null | undefined }) => {
  if (!rating)
    return (
      <span className="text-2xs font-bold text-slate-400 uppercase tracking-widest">
        No rating
      </span>
    );
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-2.5 w-2.5 ${
            i < rating ? "fill-amber-400 text-amber-400" : "text-slate-200"
          }`}
        />
      ))}
    </div>
  );
};

export const reviewColumns: ColumnDef<any>[] = [
  {
    accessorKey: "user",
    header: "Reviewer",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight leading-none mb-1">
          {row.original.user_profiles?.name || "Anonymous"}
        </div>
        <div className="text-3xs text-slate-400 font-bold uppercase tracking-widest leading-none">
          {row.original.user_profiles?.email}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "facility",
    header: "Facility",
    cell: ({ row }) => (
      <div>
        <div className="font-black text-slate-600 dark:text-slate-300 text-xs uppercase tracking-tight leading-none mb-1">
          {row.original.facility_profile?.facility_name || "N/A"}
        </div>
        <RatingStars rating={row.original.rating} />
      </div>
    ),
  },
  {
    accessorKey: "comment",
    header: "Feedback",
    cell: ({ row }) => (
      <div className="max-w-[200px]">
        <p className="text-xs font-medium text-slate-500 line-clamp-2 leading-tight italic">
          "{row.original.comment_text}"
        </p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        {row.original.is_verified_visit && (
          <span className="inline-flex items-center gap-1 text-3xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Verified
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border w-fit",
            row.original.is_published
              ? "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-500/30"
              : "bg-slate-50 dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800",
          )}
        >
          {row.original.is_published ? "Published" : "Hidden"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => (
      <div className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tight">
        {format(new Date(row.original.created_at), "MMM dd, yyyy")}
      </div>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const review = row.original;
      return (
        <div className="flex items-center justify-end gap-2">
          <button aria-label="View Details"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // View handler will be added in page component
            }}
          >
            👁️
          </button>
          <button aria-label="Edit"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Edit handler will be added in page component
            }}
          >
            ✏️
          </button>
          <button aria-label="Delete"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Delete handler will be added in page component
            }}
          >
            🗑️
          </button>
        </div>
      );
    },
  },
];
