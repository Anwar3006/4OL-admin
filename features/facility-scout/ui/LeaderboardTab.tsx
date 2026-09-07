"use client";

/**
 * Leaderboard tab — per-user scout rankings from the
 * get_facility_scout_leaderboard RPC (Part N, N7). Top-3 get medals.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FacilityScoutTabProps } from "@/features/facility-scout/schema/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardTab({ data, loading }: FacilityScoutTabProps) {
  const leaderboard = data?.leaderboard ?? [];

  return (
    <Card>
      <CardContent className="overflow-x-auto pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Duplicates</TableHead>
              <TableHead>Data Earned</TableHead>
              <TableHead>Success Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                  Loading leaderboard...
                </TableCell>
              </TableRow>
            )}
            {!loading && leaderboard.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-sm text-slate-500">
                  No scout activity recorded yet.
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              leaderboard.map((entry, index) => {
                const successRate =
                  entry.submissions > 0
                    ? Math.round((entry.registered / entry.submissions) * 100)
                    : 0;
                return (
                  <TableRow key={entry.user_id ?? index}>
                    <TableCell className="text-lg">{MEDALS[index] ?? `#${index + 1}`}</TableCell>
                    <TableCell>
                      <div className="font-bold">{entry.full_name || "Unknown user"}</div>
                      <div className="text-2xs text-slate-400 font-mono">
                        {entry.user_id.slice(0, 8)}
                      </div>
                    </TableCell>
                    <TableCell>{entry.region ?? "—"}</TableCell>
                    <TableCell>{entry.submissions}</TableCell>
                    <TableCell className="font-black text-emerald-700">{entry.registered}</TableCell>
                    <TableCell>{entry.duplicates}</TableCell>
                    <TableCell className="font-black text-emerald-700">
                      {entry.data_earned_mb} MB
                    </TableCell>
                    <TableCell>
                      <Badge variant={successRate >= 60 ? "emerald" : successRate >= 30 ? "amber" : "secondary"}>
                        {successRate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
