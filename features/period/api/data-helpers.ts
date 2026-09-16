
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
    const bullet = !ordered && /^[-*+]\s+(?=\S)/.exec(line);
    if (ordered || bullet) {
      const wanted = ordered ? "ol" : "ul";
      if (listTag !== wanted) {
        closeList();
        html.push(`<${wanted}>`);
        listTag = wanted;
      }
      html.push(`<li>${inline(line.slice((ordered ?? bullet)![0].length))}</li>`);
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
