"use client";

import React from "react";
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Mail,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useFitnessContentSchedule,
  type FitnessScheduledContent,
} from "@/hooks/supabase-calls/useFitnessContentSchedule";

const CONTENT_TYPE_LABEL: Record<FitnessScheduledContent["content_type"], string> = {
  workout: "Workout",
  challenge: "Challenge",
  broadcast: "Broadcast",
  article: "Article",
};

function contentLabel(row: FitnessScheduledContent) {
  const metaTitle = row.metadata?.title;
  if (typeof metaTitle === "string" && metaTitle.trim()) return metaTitle;
  return `${CONTENT_TYPE_LABEL[row.content_type] ?? row.content_type} #${row.reference_id?.slice(0, 8) ?? "—"}`;
}

function formatScheduledAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ScheduleTab = () => {
  const { data: scheduledContent, isLoading, isError } = useFitnessContentSchedule();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Schedule Header & KPIs */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="lg:col-span-3 border-none shadow-sm rounded-[2rem] bg-white">
          <CardHeader className="p-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-black">
                  📅 Content Schedule
                </CardTitle>
                <p className="text-slate-500 font-medium mt-1">
                  Coordinate workout releases, challenges, and group broadcasts
                </p>
              </div>
              <Button className="rounded-xl font-bold bg-[#131927] hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" /> Schedule Content
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search scheduled items..."
                  className="pl-9 h-12 rounded-2xl border-slate-100 bg-slate-50 focus-visible:ring-slate-900"
                />
              </div>
              <Button
                variant="outline"
                className="h-12 rounded-2xl font-bold border-slate-200"
              >
                <Filter className="h-4 w-4 mr-2" /> Date Range
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* <Card className="border-none shadow-sm rounded-[2rem] bg-emerald-500 text-white p-8">
           <CardTitle className="text-lg font-black mb-6">📊 Pipeline</CardTitle>
           <div className="space-y-4">
              {[
                { label: "Today", val: 12, icon: Clock },
                { label: "Pending", val: 4, icon: AlertCircle },
                { label: "Approved", val: 84, icon: CheckCircle2 },
              ].map((stat, i) => (
                <div key={i} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <stat.icon className="h-4 w-4 opacity-80" />
                      <span className="text-xs font-bold opacity-90">{stat.label}</span>
                   </div>
                   <span className="text-lg font-black">{stat.val}</span>
                </div>
              ))}
           </div>
        </Card> */}
      </div>

      {/* Content Calendar Table */}
      <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50">
          <CardTitle className="text-xl font-black">
            📅 Content Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow className="border-none">
                <TableHead className="font-black text-[10px] uppercase tracking-widest px-8">
                  Content
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">
                  Type
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">
                  Target
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">
                  Date/Time
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest">
                  Status
                </TableHead>
                <TableHead className="font-black text-[10px] uppercase tracking-widest text-right px-8">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-slate-50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j} className="px-8">
                        <Skeleton className="h-4 w-full max-w-32" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && isError && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-red-600">
                    Failed to load the content schedule. Try refreshing the page.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !isError && (scheduledContent?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    📂 Nothing scheduled yet.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                !isError &&
                scheduledContent?.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-slate-50/50 transition-colors border-slate-50"
                  >
                    <TableCell className="px-8 font-bold text-slate-700">
                      {contentLabel(row)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="rounded-lg bg-slate-100 text-slate-600 font-bold border-none uppercase text-[9px] tracking-widest px-2"
                      >
                        {CONTENT_TYPE_LABEL[row.content_type] ?? row.content_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-500">
                      {row.target_audience ?? "All Users"}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-600">
                      {formatScheduledAt(row.scheduled_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          row.status === "sent" || row.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 border-none px-3"
                            : row.status === "cancelled" || row.status === "failed"
                              ? "bg-red-100 text-red-700 border-none px-3"
                              : "bg-amber-100 text-amber-700 border-none px-3"
                        }
                      >
                        {(row.status ?? "scheduled").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400"
                        aria-label="More actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button
          variant="outline"
          className="h-auto py-6 rounded-2xl border-slate-200 flex flex-col gap-2 font-bold hover:bg-slate-50"
        >
          <FileEdit className="h-5 w-5 text-blue-500" />
          <span className="text-xs text-slate-600">Edit Templates</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-6 rounded-2xl border-slate-200 flex flex-col gap-2 font-bold hover:bg-slate-50"
        >
          <Mail className="h-5 w-5 text-emerald-500" />
          <span className="text-xs text-slate-600">Bulk Reminder</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-6 rounded-2xl border-slate-200 flex flex-col gap-2 font-bold hover:bg-slate-50"
        >
          <Clock className="h-5 w-5 text-amber-500" />
          <span className="text-xs text-slate-600">Review Queue</span>
        </Button>
        <Button
          variant="outline"
          className="h-auto py-6 rounded-2xl border-slate-200 flex flex-col gap-2 font-bold hover:bg-slate-50"
        >
          <CheckCircle2 className="h-5 w-5 text-purple-500" />
          <span className="text-xs text-slate-600">Auto-Rules</span>
        </Button>
      </div>
    </div>
  );
};

export default ScheduleTab;
