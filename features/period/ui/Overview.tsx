"use client";

import DataTable, { type Column } from "@/components/redesign/DataTable";
import KpiCard from "@/components/redesign/KpiCard";
import type { Row } from "@/features/period/schema/types";
import { pct } from "./formatters";
import { columns } from "./columns";


export default function Overview({ payload }: { payload: any }) {
  const summary = payload.summary ?? {};
  const regionColumns: Column<Row>[] = [
    { key: "region", label: "Region" },
    { key: "activeTrackers", label: "Active (30d)" },
    { key: "totalTrackers", label: "Total" },
    { key: "new30d", label: "New (30d)" },
    {
      key: "averageCycle",
      label: "Avg Cycle",
      render: (value) => (value == null ? "—" : `${value} days`),
    },
    { key: "retention", label: "Retention", render: pct },
    { key: "irregularRate", label: "Variation Signal", render: pct },
    { key: "marketingOptIn", label: "Marketing Opt-in", render: pct },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon="👥"
          label="Active Trackers (30d)"
          value={String(summary.activeTrackers ?? 0)}
          variant="blue"
        />
        <KpiCard
          icon="🧑‍🤝‍🧑"
          label="Total Trackers"
          value={String(summary.totalTrackers ?? 0)}
          variant="teal"
        />
        <KpiCard
          icon="📝"
          label="Daily Logs (30d)"
          value={String(summary.logs30d ?? 0)}
          variant="green"
        />
        <KpiCard
          icon="📅"
          label="Cycle Records"
          value={String(summary.cycleLogs ?? 0)}
          variant="purple"
        />
        <KpiCard
          icon="🔄"
          label="Average Cycle"
          value={
            summary.averageCycleLength == null
              ? "Not measured"
              : `${summary.averageCycleLength} days`
          }
          variant="purple"
        />
        <KpiCard
          icon="↩️"
          label="30-day Retention"
          value={pct(summary.retention)}
          variant="blue"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-header">
            <div>
              <div className="card-title">Regional operations</div>
              <div className="mt-1 text-[10px] text-slate-500">
                Unique users; cycle variation is a review signal, not a
                diagnosis.
              </div>
            </div>
          </div>
          <DataTable
            caption="Period Tracker regional operations"
            columns={regionColumns}
            data={payload.regions ?? []}
            pagination={false}
            getRowId={(row) => row.region}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Daily symptom trends</div>
          </div>
          <div className="space-y-2 p-4">
            {(payload.symptoms ?? []).map((item: Row) => (
              <div
                key={item.name}
                className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px]"
              >
                <span>{item.name}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
            {!(payload.symptoms ?? []).length && (
              <p className="text-[11px] text-slate-500">
                No normalized daily symptom data is available.
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="card p-4">
        <h2 className="text-[11px] font-semibold text-slate-900">
          Metric definitions
        </h2>
        <dl className="mt-3 grid gap-3 md:grid-cols-2">
          {Object.entries(payload.definitions ?? {}).map(([key, value]) => (
            <div key={key}>
              <dt className="text-[10px] font-semibold capitalize text-slate-700">
                {key.replace(/([A-Z])/g, " $1")}
              </dt>
              <dd className="text-[10px] text-slate-500">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
