import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getPublicImageUrl, hasLexicalContent } from "@/lib/utils";
import {
  useAddConditionDialog,
  useViewConditionDialog,
} from "@/stores/dialog-store";
import { TSymptomsOutput } from "@/types/symptoms";

import {
  AlertTriangle,
  Ban,
  Calendar,
  Dna,
  ExternalLink,
  Info,
  LayoutGrid,
  ShieldCheck,
  Stethoscope,
  Syringe,
  User,
  UserCheck2Icon,
} from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { LexicalRenderer } from "@/components/LexicalRenderer";
import {
  useDeleteSymptom,
  useSymptom,
} from "@/hooks/supabase-calls/useSymptoms";

const ViewSymptomDialog = () => {
  const { isOpen, entityId, close } = useViewConditionDialog();
  const addDialog = useAddConditionDialog();

  const { data, isLoading } = useSymptom(entityId!);
  const { mutateAsync: deleteSymptom } = useDeleteSymptom();

  if (!isOpen) return null;

  const handleEdit = () => {
    close();
    addDialog.open(data as TSymptomsOutput);
  };

  const handleDelete = async () => {
    await deleteSymptom(entityId!);
    close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl xl:max-w-4xl p-0 flex flex-col !bg-white border-0 shadow-2xl rounded-3xl max-h-[90vh]">
        <VisuallyHidden.Root>
          <DialogTitle>Details for {data?.name}</DialogTitle>
        </VisuallyHidden.Root>

        {isLoading && (
          <div className="p-6 bg-white h-full flex items-center justify-center">
            <ConditionSkeleton />
          </div>
        )}
        {!isLoading && data ? (
          <>
            {/* 1. Impactful Header Section */}
            <div className="bg-slate-50/80 sticky top-0 z-30 p-6 md:p-8 border-b border-slate-200 backdrop-blur-md">
              <DialogHeader className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {data?.isSystemic ? (
                      <Badge className="bg-indigo-600 text-white border-none font-black uppercase text-[9px] tracking-[0.15em] px-2.5 py-1 shadow-sm">
                        <Dna className="h-3 w-3 mr-1" /> Systemic
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-slate-600 bg-white border-slate-200 font-black uppercase text-[9px] tracking-[0.15em] px-2.5 py-1 shadow-sm"
                      >
                        Localized
                      </Badge>
                    )}
                  </div>
                  <DialogTitle className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 leading-none">
                    {data?.name}
                  </DialogTitle>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    className="btn btn-primary h-9 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100 transition-all hover:scale-[1.02] active:scale-95"
                    onClick={handleEdit}
                  >
                    ✏️ Edit Details
                  </button>
                  {data?.nhsLink && (
                    <button
                      className="btn btn-secondary h-9 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm transition-all hover:bg-slate-50"
                      onClick={() => window.open(data.nhsLink, "_blank")}
                    >
                      🔗 NHS Resource
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors ml-auto shadow-sm"
                  >
                    🗑️
                  </button>
                </div>
              </DialogHeader>
            </div>

            {/* 2. Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-6 md:px-10 py-10 space-y-12 bg-white">
              {/* Cover Image Placeholder/Display */}
              {data.image_url && (
                <div className="rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl aspect-video bg-slate-50 relative group">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <img
                    src={getPublicImageUrl(data.image_url)}
                    alt={data.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}
              {/* Primary Content Grid */}
              <div className="space-y-12">
                <ContentSection
                  icon={Info}
                  title="Overview & Description"
                  content={data?.about}
                  color="text-indigo-600"
                />

                <Separator className="bg-slate-50" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <ContentSection
                    icon={Stethoscope}
                    title="Clinical Diagnosis"
                    content={data?.diagnosis}
                    color="text-emerald-600"
                  />

                  <ContentSection
                    icon={Syringe}
                    title="Care & Treatment"
                    content={data?.treatment}
                    color="text-sky-600"
                  />
                </div>

                <div className="bg-red-50/30 p-8 rounded-[2.5rem] border border-red-100/50 shadow-sm">
                  <ContentSection
                    icon={AlertTriangle}
                    title="Critical Complications"
                    content={data?.complications}
                    color="text-red-600"
                  />
                </div>

                <ContentSection
                  icon={ShieldCheck}
                  title="Prevention Strategy"
                  content={data?.prevention}
                  color="text-teal-600"
                />

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                  <ContentSection
                    icon={UserCheck2Icon}
                    title="Medical Attribution"
                    content={data?.attribution}
                    color="text-amber-500"
                  />
                </div>
              </div>

              {/* 3. Clinical Variants (Types) Section */}
              {data.symptomTypes?.length > 0 && (
                <section className="space-y-6 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                      <LayoutGrid className="h-4 w-4" />
                    </div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Clinical Variants
                    </h3>
                  </div>
                  <div className="grid gap-4 pl-0 md:pl-4">
                    {data.symptomCauses.map((type: any) => (
                      <div
                        key={type.id}
                        className="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50/50 transition-all duration-300"
                      >
                        <p className="font-black text-slate-900 text-lg mb-3 flex items-center gap-3">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-200" />
                          {type.typeName}
                        </p>
                        <div className="text-[15px] text-slate-600 leading-relaxed font-medium">
                          <LexicalRenderer initialState={type.aboutType} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Secondary Meta Section */}
              <footer className="pt-10 border-t border-slate-200 grid grid-cols-2 gap-8 pb-10">
                <MetaItem
                  icon={User}
                  label="Verified Specialist"
                  value={data?.specialist || "General Practitioner"}
                />
                <MetaItem
                  icon={Calendar}
                  label="Update Timestamp"
                  value={new Date(data?.updated_at).toLocaleDateString(
                    undefined,
                    { dateStyle: "medium" },
                  )}
                />
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
      </DialogContent>
    </Dialog>
  );
};

/* --- Refactored Sub-Components --- */

function ContentSection({ icon: Icon, title, content, color }: any) {
  const isContentEmpty = !hasLexicalContent(content);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-current/10 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800">
          {title}
        </h3>
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
export default memo(ViewSymptomDialog);

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

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
