"use client";

import DOMPurify from "isomorphic-dompurify";

import "@/styles/html-content.css";

/**
 * Renders HTML produced by the Lexical rich-text editor.
 *
 * The allowlist below is what makes `dangerouslySetInnerHTML` defensible here:
 * content comes from admin-authored articles, but it is stored in the database
 * and rendered back into an authenticated admin's session, so an injected
 * <script> or an onerror attribute would run with that admin's privileges.
 * Keep the list tight — widen it only for a tag the editor actually emits.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
    "ul", "ol", "li", "a", "span", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "code", "pre", "hr", "table", "thead", "tbody", "tr", "td", "th",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

function sanitize(html: string, allowedTags?: string[]): string {
  if (!html) return "";
  const config = allowedTags
    ? { ...SANITIZE_CONFIG, ALLOWED_TAGS: allowedTags }
    : SANITIZE_CONFIG;
  return DOMPurify.sanitize(html, config);
}

export interface HtmlRendererProps {
  htmlContent?: string | null;
  className?: string;
  /**
   * Truncate to this many characters of *text*. Note that truncating drops all
   * markup — the result is re-wrapped in a single <p>. That is the original
   * behaviour and the reason a truncated article loses its bullet points.
   */
  maxLength?: number | null;
  showReadMore?: boolean;
}

const HtmlRenderer = ({
  htmlContent,
  className = "",
  maxLength = null,
  showReadMore = false,
}: HtmlRendererProps) => {
  if (!htmlContent) {
    return null;
  }

  let content = sanitize(htmlContent);

  if (maxLength && typeof maxLength === "number") {
    const textContent = content.replace(/<[^>]*>/g, "");

    if (textContent.length > maxLength) {
      const truncatedText = textContent.substring(0, maxLength);
      const lastSpaceIndex = truncatedText.lastIndexOf(" ");
      const cutPoint = lastSpaceIndex > 0 ? lastSpaceIndex : maxLength;

      const truncatedContent = textContent.substring(0, cutPoint) + "...";
      content = `<p>${truncatedContent}</p>`;

      if (showReadMore) {
        content +=
          ' <span class="text-blue-600 cursor-pointer hover:underline">Read More</span>';
      }
    }
  }

  return (
    <div
      className={`html-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
      style={{ lineHeight: "1.6" }}
    />
  );
};

export interface SafeHtmlRendererProps {
  htmlContent?: string | null;
  className?: string;
  allowedTags?: string[];
  maxLength?: number | null;
}

/** As above, but with a caller-supplied tag allowlist and no read-more. */
export const SafeHtmlRenderer = ({
  htmlContent,
  className = "",
  allowedTags = ["p", "strong", "em", "u", "ol", "ul", "li", "br", "a"],
  maxLength = null,
}: SafeHtmlRendererProps) => {
  if (!htmlContent) {
    return null;
  }

  let content = sanitize(htmlContent, allowedTags);

  if (maxLength) {
    const textContent = content.replace(/<[^>]*>/g, "");
    if (textContent.length > maxLength) {
      const truncated = textContent.substring(0, maxLength) + "...";
      content = `<p>${truncated}</p>`;
    }
  }

  return (
    <div
      className={`safe-html-content ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default HtmlRenderer;
