"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope,
  Activity,
  AlertTriangle,
  Info,
  ExternalLink,
  Edit,
  Trash2,
  Syringe,
  ShieldCheck,
  Dna,
  Ban,
  Calendar,
  User,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { hasLexicalContent, getPublicImageUrl } from "@/lib/utils";
import { LexicalRenderer } from "@/components/LexicalRenderer";
import {
  useCondition,
  useDeleteCondition,
} from "@/hooks/supabase-calls/useCondition";
import Image from "next/image";

export function ViewConditionDialog() {
  const { isOpen, entityId, close } = useViewConditionDialog();
  const addDialog = useAddConditionDialog();

  const { data: condition, isLoading } = useCondition({
    id: entityId!,
    enabled: isOpen && !!entityId,
  });

  const { mutateAsync: deleteCondition } = useDeleteCondition();

  if (!isOpen) return null;

  const handleEdit = () => {
    close();
    addDialog.open(condition as any);
  };

  const handleDelete = async () => {
    const imagePath = [condition?.image_url];
    await deleteCondition({ id: condition?.id!, imagePath });
    close();
  };

  const imageUrl = condition?.image_url
    ? getPublicImageUrl(condition.image_url)
    : "/assets/images/all-img/user.png";

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl xl:max-w-4xl p-0 flex flex-col bg-slate-50 border-l shadow-2xl">
        {isLoading ? (
          <div className="flex items-center justify-center h-full p-12">
            <ConditionSkeleton />
          </div>
        ) : condition ? (
          <>
            {/* ── Header ── */}
            <div className="bg-white p-6 md:px-8 md:py-3 pt-3 border-b border-slate-200">
              <SheetHeader className="space-y-4">
                <VisuallyHidden.Root>
                  <SheetTitle>Details for {condition.name}</SheetTitle>
                </VisuallyHidden.Root>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      {condition?.is_systemic ? (
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-semibold uppercase text-[10px] tracking-wider px-2 py-0.5">
                          <Dna className="h-3.5 w-3.5 mr-1" /> Systemic
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-black bg-sky-300 font-medium uppercase text-[10px] tracking-wider px-2 py-0.5"
                        >
                          Localized
                        </Badge>
                      )}
                    </div>
                    <SheetTitle className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
                      {condition?.name}
                    </SheetTitle>
                  </div>

                  {/* Condition Image */}
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl -z-10 animate-pulse" />
                    <div className="h-24 w-24 md:h-40 md:w-40 rounded-3xl overflow-hidden border-4 border-white shadow-xl rotate-3 transition-transform hover:rotate-0 relative">
                      <Image
                        src={imageUrl}
                        alt={condition?.name}
                        fill
                        sizes="(max-width: 768px) 96px, 160px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="rounded-full shadow-md transition-all hover:shadow-lg active:scale-95 px-5"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit Details
                  </Button>
                  {condition?.nhs_link && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white"
                      asChild
                    >
                      <a href={condition.nhs_link} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> NHS Resource
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="text-slate-400 hover:text-destructive hover:bg-destructive/10 ml-auto rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>
            </div>

            {/* ── Scrollable Content ── */}
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 space-y-12">
              <div className="space-y-10">
                <ContentSection
                  icon={Info}
                  title="Overview"
                  content={condition?.about}
                  color="text-blue-600"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <ContentSection
                    icon={Activity}
                    title="Symptoms"
                    content={condition?.symptoms}
                    color="text-amber-600"
                  />
                  <ContentSection
                    icon={Stethoscope}
                    title="Diagnosis"
                    content={condition?.diagnosis}
                    color="text-emerald-600"
                  />
                </div>

                <Separator className="bg-slate-200" />

                <ContentSection
                  icon={Syringe}
                  title="Treatment & Management"
                  content={condition?.treatment}
                  color="text-indigo-600"
                />

                <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100 ring-4 ring-rose-50/20">
                  <ContentSection
                    icon={AlertTriangle}
                    title="Potential Complications"
                    content={condition?.complications}
                    color="text-rose-600"
                  />
                </div>

                <ContentSection
                  icon={ShieldCheck}
                  title="Prevention"
                  content={condition?.prevention}
                  color="text-teal-600"
                />
              </div>

              {/* ── Clinical Variants (Types) ── */}
              {condition.types?.length > 0 && (
                <section className="space-y-5 pt-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Clinical Variants
                    </h3>
                  </div>
                  <div className="grid gap-4 pl-8">
                    {condition.types.map((type: any) => (
                      <div
                        key={type.type_name}
                        className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-colors"
                      >
                        <p className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
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

              {/* ── Footer Meta ── */}
              <footer className="pt-10 border-t border-slate-200 space-y-6 pb-10">
                <div className="grid grid-cols-2 gap-8 px-2">
                  <MetaItem
                    icon={User}
                    label="Medical Specialist"
                    value={condition?.specialist || "General Practitioner"}
                  />
                  <MetaItem
                    icon={Calendar}
                    label="Last Verified"
                    value={new Date(condition?.updated_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  />
                </div>
              </footer>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
              <Ban className="h-8 w-8" />
            </div>
            <p className="text-slate-500 font-medium">
              Condition record not found or has been moved.
            </p>
            <Button variant="outline" onClick={close}>
              Close Panel
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ── Sub-Components ── */

function ContentSection({ icon: Icon, title, content, color }: any) {
  const isContentEmpty = !hasLexicalContent(content);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-current/10 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">{title}</h3>
      </div>
      <div className="text-slate-600 text-[15px] leading-relaxed pl-10">
        {!isContentEmpty ? (
          <LexicalRenderer initialState={content} />
        ) : (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-100/50 border border-slate-100 text-slate-400 italic text-sm">
            <Ban className="h-4 w-4 opacity-50" />
            Information not currently provided for this section
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function ConditionSkeleton() {
  return (
    <div className="flex items-center gap-3 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">Loading condition...</span>
    </div>
  );
}
