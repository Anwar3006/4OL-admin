"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  HeartPulse,
  UserCheck,
  Calendar,
  Sparkles,
  GitBranch,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { THealthyLivingOutput } from "@/schemas/healthyLiving.schema";
import { LexicalRenderer } from "@/components/LexicalRenderer";
import {
  useAddHealthyLivingDialog,
  useViewHealthyLivingDialog,
} from "@/stores/dialog-store";
import {
  useDeleteHealthyLiving,
  useHealthyLiving,
} from "@/hooks/supabase-calls/useHealthyLiving";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicImageUrl } from "@/lib/utils";

const ViewHealthyLivingDialog = () => {
  const { isOpen, close, entityId } = useViewHealthyLivingDialog();
  const { open: openAdd } = useAddHealthyLivingDialog();

  const { data, isLoading } = useHealthyLiving(entityId!);
  const { mutateAsync: deleteMutation } = useDeleteHealthyLiving();

  const handleDelete = async () => {
    await deleteMutation(entityId!);
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl xl:max-w-4xl p-0 flex flex-col bg-white border-0 shadow-2xl rounded-3xl max-h-[90vh]">
        <VisuallyHidden.Root>
          <DialogTitle>Details for {data?.name}</DialogTitle>
        </VisuallyHidden.Root>

        {isLoading ? (
          <ConditionSkeleton />
        ) : !data ? (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <FolderOpen className="h-8 w-8" />
            </div>
            <p className="text-slate-500 font-medium">Record not found.</p>
            <Button variant="outline" onClick={close}>
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="bg-white p-6 md:p-8 pt-12 border-b border-slate-200 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <HeartPulse size={120} />
              </div>

              <DialogHeader className="space-y-4 relative z-10">
                <div className="space-y-2">
                  {/* Breadcrumb / parent path */}
                  {(data as any).parent_path ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <GitBranch className="h-3 w-3 shrink-0" />
                      {((data as any).parent_path as string)
                        .split(" → ")
                        .map((seg: string, i: number, arr: string[]) => (
                          <span key={i} className="flex items-center gap-1">
                            <span
                              className={
                                i === arr.length - 1
                                  ? "font-semibold text-slate-600"
                                  : ""
                              }
                            >
                              {seg}
                            </span>
                            {i < arr.length - 1 && (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-semibold uppercase text-[10px] tracking-wider">
                      <Sparkles className="h-3.5 w-3.5 mr-1" /> Root Topic
                    </Badge>
                  )}

                  <DialogTitle className="card-title font-black tracking-tight text-slate-900 leading-tight">
                    {data.name}
                  </DialogTitle>

                  {data.description && (
                    <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
                      {data.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="rounded-full shadow-md transition-all hover:shadow-lg active:scale-95 px-5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => openAdd(data)}
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 ml-auto rounded-full"
                  >
                    🗑️
                  </Button>
                </div>
              </DialogHeader>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 space-y-10">
              {/* Cover image */}
              {data.image_url && (
                <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-200">
                  <img
                    src={getPublicImageUrl(data.image_url)}
                    alt={data.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Content sections */}
              {Array.isArray(data.content_sections) &&
                data.content_sections.length > 0 && (
                  <section className="space-y-4">
                    <SectionHeading
                      icon={HeartPulse}
                      label="Content Sections"
                    />
                    <div className="grid gap-4">
                      {(
                        data.content_sections as {
                          sub_name: string;
                          sub_content: any;
                        }[]
                      ).map(
                        (
                          sec: { sub_name: string; sub_content: any },
                          idx: number,
                        ) => (
                          <div
                            key={idx}
                            className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm"
                          >
                            <p className="font-bold text-slate-900 text-base mb-2">
                              {sec.sub_name}
                            </p>
                            <div className="text-sm text-slate-600 leading-relaxed">
                              <LexicalRenderer initialState={sec.sub_content} />
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>
                )}

              {/* Children (sub-topics) */}
              {data.children && data.children.length > 0 && (
                <section className="space-y-4">
                  <SectionHeading
                    icon={FolderOpen}
                    label={`Sub-topics (${data.children.length})`}
                  />
                  <div className="grid gap-3">
                    {data.children.map((child: THealthyLivingOutput) => (
                      <ChildCard
                        key={child.id}
                        child={child}
                        onOpen={openAdd}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Attribution */}
              {data.attribution && (
                <footer className="pt-10 border-t border-slate-200 space-y-6 pb-10">
                  <div className="flex items-start gap-3 px-2">
                    <UserCheck className="h-5 w-5 text-slate-400 mt-1" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                        Content Attribution
                      </p>
                      <div className="text-sm text-slate-500">
                        <LexicalRenderer initialState={data.attribution} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                        Created On
                      </p>
                      <p className="text-sm font-medium text-slate-600">
                        {new Date(data.created_at).toLocaleDateString(
                          undefined,
                          {
                            dateStyle: "long",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </footer>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Small helpers ──────────────────────────────────────────────────────────

const SectionHeading = ({
  icon: Icon,
  label,
}: {
  icon: any;
  label: string;
}) => (
  <div className="flex items-center gap-2">
    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
      <Icon className="h-4 w-4" />
    </div>
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
      {label}
    </h3>
  </div>
);

const ChildCard = ({
  child,
  onOpen,
}: {
  child: THealthyLivingOutput;
  onOpen: (data: any) => void;
}) => (
  <div
    className="group flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer"
    onClick={() => onOpen(child)}
  >
    <div className="mt-0.5 p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
      <FolderOpen className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-slate-900 text-sm">{child.name}</p>
      {child.description && (
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {child.description}
        </p>
      )}
      {child.children && child.children.length > 0 && (
        <Badge
          variant="outline"
          className="mt-1.5 text-[10px] text-emerald-600 border-emerald-200"
        >
          {child.children.length} sub-topic
          {child.children.length !== 1 ? "s" : ""}
        </Badge>
      )}
    </div>
    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0 mt-0.5" />
  </div>
);

function ConditionSkeleton() {
  return (
    <div className="p-8 space-y-6">
      <Skeleton className="h-12 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default ViewHealthyLivingDialog;
