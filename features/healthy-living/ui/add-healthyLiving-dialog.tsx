"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import slugify from "slugify";
import { useAddHealthyLivingDialog } from "@/features/healthy-living/data/dialog-hooks";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";
import ImageDropZone from "@/components/ImageDropZone";
import { rehydrateHierarchy } from "@/lib/utils";
import { TreeMultiSelect } from "@/components/TreeMultiSelect";
import {
  useCategoriesForHealthyLiving,
  useCreateHealthyLiving,
  useUpdateHealthyLiving,
} from "@/features/healthy-living/data/useHealthyLiving";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextInput").then((mod) => mod.RichTextEditor),
  { ssr: false },
);

const emptyForm = () => ({
  name: "",
  description: "",
  image_url: "",
  content: EMPTY_LEXICAL_STATE,
  attribution: EMPTY_LEXICAL_STATE,
  status: "published" as "draft" | "published" | "archived",
  categories: [] as string[],
});

/** Some legacy rows store content as a JSON string rather than jsonb. */
function parseMaybeString(value: any): any {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

/** The canonical content shape groups articles into labelled sections. */
function isSectionsContent(value: any): value is {
  sections: Array<{ key: string; label: string; content: any }>;
} {
  const parsed = parseMaybeString(value);
  return parsed && typeof parsed === "object" && Array.isArray(parsed.sections);
}

/**
 * Returns the Lexical document that should actually be loaded into the
 * rich-text editor. If the stored content uses sections, we edit the first
 * section's content while preserving the rest on save.
 */
function getEditableLexicalContent(content: any): any {
  const parsed = parseMaybeString(content);
  if (isSectionsContent(parsed)) {
    return parsed.sections[0]?.content ?? EMPTY_LEXICAL_STATE;
  }
  return content ?? EMPTY_LEXICAL_STATE;
}

/**
 * Puts the edited Lexical document back into the same shape we received.
 * This keeps section-aware records section-aware and plain records plain.
 */
function buildSavedContent(
  originalContent: any,
  editedLexicalContent: any,
): any {
  const parsed = parseMaybeString(originalContent);
  if (isSectionsContent(parsed)) {
    const sections =
      parsed.sections.length > 0
        ? parsed.sections.map((s: any, i: number) =>
            i === 0 ? { ...s, content: editedLexicalContent } : s,
          )
        : [
            {
              key: "about",
              label: "About",
              content: editedLexicalContent,
            },
          ];
    return { sections };
  }
  return editedLexicalContent;
}

const AddHealthyLivingDialog = () => {
  const { isOpen, data, isEditMode, close } = useAddHealthyLivingDialog();
  const { mutateAsync: create, isPending: creating } = useCreateHealthyLiving();
  const { mutateAsync: update, isPending: updating } = useUpdateHealthyLiving();
  const { data: categories = [], isLoading: loadingCats } =
    useCategoriesForHealthyLiving();
  const isSubmitting = creating || updating;

  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!isOpen) return;
    if (isEditMode && data) {
      setForm({
        name: data.name ?? "",
        description: data.description ?? "",
        image_url: data.image_url ?? "",
        content: getEditableLexicalContent(data.content),
        attribution: data.attribution ?? EMPTY_LEXICAL_STATE,
        status: data.status ?? "published",
        // Prefer the raw {category_id, categories:{id,name}} refs (present
        // when the item came from the list/table). Fall back to `categories`
        // for the detail-query shape (view dialog → Edit). Never pass the
        // list's plain display-name strings straight through —
        // rehydrateHierarchy would mistake them for ids and resolve to [].
        categories: rehydrateHierarchy(
          data.categoryRefs ?? data.categories ?? [],
          categories,
        ),
      });
    } else {
      setForm(emptyForm());
    }
  }, [isOpen, isEditMode, data, categories]);

  const set = (field: keyof ReturnType<typeof emptyForm>) => (value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const filePath = `healthy_living/${slugify(form.name || "item", { lower: true, strict: true })}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.name.trim(), { lower: true, strict: true }),
      description: form.description.trim() || null,
      content: buildSavedContent(data?.content, form.content),
      image_url: form.image_url || null,
      attribution: form.attribution,
      status: form.status,
      categories: form.categories,
    };

    try {
      if (isEditMode && data?.id) {
        await update({ id: data.id, data: payload as any });
      } else {
        await create(payload as any);
      }
      close();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-4 md:px-8 !bg-white border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? `Edit — ${data?.name || "Healthy Living"}`
              : "Add Healthy Living"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 grid grid-cols-1 gap-4 items-start"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Managing Stress"
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </div>
            <div className="space-y-1 bg-white">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Short Description (list card)</Label>
            <Textarea
              placeholder="Short text shown on the mobile list card"
              value={form.description}
              onChange={(e) => set("description")(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Categories</Label>
            {loadingCats ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 size={14} className="animate-spin" /> Loading
                categories…
              </div>
            ) : (
              <TreeMultiSelect
                data={categories}
                value={form.categories}
                onChange={set("categories")}
                placeholder="Select categories…"
              />
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Image</Label>
            <ImageDropZone
              filePath={filePath}
              text="Drop an image"
              onFilesChange={(urls: string[]) =>
                set("image_url")(urls[0] ?? "")
              }
              initialFiles={form.image_url ? [form.image_url] : []}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Content</Label>
            <RichTextEditor
              key={`content-${data?.id ?? "new"}`}
              name="content"
              defaultValue={form.content}
              onChange={set("content")}
              label=""
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Attribution</Label>
            <RichTextEditor
              key={`attribution-${data?.id ?? "new"}`}
              name="attribution"
              defaultValue={form.attribution}
              onChange={set("attribution")}
              label=""
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting && (
                <Loader2 size={15} className="animate-spin mr-2" />
              )}
              {isSubmitting ? "Saving…" : isEditMode ? "Update" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddHealthyLivingDialog;
