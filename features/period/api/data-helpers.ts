import { getAdminClient } from "@/lib/db/admin";

/**
 * Shared helpers for the /api/period/data handlers: HTML safety, slugs, name
 * masking, audit writes, profile lookup and in-memory paging.
 */
export const unsafeHtml = (value: string) => /<\s*(script|iframe|object|embed)|javascript\s*:|\bon\w+\s*=/i.test(value);
export const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

export const maskName = (first?: string | null, last?: string | null) => {
  const mask = (value?: string | null) => value ? `${value.slice(0, 1)}${"•".repeat(Math.min(4, Math.max(1, value.length - 1)))}` : "";
  return [mask(first), mask(last)].filter(Boolean).join(" ") || "Anonymous user";
};

export async function writeAudit(actorId: string, action: string, resourceType: string, resourceId?: string, metadata: Record<string, unknown> = {}) {
  const admin = getAdminClient();
  const { error } = await admin.from("admin_activity_logs").insert({
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId ?? null,
    metadata,
  });
  if (error) console.error("[period/audit]", error.message);
}

export function profileMaps(profiles: Array<Record<string, any>>) {
  return new Map(profiles.map((profile) => [profile.user_id, profile]));
}

export async function loadProfiles(admin: ReturnType<typeof getAdminClient>, userIds: string[]) {
  if (!userIds.length) return [];
  // region lives on period_user_settings (period-tracker-specific), not
  // user_profiles -- there's no user-level region anywhere else on the
  // platform to join against instead.
  const [{ data: profiles, error: profilesError }, { data: settings }] = await Promise.all([
    admin.from("user_profiles").select("user_id,first_name,last_name").in("user_id", userIds),
    admin.from("period_user_settings").select("user_id,region").in("user_id", userIds),
  ]);
  if (profilesError) {
    console.error("[period/loadProfiles] user_profiles error:", profilesError.message);
    return [];
  }
  const regionByUser = new Map((settings ?? []).map((row) => [row.user_id, row.region]));
  return (profiles ?? []).map((profile) => ({ ...profile, region: regionByUser.get(profile.user_id) ?? null }));
}

export function pageRows<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  return {
    data: rows.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

/**
 * Markdown -> HTML for AI-generated article bodies.
 *
 * The model writes Markdown whatever the prompt says. The previous pipeline
 * ran that body through escapeHtml() and wrapped it in <p>, splitting on
 * blank lines -- which preserved "### Recommended Exercises" and
 * "**Light Walking**" as literal characters, so the mobile Library showed
 * punctuation where a heading and a bold run were meant.
 *
 * Escaping still happens first, and only the tags below are introduced
 * afterwards, so a model that emits raw HTML cannot inject anything: its
 * angle brackets are already entities by the time this runs.
 *
 * Intentionally small -- headings, lists, quotes, rules, bold, italic,
 * strikethrough, code and links are the whole vocabulary our editorial
 * prompts produce.
 */
export function markdownToHtml(input: unknown): string {
  const escaped = String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const inline = (value: string) =>
    value
      // Longest markers first so ** is never read as two *.
      .replace(/\*\*\*(\S(?:[\s\S]*?\S)?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, "<strong>$1</strong>")
      .replace(/~~(\S(?:[\s\S]*?\S)?)~~/g, "<s>$1</s>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Single markers only when flanked by non-word characters, so
      // "2 * 3" and "snake_case_name" stay literal.
      .replace(/(^|[^\w*])\*(\S(?:[^*]*?\S)?)\*(?![\w*])/g, "$1<em>$2</em>")
      .replace(/(^|[^\w_])_(\S(?:[^_]*?\S)?)_(?![\w_])/g, "$1<em>$2</em>")
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');

  const html: string[] = [];
  let listTag: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listTag) html.push(`</${listTag}>`);
    listTag = null;
  };

  for (const rawLine of escaped.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = /^(#{1,6})\s*(?=\S)/.exec(line);
    if (heading) {
      closeList();
      // The mobile renderer styles h1-h3 only; deeper levels read better as
      // h3 than as body text.
      const level = Math.min(heading[1].length, 3);
      html.push(`<h${level}>${inline(line.slice(heading[0].length))}</h${level}>`);
      continue;
    }

    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(line)) {
      closeList();
      html.push("<hr>");
      continue;
    }

    const ordered = /^\d{1,3}[.)]\s+(?=\S)/.exec(line);
    // A ternary, not `!ordered && exec(...)`: the && form is typed
    // `false | RegExpExecArray`, which cannot be indexed.
    const bullet = ordered ? null : /^[-*+]\s+(?=\S)/.exec(line);
    const marker = ordered ?? bullet;
    if (marker) {
      const wanted = ordered ? "ol" : "ul";
      if (listTag !== wanted) {
        closeList();
        html.push(`<${wanted}>`);
        listTag = wanted;
      }
      html.push(`<li>${inline(line.slice(marker[0].length))}</li>`);
      continue;
    }

    // &gt; because the escape pass above already converted ">".
    const quote = /^&gt;\s*/.exec(line);
    if (quote) {
      closeList();
      html.push(`<blockquote>${inline(line.slice(quote[0].length))}</blockquote>`);
      continue;
    }

    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();

  return html.join("") || `<p>${inline(escaped)}</p>`;
}
