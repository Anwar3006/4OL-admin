"use client";

import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  parseCsv,
  normalizePillsRows,
  chunkRows,
  type NormalizedDrugRow,
  type PillsCsvRow,
} from "@/features/medication-reminder/data/drug-import-mapping";
import { useImportDrugs } from "@/features/medication-reminder/data/useDrugs";

/**
 * Excel/CSV import wizard (Gap Analysis B.5 + B.12). Parsing + D1/D2/D3
 * normalization happens client-side; normalized rows are uploaded to
 * `/api/medication/drugs/import` in ≤ 500-row chunks.
 */
export default function ImportDrugsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    rows: NormalizedDrugRow[];
    skippedNotMedication: number;
    skippedNonMed: number;
    totalInFile: number;
  } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const importDrugs = useImportDrugs();

  const reset = () => {
    setFileName(null);
    setPreview(null);
    setParseError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const isCsv = /\.csv$/i.test(file.name);
      if (!isCsv) {
        setParseError(
          "Please export the Excel sheet to CSV first (UTF-8) and upload the .csv file.",
        );
        return;
      }
      const text = await file.text();
      const { records } = parseCsv(text);
      if (!records.length) {
        setParseError("No data rows found in the file.");
        return;
      }
      const result = normalizePillsRows(records as PillsCsvRow[], file.name);
      if (!result.rows.length) {
        setParseError(
          "No importable medication rows found (is_medication = True, non-med indicators excluded).",
        );
        return;
      }
      setPreview(result);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse the file.");
    }
  };

  const handleImport = () => {
    if (!preview || !fileName) return;
    importDrugs.mutate(
      {
        fileName,
        rows: preview.rows,
        skipped: preview.skippedNotMedication + preview.skippedNonMed,
        totalInFile: preview.totalInFile,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  };

  const activeCount = preview?.rows.filter((r) => r.status === "active").length ?? 0;
  const reviewCount = (preview?.rows.length ?? 0) - activeCount;
  const chunkCount = preview ? chunkRows(preview.rows).length : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>📥 Import Drug Catalog</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Upload the classified medication list (CSV, UTF-8). Rows are
            filtered by <code>is_medication = True</code>, non-medication
            indicators are excluded (D2), categories are collapsed to the 9
            platform buckets (D1), and low-confidence rows import as{" "}
            <span className="badge badge-amber">under review</span>.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />

          {!fileName && (
            <button
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-10 text-center hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-3xl mb-2">📄</div>
              <div className="text-xs font-black text-slate-600 uppercase tracking-widest">
                Click to select a CSV file
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Expected columns: original_name, is_medication, generic_name,
                category, availability, reason
              </div>
            </button>
          )}

          {parseError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
              <span>⚠️</span>
              <span>{parseError}</span>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-lg font-black text-slate-800">{preview.totalInFile.toLocaleString()}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">File Rows</div>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <div className="text-lg font-black text-emerald-700">{preview.rows.length.toLocaleString()}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Importable</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-lg font-black text-amber-700">{reviewCount.toLocaleString()}</div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-amber-500">Under Review</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-lg font-black text-red-600">
                    {(preview.skippedNotMedication + preview.skippedNonMed).toLocaleString()}
                  </div>
                  <div className="text-[9px] font-bold uppercase tracking-widest text-red-400">Skipped</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-medium">
                📦 <strong>{fileName}</strong> · {preview.rows.length.toLocaleString()} rows
                will be upserted in {chunkCount} chunk{chunkCount === 1 ? "" : "s"} of ≤ 500
                (deduped by slug). Brand aliases seed the autocomplete table.
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button className="btn btn-secondary btn-sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </button>
          {preview && (
            <button
              className="btn btn-primary btn-sm disabled:opacity-50"
              disabled={importDrugs.isPending}
              onClick={handleImport}
            >
              {importDrugs.isPending
                ? "Importing…"
                : `Import ${preview.rows.length.toLocaleString()} Drugs`}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
