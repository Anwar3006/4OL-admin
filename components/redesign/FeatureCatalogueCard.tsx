import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  CircleDot,
  ExternalLink,
  Lightbulb,
} from "lucide-react";
import {
  mobileFeatureAreasById,
  mobileFeatureCatalogue,
  type MobileFeature,
  type MobileFeatureArea,
} from "@/lib/mobile-feature-catalogue";
import { cn } from "@/lib/utils";

type FeatureCatalogueCardProps = {
  areaIds?: string[];
  title?: string;
  description?: string;
  className?: string;
};

const stateLabels = {
  live: "Available",
  limited: "Limited rollout",
  planned: "Possible addition",
} as const;

const stateStyles = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-500/10 dark:text-emerald-300",
  limited:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/70 dark:bg-amber-500/10 dark:text-amber-300",
  planned:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800/70 dark:bg-violet-500/10 dark:text-violet-300",
} as const;

function FeatureRow({ feature }: { feature: MobileFeature }) {
  const Icon = feature.state === "planned" ? Lightbulb : CheckCircle2;

  return (
    <li className="grid gap-3 border-b border-slate-100 py-4 last:border-0 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
      <div className="flex min-w-0 gap-3">
        <Icon
          aria-hidden="true"
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            feature.state === "planned"
              ? "text-violet-500"
              : feature.state === "limited"
                ? "text-amber-500"
                : "text-emerald-500",
          )}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {feature.name}
            </h4>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-2xs font-bold uppercase tracking-wide",
                stateStyles[feature.state],
              )}
            >
              {stateLabels[feature.state]}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
            {feature.description}
          </p>
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/70">
        <div className="flex gap-2">
          <CircleDot
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
          />
          <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              Working when:{" "}
            </span>
            {feature.workingWhen}
          </p>
        </div>
      </div>
    </li>
  );
}

function AreaContents({ area }: { area: MobileFeatureArea }) {
  return (
    <div className="border-t border-slate-100 px-4 pb-4 dark:border-slate-800 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <h4 className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
          Available to users now
        </h4>
        {area.adminHref && (
          <Link
            href={area.adminHref}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Open admin area
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <ul>
        {area.features.map((feature) => (
          <FeatureRow key={feature.name} feature={feature} />
        ))}
      </ul>

      {area.future.length > 0 && (
        <div className="mt-3 rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 dark:border-violet-800/60 dark:bg-violet-500/5">
          <div className="flex items-start gap-2 border-b border-violet-100 py-3 dark:border-violet-900/50">
            <Lightbulb
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"
            />
            <div>
              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-violet-700 dark:text-violet-300">
                Possible next additions
              </h4>
              <p className="mt-1 text-xs leading-5 text-violet-700/80 dark:text-violet-200/75">
                These are ideas to consider, not features currently promised to
                users.
              </p>
            </div>
          </div>
          <ul>
            {area.future.map((feature) => (
              <FeatureRow key={feature.name} feature={feature} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AreaHeader({ area }: { area: MobileFeatureArea }) {
  const liveCount = area.features.filter(
    (feature) => feature.state === "live",
  ).length;
  const limitedCount = area.features.filter(
    (feature) => feature.state === "limited",
  ).length;

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800"
      >
        {area.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
            {area.name}
          </h3>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {liveCount} available
          </span>
          {limitedCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {limitedCount} limited
            </span>
          )}
          {area.future.length > 0 && (
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-2xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              {area.future.length} possible next
            </span>
          )}
        </div>
        <p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500 dark:text-slate-400">
          {area.summary}
        </p>
      </div>
    </div>
  );
}

export default function FeatureCatalogueCard({
  areaIds,
  title = "Features",
  description =
    "A plain-English record of what the mobile app should deliver. Use the “Working when” checks to confirm a reported service problem.",
  className,
}: FeatureCatalogueCardProps) {
  const areas = areaIds
    ? areaIds.flatMap((id) => {
        const area = mobileFeatureAreasById.get(id);
        return area ? [area] : [];
      })
    : mobileFeatureCatalogue;
  const focused = areas.length === 1;
  const availableCount = areas.reduce(
    (total, area) => total + area.features.length,
    0,
  );
  const futureCount = areas.reduce(
    (total, area) => total + area.future.length,
    0,
  );

  return (
    <section className={cn("card overflow-hidden p-0", className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="card-title text-base">{title}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-2xs font-black uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {availableCount} current
            </span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-2xs font-black uppercase tracking-wide text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
              {futureCount} future ideas
            </span>
          </div>
          <p className="mt-1.5 max-w-4xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        {!focused && (
          <p className="shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold leading-4 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            Open a service to see its promises
          </p>
        )}
      </div>

      {areas.length === 0 ? (
        <p className="px-5 py-6 text-sm text-slate-500">
          No feature information is available for this area.
        </p>
      ) : focused ? (
        <div>
          <div className="px-4 py-4 sm:px-5">
            <AreaHeader area={areas[0]} />
          </div>
          <AreaContents area={areas[0]} />
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {areas.map((area) => (
            <details key={area.id} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset dark:hover:bg-slate-900/60 sm:px-5 [&::-webkit-details-marker]:hidden">
                <AreaHeader area={area} />
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                />
              </summary>
              <AreaContents area={area} />
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
