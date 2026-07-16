"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useViewHealthyLivingDialog } from "@/stores/dialog-store";
import { useHealthyLiving } from "@/hooks/supabase-calls/useHealthyLiving";
import { Loader2, Eye } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextInput";

const STATUS_BADGE: Record<string, string> = {
  draft: "badge-gray",
  published: "badge-green",
  archived: "badge-amber",
};

const ViewHealthyLivingDialog = () => {
  const { isOpen, entityId, close } = useViewHealthyLivingDialog();
  const { data, isLoading } = useHealthyLiving(
    isOpen ? (entityId as string) : null,
  );

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto py-5 px-4 md:px-8 !bg-white border-slate-200 shadow-2xl z-[300]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {data?.name || "Healthy Living"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3">
              <span
                className={`badge ${STATUS_BADGE[data.status] || "badge-gray"}`}
              >
                {data.status}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Eye size={13} /> {data.view_count ?? 0} views
              </span>
            </div>

            {data.description && (
              <p className="text-sm text-slate-600">{data.description}</p>
            )}

            {data.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.image_url}
                alt={data.name}
                className="w-full max-h-64 object-cover rounded-lg border border-slate-100"
              />
            )}

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Content
              </p>
              <div className="border border-slate-100 rounded-lg p-2">
                <RichTextEditor
                  name="content-view"
                  defaultValue={data.content}
                  // readOnly
                  label=""
                />
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Attribution
              </p>
              <div className="border border-slate-100 rounded-lg p-2">
                <RichTextEditor
                  name="attribution-view"
                  defaultValue={data.attribution}
                  // readOnly
                  label=""
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 py-8 text-center">Not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewHealthyLivingDialog;
