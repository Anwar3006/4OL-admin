"use client";

import type { Row } from "@/features/period/schema/types";
import { status } from "./formatters";


export default function FeatureFlags({
  flags,
  saving,
  mutate,
}: {
  flags: Row[];
  saving: boolean;
  mutate: (body: Record<string, unknown>, success: string) => Promise<boolean>;
}) {
  return (
    <div className="card p-4">
      <div className="card-title">Staged rollout controls</div>
      <p className="mt-1 text-2xs text-slate-500">
        Changes are audited. A disabled flag always has an effective rollout of
        0%.
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {flags.map((flag) => (
          <div
            key={flag.key}
            className="rounded-lg border border-slate-200 dark:border-slate-700 p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {flag.key.replaceAll("_", " ")}
                </div>
                <div className="mt-1 text-2xs text-slate-500">
                  {flag.description}
                </div>
              </div>
              {status(flag.enabled ? "active" : "paused")}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="text-2xs text-slate-600 dark:text-slate-300">
                Rollout{" "}
                <input
                  id={`rollout-${flag.key}`}
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={flag.rollout_percent}
                  className="ml-1 w-16 rounded border border-slate-300 dark:border-slate-600 px-2 py-1"
                />
                %
              </label>
              <button
                type="button"
                disabled={saving}
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const input = document.getElementById(
                    `rollout-${flag.key}`,
                  ) as HTMLInputElement;
                  const rolloutPercent = Number(input.value);
                  mutate(
                    {
                      action: "update_feature_flag",
                      key: flag.key,
                      enabled: rolloutPercent > 0,
                      rolloutPercent,
                    },
                    `${flag.key.replaceAll("_", " ")} rollout updated.`,
                  );
                }}
              >
                Apply
              </button>
            </div>
          </div>
        ))}
      </div>
      {!flags.length && (
        <p className="mt-3 text-xs text-slate-500">
          No feature flags are configured.
        </p>
      )}
    </div>
  );
}
