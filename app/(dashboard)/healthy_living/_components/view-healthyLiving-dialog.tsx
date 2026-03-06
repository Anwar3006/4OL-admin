"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Edit,
  Trash2,
  Info,
  HeartPulse,
  Stethoscope,
  BookOpen,
  UserCheck,
  Ban,
  LayoutGrid,
  Calendar,
  ExternalLink,
  Sparkles,
} from "lucide-react";
// Assuming this is your renderer
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

interface Props {
  isOpen: boolean;
  close: () => void;
  data?: THealthyLivingOutput;
  isLoading: boolean;
  onEdit: (data: THealthyLivingOutput) => void;
}

const ViewHealthyLivingDialog = () => {
  const { isOpen, close, open, entityId } = useViewHealthyLivingDialog();
  const { open: openAdd } = useAddHealthyLivingDialog();

  const { data, isLoading } = useHealthyLiving(entityId!);
  const { mutateAsync } = useDeleteHealthyLiving();

  if (isLoading) {
    return (
      <div className="p-6">
        <ConditionSkeleton />
      </div>
    );
  }

  const handleDelete = async () => {
    await mutateAsync(entityId!);
    close();
  };

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-3xl xl:max-w-4xl p-0 flex flex-col bg-slate-50 border-l shadow-2xl">
        {!isLoading && data ? (
          <>
            {/* 1. Impactful Header Section */}
            <div className="bg-white p-6 md:p-8 pt-12 border-b border-slate-200 relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <HeartPulse size={120} />
              </div>

              <SheetHeader className="space-y-4 relative z-10">
                <VisuallyHidden.Root>
                  <SheetTitle>Details for {data.name}</SheetTitle>
                </VisuallyHidden.Root>

                <div className="space-y-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50 font-semibold uppercase text-[10px] tracking-wider">
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Wellness &
                    Lifestyle
                  </Badge>
                  <SheetTitle className="card-title font-black tracking-tight text-slate-900 leading-tight">
                    {data.name}
                  </SheetTitle>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="rounded-full shadow-md transition-all hover:shadow-lg active:scale-95 px-5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => openAdd(data)}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit Article
                  </Button>
                  <Button
                    onClick={handleDelete}
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-destructive hover:bg-destructive/10 ml-auto rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>
            </div>

            {/* 2. Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 space-y-10">
              {/* Cover Image Placeholder/Display */}
              {data.image_url && (
                <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-200">
                  <img
                    src={getPublicImageUrl(data.image_url)}
                    alt={data.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Category & Overview */}
              <div className="space-y-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" /> Category
                  </h4>
                  <div className="text-slate-700 italic">
                    <LexicalRenderer initialState={data.category} />
                  </div>
                </div>

                <ContentSection
                  icon={Info}
                  title="About this Topic"
                  content={data.about}
                  color="text-blue-600"
                />

                <Separator className="bg-slate-200" />

                {/* Types/Sub-topics Section */}
                {data.types && data.types.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                        <HeartPulse className="h-4 w-4" />
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Key Focus Areas
                      </h3>
                    </div>
                    <div className="grid gap-4">
                      {data.types.map((type, idx) => (
                        <div
                          key={idx}
                          className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                          <p className="font-bold text-slate-900 text-base mb-2">
                            {type.type_name}
                          </p>
                          <div className="text-sm text-slate-600 leading-relaxed">
                            <LexicalRenderer initialState={type.about_type} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Clinical Guidance */}
                <div className="grid grid-cols-1 gap-8">
                  <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                    <ContentSection
                      icon={Stethoscope}
                      title="When to Contact a Doctor"
                      content={data.contact_your_doctor}
                      color="text-amber-700"
                    />
                  </div>

                  <ContentSection
                    icon={BookOpen}
                    title="Further Reading"
                    content={data.more_information}
                    color="text-indigo-600"
                  />
                </div>
              </div>

              {/* Footer / Attribution */}
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
                      {new Date(data.created_at).toLocaleDateString(undefined, {
                        dateStyle: "long",
                      })}
                    </p>
                  </div>
                </div>
              </footer>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <Ban className="h-8 w-8" />
            </div>
            <p className="text-slate-500 font-medium">Record not found.</p>
            <Button variant="outline" onClick={close}>
              Close Panel
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// Helper Components
const ContentSection = ({ icon: Icon, title, content, color }: any) => (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <Icon className={`h-5 w-5 ${color}`} />
      <h3 className="card-title font-semibold text-slate-800 tracking-tight">{title}</h3>
    </div>
    <div className="text-slate-600 leading-relaxed text-sm md:text-base pl-7">
      <LexicalRenderer initialState={content} />
    </div>
  </section>
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
