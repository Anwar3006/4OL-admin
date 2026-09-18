/**
 * Renders the "Personal Data Access Report" PDF. Deliberately has NO
 * dependency on lib/db/admin.ts or lib/admin-api-auth.ts (both gated by
 * `import "server-only"`, which throws outside the Next.js server bundle) —
 * this file only needs a SupabaseClient instance, not how the caller got
 * one. That keeps it independently runnable from a plain Node/tsx script
 * against the service-role client, which is how this was verified against
 * real data before being wired into the admin route (api/export-pdf.ts).
 *
 * See features/delete-account-requests/schema/pdf-report-categories.ts for
 * why some categories are summarized rather than row-dumped, and why that
 * is NOT the same thing as omitting them from the report.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import PDFDocument from "pdfkit";
import path from "node:path";
import { PDF_CATEGORIES } from "@/features/delete-account-requests/schema/pdf-report-categories";
import type { ExportTable } from "@/features/delete-account-requests/schema/export-tables";

const LOGO_PATH = path.join(process.cwd(), "public/assets/images/all-img/logo.png");

const PAGE_MARGIN = 50;
const COLOR_HEADING = "#0f172a";
const COLOR_BODY = "#334155";
const COLOR_MUTED = "#64748b";
const COLOR_ACCENT = "#059669";
const COLOR_RULE = "#e2e8f0";

export interface DeleteAccountRequestRow {
  id: string;
  user_id: string;
  email: string;
  status: string;
  reason: string | null;
  created_at: string;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ownerColumnsOf(table: ExportTable): string[] {
  return "column" in table ? [table.column] : [...table.orColumns];
}

function truncate(value: unknown, max = 220): string {
  const str =
    typeof value === "string"
      ? value
      : value === null || value === undefined
        ? "—"
        : JSON.stringify(value);
  return str.length > max ? `${str.slice(0, max)}…` : str;
}

/** Gathers this user's data across every PDF_CATEGORIES table and renders the report. Returns the finished PDF bytes. */
export async function renderPersonalDataReportPdf(
  admin: SupabaseClient,
  reqRow: DeleteAccountRequestRow,
): Promise<Buffer> {
  const { data: profile } = await admin
    .from("user_profiles")
    .select("first_name, last_name, phone_number, created_at, status, marketing_consent, research_consent")
    .eq("user_id", reqRow.user_id)
    .maybeSingle();

  // Fetch every category's rows up front so section rendering below is pure.
  const categoryRows = new Map<string, Record<string, Array<Record<string, unknown>>>>();
  for (const category of PDF_CATEGORIES) {
    const perTable: Record<string, Array<Record<string, unknown>>> = {};
    for (const t of category.tables) {
      const query = admin.from(t.table).select("*");
      const { data, error } = await (
        "column" in t
          ? query.eq(t.column, reqRow.user_id)
          : query.or(`${t.orColumns[0]}.eq.${reqRow.user_id},${t.orColumns[1]}.eq.${reqRow.user_id}`)
      );
      perTable[t.table] = error ? [] : (data ?? []);
    }
    categoryRows.set(category.key, perTable);
  }

  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "(name not on file)";

  // ── Cover ──────────────────────────────────────────────────────────────
  try {
    doc.image(LOGO_PATH, PAGE_MARGIN, PAGE_MARGIN, { width: 40 });
  } catch {
    // Logo is optional — a missing file shouldn't fail the whole report.
  }
  doc
    .fillColor(COLOR_HEADING)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("4 Our Life", PAGE_MARGIN + 50, PAGE_MARGIN + 8);

  doc.moveDown(2.5);
  doc.fontSize(22).fillColor(COLOR_HEADING).text("Personal Data Access Report", { align: "left" });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLOR_MUTED)
    .text(
      "Prepared in response to a data subject access request under the Ghana Data Protection Act, 2012 (Act 843).",
    );
  doc.moveDown(1);

  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).strokeColor(COLOR_RULE).stroke();
  doc.moveDown(0.8);

  const metaRow = (label: string, value: string) => {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_MUTED).text(label, { continued: true });
    doc.font("Helvetica").fillColor(COLOR_BODY).text(`  ${value}`);
  };
  metaRow("Prepared for:", `${fullName} (${reqRow.email})`);
  metaRow("Account created:", fmtDate(profile?.created_at));
  metaRow("Report generated:", fmtDate(new Date().toISOString()));
  metaRow("Internal reference:", reqRow.user_id);
  doc.moveDown(1.2);

  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(COLOR_BODY)
    .text(
      "This report lists the personal data 4 Our Life holds about you, grouped by feature, together with the " +
        "date you provided it or gave consent for it where we have that date on record. Two categories near the " +
        "end (Security & Device Information, Product Analytics) are technical records — we disclose what we hold " +
        "and why, by category and count, rather than as a page of unlabelled device identifiers and event " +
        "timestamps with no meaning on their own; the full raw extract for either is available on request to " +
        "support@4ourlife.com.",
      { align: "left", lineGap: 2 },
    );

  // ── Account Requests (the DSAR/deletion request itself) ─────────────────
  doc.moveDown(1.5);
  sectionHeading(doc, "Account Deletion Request");
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(COLOR_BODY)
    .text(
      `You submitted an account deletion request on ${fmtDate(reqRow.created_at)}. ` +
        `Current status: ${reqRow.status}. Reason given: "${reqRow.reason || "(none given)"}"`,
      { lineGap: 2 },
    );

  // ── Categories ────────────────────────────────────────────────────────
  for (const category of PDF_CATEGORIES) {
    const perTable = categoryRows.get(category.key)!;
    const totalRows = Object.values(perTable).reduce((sum, rows) => sum + rows.length, 0);

    doc.moveDown(1.3);
    sectionHeading(doc, category.title);
    doc.font("Helvetica").fontSize(8.5).fillColor(COLOR_MUTED).text(category.description, { lineGap: 1 });
    doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(COLOR_MUTED).text(`Legal basis: ${category.legalBasis}`);
    doc.moveDown(0.4);

    if (totalRows === 0) {
      doc.font("Helvetica").fontSize(9).fillColor(COLOR_MUTED).text("No data on file.");
      continue;
    }

    if (category.summarizeOnly) {
      for (const t of category.tables) {
        const rows = perTable[t.table];
        if (!rows.length) continue;
        const latest = rows.reduce((max: string | null, r) => {
          const created = (r.created_at ?? r.synced_at) as string | undefined;
          return created && (!max || created > max) ? created : max;
        }, null as string | null);
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor(COLOR_BODY)
          .text(`• ${t.table}: ${rows.length} record(s) on file. Most recent: ${fmtDate(latest)}.`);
      }
      continue;
    }

    if (category.key === "consent") {
      renderConsentEvents(doc, perTable["period_consent_events"] ?? []);
      continue;
    }

    for (const t of category.tables) {
      const rows = perTable[t.table];
      if (!rows.length) continue;
      renderTableRows(doc, t.table, rows, ownerColumnsOf(t));
    }
  }

  doc.moveDown(1.5);
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).strokeColor(COLOR_RULE).stroke();
  doc.moveDown(0.6);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLOR_MUTED)
    .text(
      "Questions about this report, or to request the raw technical extract for the summarized categories above, " +
        "contact support@4ourlife.com. Generated by the 4 Our Life admin panel.",
      { lineGap: 1 },
    );

  // Page numbers. Writing inside the bottom margin makes pdfkit's flowing
  // text renderer think the content overflowed and silently add ANOTHER
  // page per iteration — zeroing the bottom margin for this one write is
  // the documented way around that.
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const bottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLOR_MUTED)
      .text(`Page ${i + 1} of ${range.count}`, PAGE_MARGIN, doc.page.height - 30, {
        width: doc.page.width - PAGE_MARGIN * 2,
        align: "center",
        lineBreak: false,
      });
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
  return done;
}

function sectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLOR_ACCENT).text(title);
  doc.moveDown(0.15);
}

function renderConsentEvents(doc: PDFKit.PDFDocument, rows: Array<Record<string, unknown>>) {
  const sorted = [...rows].sort((a, b) =>
    String(a.consent_type).localeCompare(String(b.consent_type)),
  );
  for (const row of sorted) {
    const granted = row.granted ? "Granted" : "Declined";
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLOR_BODY)
      .text(`${row.consent_type}: `, { continued: true })
      .font("Helvetica")
      .fillColor(row.granted ? COLOR_ACCENT : COLOR_MUTED)
      .text(`${granted}`, { continued: true })
      .fillColor(COLOR_BODY)
      .text(`  (policy ${row.policy_version}, via ${row.source}) — ${fmtDate(row.created_at as string)}`);
  }
}

function renderTableRows(
  doc: PDFKit.PDFDocument,
  tableName: string,
  rows: Array<Record<string, unknown>>,
  ownerColumns: string[],
) {
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLOR_BODY).text(`${tableName} (${rows.length})`);
  doc.moveDown(0.15);

  const hidden = new Set(["user_id", ...ownerColumns]);
  rows.forEach((row, idx) => {
    const entries = Object.entries(row).filter(([k, v]) => !hidden.has(k) && v !== null && v !== "");
    const line = entries.map(([k, v]) => `${k}: ${truncate(v)}`).join("   |   ");
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLOR_MUTED)
      .text(`${idx + 1}. ${line}`, { lineGap: 1 });
  });
  doc.moveDown(0.35);
}
