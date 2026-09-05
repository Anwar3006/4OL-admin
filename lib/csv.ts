/**
 * The one CSV export helper. Client-side only — it builds a Blob and clicks a
 * link, so it must run in the browser.
 *
 * This replaces **ten** client-side implementations: `lib/csv-export.ts`
 * (`downloadCsv`, 11 call sites), `lib/export-csv.ts` (`exportCsv`, 3), and
 * eight copies inlined into components — the audit named the first two and
 * missed the rest, which is the usual shape of this kind of duplication.
 *
 * All ten escaped cells per RFC 4180 in slightly different ways, and they
 * disagreed on three things that are visible to an admin:
 *
 *  1. **The byte-order mark.** Only `exportCsv` wrote one. Excel assumes the
 *     host's legacy 8-bit codepage for a BOM-less file, so a name like
 *     "Kwabena Osei-Bonsu" or any Twi/Ewe diacritic arrived mojibaked for the
 *     11 call sites that used the other helper. The BOM is now always written.
 *     This is a bug fix, not a preference.
 *
 *  2. **The filename.** One helper stamped the date and appended `.csv`; the
 *     other took the name verbatim. Stamping won — an admin who exports the
 *     same table twice in a week wants two files, not `report (1).csv`. Pass
 *     a bare stem; the date and extension are added for you.
 *
 *  3. **The anchor was never in the document.** Four of the inlined copies
 *     created an `<a>`, set `download`, and called `.click()` without
 *     appending it. Chrome tolerates that; Firefox ignores the click and the
 *     export silently does nothing. This helper appends before clicking.
 *
 * The server-side exporters under `app/api/**\/export/` are NOT covered here.
 * They stream CSV in a Response and share none of this DOM code, though they
 * do repeat the escaping. Unifying that is separate work.
 *
 * ── On the signature ──────────────────────────────────────────────────────
 *
 * Rows are objects and the column order follows the key order of the first
 * row. There is deliberately no `headers` parameter: the array-of-arrays
 * form that three of the old copies used kept labels and values in two
 * separate lists that had to be maintained in the same order, and getting
 * them out of step silently mislabels a column. Object keys carry the label,
 * so they cannot drift — use the display string as the key:
 *
 *     downloadCsv(rows.map((r) => ({
 *       "Primary Muscle Group": r.muscle_group,
 *       "Rest (s)": r.rest_seconds,
 *     })), "exercises");
 */

type Cell = string | number | boolean | null | undefined;

/** RFC 4180: quote a field containing a quote, comma or newline; double any quote. */
function escapeCell(value: Cell): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows to an RFC 4180 document. Pure and side-effect free so the escaping can
 * be unit-tested without a DOM — see tests/unit/csv.test.ts. Column order
 * follows the key order of the first row.
 */
export function toCsv(rows: Array<Record<string, Cell>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
  ].join("\r\n");
}

export function downloadCsv(
  rows: Array<Record<string, Cell>>,
  filename: string,
): void {
  if (!rows.length) return;

  const csv = toCsv(rows);

  // U+FEFF byte-order mark: see note 1 above. Written as an escape, not a
  // literal — an invisible character in source is unreviewable and one
  // stray editor save from vanishing.
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stem = filename.replace(/\.csv$/i, "");

  link.href = url;
  link.download = `${stem}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
