"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, ClipboardList, ShieldCheck, UserRoundSearch } from "lucide-react";

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

export default function TrainersTab() {
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
