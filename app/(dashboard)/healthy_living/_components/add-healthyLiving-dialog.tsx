"use client";

import React, { useEffect, useState } from "react";
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
import { useAddHealthyLivingDialog } from "@/stores/dialog-store";
import { RichTextEditor } from "@/components/RichTextInput";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";
import ImageDropZone from "@/components/ImageDropZone";
import {
  useCreateHealthyLiving,
  useUpdateHealthyLiving,
} from "@/hooks/supabase-calls/useHealthyLiving";

const emptyForm = () => ({
  name: "",
  description: "",
  image_url: "",
  content: EMPTY_LEXICAL_STATE,
  attribution: EMPTY_LEXICAL_STATE,
  status: "published" as "draft" | "published" | "archived",
});

const AddHealthyLivingDialog = () => {
  const { isOpen, data, isEditMode, close } = useAddHealthyLivingDialog();
  const { mutateAsync: create, isPending: creating } = useCreateHealthyLiving();
  const { mutateAsync: update, isPending: updating } = useUpdateHealthyLiving();
  const isSubmitting = creating || updating;

  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    if (!isOpen) return;
    if (isEditMode && data) {
      setForm({
        name: data.name ?? "",
        description: data.description ?? "",
        image_url: data.image_url ?? "",
        content: data.content ?? EMPTY_LEXICAL_STATE,
        attribution: data.attribution ?? EMPTY_LEXICAL_STATE,
        status: data.status ?? "published",
      });
    } else {
      setForm(emptyForm());
    }
  }, [isOpen, isEditMode, data]);

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
      content: form.content,
      image_url: form.image_url || null,
      attribution: form.attribution,
      status: form.status,
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
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto py-5 px-4 md:px-8 !bg-white border-slate-200 shadow-2xl z-[300]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Edit — ${data?.name || "Healthy Living"}` : "Add Healthy Living"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
            <Label className="text-xs">Image</Label>
            <ImageDropZone
              filePath={filePath}
              text="Drop an image"
              onFilesChange={(urls: string[]) => set("image_url")(urls[0] ?? "")}
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
              {isSubmitting && <Loader2 size={15} className="animate-spin mr-2" />}
              {isSubmitting ? "Saving…" : isEditMode ? "Update" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={close} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddHealthyLivingDialog;
