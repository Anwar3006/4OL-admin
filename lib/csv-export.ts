/**
 * Shared client-side CSV export helper (Gap Analysis Parts E/F).
 * Accepts an array of flat row objects; column order follows key order.
 */
export function downloadCsv(
  rows: Array<Record<string, string | number | boolean | null | undefined>>,
  filename: string,
): void {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const escape = (value: string) =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) =>
      headers.map((h) => escape(String(row[h] ?? ""))).join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
