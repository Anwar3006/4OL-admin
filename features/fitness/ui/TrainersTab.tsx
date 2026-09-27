"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ClipboardList, ShieldCheck, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

const CURRENT_RULES = [
  "Every current workout plan is publicly attributed to Coach Ama.",
  "Coach Ama is a stock display alias, not a claim about a verified trainer.",
  "Admins can still change the public coach name on an individual plan.",
];

const FUTURE_SCOPE = [
  "Trainer applications and identity verification",
  "Qualifications, specialties and service areas",
  "Workout ownership and trainer performance",
  "Bookings, availability and member feedback",
];

type RegistryTrainer = { id: string; name: string; type: string; status: string; specialties: string[]; programmes_count: number; total_sessions: number; total_clients: number; rating_average: number | null; rating_count: number };

function TrainerRegistry() {
  const { data, isLoading, isError } = useQuery<{ trainers: RegistryTrainer[] }>({
    queryKey: ["fitness", "trainer-providers"],
    queryFn: () => apiFetch("/api/fitness/trainers?limit=100"),
  });
  return <div className="space-y-5 animate-in fade-in duration-500">
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">Read-only provider registry for personal trainers, gyms, and event organisers. Open a provider to manage its record.</div>
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-100 text-3xs font-black uppercase tracking-widest text-slate-400 dark:border-slate-700"><th className="p-4">Provider</th><th className="p-4">Type</th><th className="p-4">Specialties</th><th className="p-4">Programmes</th><th className="p-4">Sessions / clients</th><th className="p-4">Rating</th><th className="p-4">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-700">
      {isLoading && <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-400">Loading trainer providers…</td></tr>}
      {isError && <tr><td colSpan={7} className="p-8 text-center text-sm text-red-500">Could not load trainer providers.</td></tr>}
      {!isLoading && !isError && (data?.trainers ?? []).length === 0 && <tr><td colSpan={7} className="p-8 text-center text-sm text-slate-400">No trainer providers yet.</td></tr>}
      {(data?.trainers ?? []).map((trainer) => <tr key={trainer.id} className="hover:bg-slate-50 dark:hover:bg-slate-900"><td className="p-4"><Link href={`/providers/${trainer.id}`} className="font-bold text-emerald-700 hover:underline">{trainer.name}</Link></td><td className="p-4 text-sm">{trainer.type}</td><td className="p-4 text-sm text-slate-500">{trainer.specialties.join(", ") || "—"}</td><td className="p-4 text-sm">{trainer.programmes_count}</td><td className="p-4 text-sm">{trainer.total_sessions} / {trainer.total_clients}</td><td className="p-4 text-sm">{trainer.rating_average ?? "—"}{trainer.rating_count ? ` (${trainer.rating_count})` : ""}</td><td className="p-4 text-sm capitalize">{trainer.status}</td></tr>)}
    </tbody></table></div>
  </div>;
}

export default function TrainersTab() {
  return <TrainerRegistry />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Card className="overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:via-slate-900 dark:to-blue-500/10">
        <CardHeader className="gap-4 p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <UserRoundSearch className="size-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-white">
                Trainers is a future feature
              </CardTitle>
              <p className="mt-1 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-300">
                The trainer directory and marketplace are not live for members yet, so this page intentionally does not expose unfinished trainer management controls.
              </p>
            </div>
            <Badge className="ml-auto bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300">
              Planned
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <ShieldCheck className="size-5 text-emerald-600" />
              What happens today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CURRENT_RULES.map((rule) => (
              <div key={rule} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{rule}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <ClipboardList className="size-5 text-blue-600" />
              What will be built later
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {FUTURE_SCOPE.map((item) => (
              <div key={item} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
                <span className="size-2 rounded-full bg-blue-500" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
