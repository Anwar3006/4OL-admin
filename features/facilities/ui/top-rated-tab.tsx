"use client";

/**
 * Top Rated tab (Gap Analysis Part H, H1/H6).
 * SA-only leaderboard with a hard 10-slot cap enforced by the
 * /api/facilities/[id]/top-rated route (H-D5). Move up/down swaps ranks
 * via two explicit PUTs; impressions = view_count (H-D4: no bookings table).
 */

import React from "react";
import { cn } from "@/lib/utils";
import KpiCard from "@/components/redesign/KpiCard";
import { useHasPermission } from "@/stores/permission-context";
import {
  useFacilitiesApiList,
  useRemoveTopRatedApi,
  useSetTopRatedApi,
  type FacilityRow,
} from "@/features/facilities/data/useFacilitiesApi";

const SLOT_CAP = 10;

const TopRatedTab = () => {
  const canFeature = useHasPermission("facilities.feature");
  const { data: boardData, isLoading: boardLoading } = useFacilitiesApiList({
    top_rated: "yes",
    limit: 100,
  });
  const { data: candidatesData } = useFacilitiesApiList({
    status: "active",
    limit: 20,
  });

  const setTopRated = useSetTopRatedApi();
  const removeTopRated = useRemoveTopRatedApi();

  const board = [...(boardData?.data ?? [])].sort(
    (a, b) => (a.top_rated_rank ?? 999) - (b.top_rated_rank ?? 999),
  );
  const candidates = (candidatesData?.data ?? []).filter(
    (row) => !row.is_top_rated,
  );
  const impressions = board.reduce((sum, row) => sum + (row.view_count ?? 0), 0);
  const isFull = board.length >= SLOT_CAP;

  const move = (row: FacilityRow, direction: -1 | 1) => {
    const index = board.findIndex((item) => item.id === row.id);
    const neighbour = board[index + direction];
    if (!neighbour) return;
    const myRank = row.top_rated_rank ?? index + 1;
    const theirRank = neighbour.top_rated_rank ?? index + 1 + direction;
    setTopRated.mutate({ id: row.id, rank: theirRank });
    setTopRated.mutate({ id: neighbour.id, rank: myRank });
  };

  return (
    <div className="space-y-4">
      {!canFeature && (
        <div className="bg-purple-50 dark:bg-purple-500/15 border border-purple-200 rounded-2xl px-4 py-3 text-xs font-bold text-purple-800">
          🛡️ Super Admin only — Top Rated curation is gated behind the
          facilities.feature permission. You can view the leaderboard but not
          edit it.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon="🏆"
          label="Slots Occupied"
          value={`${board.length} / ${SLOT_CAP}`}
          variant="purple"
        />
        <KpiCard
          icon="👁️"
          label="Impressions (views)"
          value={impressions.toLocaleString()}
          variant="blue"
        />
        <KpiCard
          icon="📌"
          label="Slots Free"
          value={String(SLOT_CAP - board.length)}
          variant="green"
        />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm divide-y divide-slate-100">
        <div className="px-5 py-4">
          <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
            ⭐ Top Rated Leaderboard
          </p>
        </div>
        {boardLoading ? (
          <p className="px-5 py-8 text-center text-xs font-bold text-slate-400">
            Loading leaderboard...
          </p>
        ) : board.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs font-bold text-slate-400">
            No facilities are top-rated yet.
          </p>
        ) : (
          board.map((row, index) => (
            <div
              key={row.id}
              className="flex items-center gap-4 px-5 py-3"
            >
              <span className="w-8 h-8 shrink-0 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-800 flex items-center justify-center text-xs font-black">
                #{row.top_rated_rank ?? index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">
                  {row.facility_name}
                </p>
                <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest truncate">
                  {row.facility_type?.replace(/_/g, " ")} · {row.region} · ⭐{" "}
                  {row.rating_average ?? "—"} · {row.view_count ?? 0} views
                </p>
              </div>
              {row.top_rated_set_at && (
                <span className="hidden lg:inline text-3xs font-black uppercase tracking-widest text-slate-400">
                  SA set{" "}
                  {new Date(row.top_rated_set_at).toLocaleDateString("en-GB")}
                </span>
              )}
              {canFeature && (
                <div className="flex items-center gap-1">
                  <button
                    className="btn btn-secondary btn-sm disabled:opacity-30"
                    disabled={index === 0 || setTopRated.isPending}
                    onClick={() => move(row, -1)}
                    title="Move up"
                  >
                    ⬆️
                  </button>
                  <button
                    className="btn btn-secondary btn-sm disabled:opacity-30"
                    disabled={
                      index === board.length - 1 || setTopRated.isPending
                    }
                    onClick={() => move(row, 1)}
                    title="Move down"
                  >
                    ⬇️
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    disabled={removeTopRated.isPending}
                    onClick={() => removeTopRated.mutate({ id: row.id })}
                    title="Remove from Top Rated"
                  >
                    ✖
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {canFeature && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-2xs font-black uppercase tracking-widest text-slate-400">
              Add to Top Rated
            </p>
            {isFull && (
              <span className="text-3xs font-black uppercase tracking-widest bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/30 rounded-full px-3 py-1">
                Leaderboard full — remove a slot first
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {candidates.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs font-bold text-slate-400">
                Every active facility is already on the board.
              </p>
            ) : (
              candidates.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">
                      {row.facility_name}
                    </p>
                    <p className="text-2xs font-bold text-slate-400 uppercase tracking-widest truncate">
                      {row.facility_type?.replace(/_/g, " ")} · ⭐{" "}
                      {row.rating_average ?? "—"} ({row.rating_count ?? 0}{" "}
                      reviews)
                    </p>
                  </div>
                  <button
                    className={cn(
                      "btn btn-primary btn-sm text-white",
                      (isFull || setTopRated.isPending) &&
                        "opacity-40 cursor-not-allowed",
                    )}
                    disabled={isFull || setTopRated.isPending}
                    onClick={() => setTopRated.mutate({ id: row.id })}
                  >
                    ⭐ Set Top Rated
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopRatedTab;
