"use client";

import Modal from "@/components/redesign/Modal";
import ImageDropZone from "@/components/ImageDropZone";
import type { Row } from "@/features/period/schema/types";
import { dateTime, status } from "./formatters";

/** Strips markup for a plain-text preview -- body_html from a manual entry
 * is raw admin-authored HTML (unsafeHtml() only blocks it at publish time,
 * not at draft time), so this avoids dangerouslySetInnerHTML entirely
 * rather than trusting draft content before it's been reviewed. */
function plainText(html?: string | null) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** ImageDropZone hands back a storage key, not a URL -- period_content.cover_image_url
 * is validated as a full URL (schema + mobile both expect a directly-usable
 * URI), so this mirrors the same public-URL template ImageDropZone uses
 * internally for its own preview (components/ImageDropZone.tsx:193). */
function publicImageUrl(key: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME}/${key}`;
}

/**
 * Content draft review (Gap: "I can't click on the row to see what has been
 * generated"). The Content tab's row actions could send a draft to review,
 * publish, or archive it without ever showing what it says -- this is the
 * missing read step, opened on row click from PeriodPage.tsx. Also where an
 * admin attaches a real cover image: AI drafts only ever produce a text
 * coverImageBrief (never a real image), and the manual create form used to
 * be a URL-only text box.
 */
export default function ContentReviewModal({
  item,
  mutate,
  saving,
  onClose,
}: {
  item: Row | null;
  mutate: (body: Record<string, unknown>, message: string) => Promise<boolean>;
  saving: boolean;
  onClose: () => void;
}) {
  if (!item) return null;
  const coverImageBrief = item.metadata?.coverImageBrief as string | undefined;

  return (
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      title={item.title || "Content draft"}
      size="wide"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-2xs text-slate-500">
            {item.curation_type === "ai_suggested" ? "AI-suggested draft" : "Manual entry"} · {status(item.status)}
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={saving}
              onClick={() =>
                mutate(
                  { action: "update_content_status", id: item.id, status: "review" },
                  "Content sent to review.",
                )
              }
            >
              Send to review
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={saving}
              onClick={async () => {
                const published = await mutate(
                  { action: "update_content_status", id: item.id, status: "published" },
                  "Content published.",
                );
                if (published) onClose();
              }}
            >
              Publish
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm text-red-600 dark:text-red-400"
              disabled={saving}
              onClick={() =>
                mutate(
                  { action: "update_content_status", id: item.id, status: "archived" },
                  "Content archived.",
                )
              }
            >
              Archive
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-2xs font-bold uppercase tracking-wider text-slate-400">Summary</div>
          <p className="text-sm text-slate-700 dark:text-slate-300">{item.summary || "—"}</p>
        </div>

        <div>
          <div className="mb-1 text-2xs font-bold uppercase tracking-wider text-slate-400">Body</div>
          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-700 dark:text-slate-300">
            {plainText(item.body_html) || "No body content."}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-2xs text-slate-400">Topic</div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">{item.topic || "—"}</div>
          </div>
          <div>
            <div className="text-2xs text-slate-400">Tags</div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              {item.tags?.length ? item.tags.join(", ") : "—"}
            </div>
          </div>
          <div>
            <div className="text-2xs text-slate-400">Format</div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">
              {item.content_type?.replaceAll("_", " ") || "—"}
            </div>
          </div>
          <div>
            <div className="text-2xs text-slate-400">Created</div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">{dateTime(item.created_at)}</div>
          </div>
        </div>

        <div>
          <div className="mb-1 text-2xs font-bold uppercase tracking-wider text-slate-400">Cover image</div>
          {coverImageBrief && !item.cover_image_url && (
            <p className="mb-2 text-2xs italic text-slate-500">
              AI brief (not a real image, upload one below): &ldquo;{coverImageBrief}&rdquo;
            </p>
          )}
          {item.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cover_image_url}
              alt=""
              className="mb-2 max-h-40 rounded-lg object-cover"
            />
          )}
          <ImageDropZone
            filePath="period"
            text="Drop a cover image here"
            mediaType="image"
            maxFiles={1}
            onFilesChange={(keys) => {
              if (!keys[0]) return;
              mutate(
                { action: "update_content_image", id: item.id, coverImageUrl: publicImageUrl(keys[0]) },
                "Cover image updated.",
              );
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
