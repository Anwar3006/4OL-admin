"use client";
import { ColumnDef } from "@tanstack/react-table";
import { Star, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const RatingStars = ({ rating }: { rating: number | null | undefined }) => {
  if (!rating)
    return (
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
        <div className="font-black text-slate-800 text-[11px] uppercase tracking-tight leading-none mb-1">
          {row.original.user_profiles?.name || "Anonymous"}
        </div>
        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
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
        <div className="font-black text-slate-600 text-[11px] uppercase tracking-tight leading-none mb-1">
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
        <p className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-tight italic">
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
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
            <ShieldCheck className="h-3 w-3" /> Verified
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit",
            row.original.is_published
              ? "bg-blue-50 text-blue-700 border-blue-100"
              : "bg-slate-50 text-slate-500 border-slate-100",
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
      <div className="text-[11px] font-black text-slate-600 uppercase tracking-tight">
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
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // View handler will be added in page component
            }}
          >
            👁️
          </button>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              // Edit handler will be added in page component
            }}
          >
            ✏️
          </button>
          <button
            className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
