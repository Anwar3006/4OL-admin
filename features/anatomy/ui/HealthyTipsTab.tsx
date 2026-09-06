"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAnatomyTips,
  useBodyParts,
  useLinkTipToBodyPart,
  useUnlinkTipFromBodyPart,
} from "@/features/anatomy/data/useAnatomy";
import {
  useCreateHealthyLiving,
  useHealthyLivings,
} from "@/features/healthy-living/data/useHealthyLiving";

const inputCls =
  "h-9 px-3 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white";
const labelCls =
  "text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block";

function AddTipDialog({
  open,
  onOpenChange,
  defaultBodyPartId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultBodyPartId: string;
}) {
  const [mode, setMode] = useState<"link" | "create">("link");
  const [tipId, setTipId] = useState("");
  const [bodyPartId, setBodyPartId] = useState(defaultBodyPartId);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: parts } = useBodyParts("all");
  const { data: tips } = useHealthyLivings({ page: 1, limit: 100 });
  const linkTip = useLinkTipToBodyPart();
  const createTip = useCreateHealthyLiving();

  useEffect(() => {
    if (open) {
      setBodyPartId(defaultBodyPartId);
      setTipId("");
      setName("");
      setDescription("");
      setMode("link");
    }
  }, [open, defaultBodyPartId]);

  const bodyPartOptions = useMemo(
    () => (parts?.parts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [parts],
  );

  const handleSubmit = () => {
    if (!bodyPartId) return;
    if (mode === "link") {
      if (!tipId) return;
      linkTip.mutate({ tipId, bodyPartId }, { onSuccess: () => onOpenChange(false) });
    } else {
      if (name.trim().length < 3) return;
      createTip.mutate(
        {
          name: name.trim(),
          slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: description.trim() || undefined,
          content: { body: description.trim() },
          categories: [],
          status: "published",
        },
        {
          onSuccess: (created) => {
            linkTip.mutate(
              { tipId: created.id, bodyPartId },
              { onSuccess: () => onOpenChange(false) },
            );
          },
        },
      );
    }
  };

  const busy = linkTip.isPending || createTip.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🌿 Add Healthy Tip</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${mode === "link" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("link")}
            >
              Link existing tip
            </button>
            <button
              className={`btn btn-sm ${mode === "create" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMode("create")}
            >
              Create new tip
            </button>
          </div>

          <div>
            <label className={labelCls}>Body Part *</label>
            <select
              className={`${inputCls} w-full`}
              value={bodyPartId}
              onChange={(e) => setBodyPartId(e.target.value)}
            >
              <option value="">Select body part…</option>
              {bodyPartOptions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {mode === "link" ? (
            <div>
              <label className={labelCls}>Existing Tip *</label>
              <select
                className={`${inputCls} w-full`}
                value={tipId}
                onChange={(e) => setTipId(e.target.value)}
              >
                <option value="">Select tip…</option>
                {(tips?.healthyLivings ?? []).map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>Tip Name *</label>
                <input
                  className={`${inputCls} w-full`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hydration tips for kidney health"
                />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-secondary btn-sm" onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-sm disabled:opacity-50"
            disabled={busy || !bodyPartId || (mode === "link" ? !tipId : name.trim().length < 3)}
            onClick={handleSubmit}
          >
            {busy ? "Saving…" : "Add Tip"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HealthyTipsTab() {
  const [bodyPartId, setBodyPartId] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: parts } = useBodyParts("all");
  const { data: rows, isLoading } = useAnatomyTips(bodyPartId || undefined);
  const unlinkTip = useUnlinkTipFromBodyPart();

  const bodyPartOptions = useMemo(
    () => (parts?.parts ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [parts],
  );

  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
          🌿 Healthy Tips by Body Part
        </h3>
        <span className="badge badge-green">{rows?.length ?? 0} links</span>
        <div className="ml-auto flex items-center gap-2">
          <select
            className={inputCls}
            value={bodyPartId}
            onChange={(e) => setBodyPartId(e.target.value)}
          >
            <option value="">All body parts</option>
            {bodyPartOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>
            + Add Tip
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-5 py-3">Body Part</th>
              <th className="px-5 py-3">Healthy Tip</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  Loading tips…
                </td>
              </tr>
            )}
            {!isLoading && (rows ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                  No healthy-living tips linked yet. Use <strong>+ Add Tip</strong> to link or
                  create one.
                </td>
              </tr>
            )}
            {!isLoading &&
              (rows ?? []).map((row) => (
                <tr
                  key={`${row.tip_id}-${row.body_part_id}`}
                  className="border-b border-slate-50 hover:bg-slate-50/60"
                >
                  <td className="px-5 py-3 font-bold text-slate-800">
                    {row.body_part_name}
                    {row.body_system && (
                      <div className="text-[10px] font-medium text-slate-400">
                        {row.body_system}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/healthy_living?id=${row.tip_id}`}
                      className="font-semibold text-emerald-700 hover:underline"
                    >
                      {row.tip_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={row.status === "published" ? "badge badge-green" : "badge badge-slate"}>
                      {row.status || "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        row.source === "ai" ? "badge badge-amber" : "badge badge-slate"
                      }
                    >
                      {row.source || "manual"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={unlinkTip.isPending}
                      onClick={() =>
                        unlinkTip.mutate({
                          tipId: row.tip_id,
                          bodyPartId: row.body_part_id,
                        })
                      }
                    >
                      Unlink
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <AddTipDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultBodyPartId={bodyPartId}
      />
    </div>
  );
}
