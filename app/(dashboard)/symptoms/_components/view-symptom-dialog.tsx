import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Edit,
  ExternalLink,
  Info,
  LayoutGrid,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Trash2,
  User,
  UserCheck2Icon,
} from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@/components/ui/dialog";
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
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-3xl p-0 flex flex-col bg-slate-50 border-l shadow-2xl">
        {isLoading && (
          <div className="p-6">
            <ConditionSkeleton />
          </div>
        )}
        {!isLoading && data ? (
          <>
            {/* 1. Impactful Header Section */}
            <div className="bg-white p-6 md:p-8 pt-12 border-b border-slate-200">
              <SheetHeader className="space-y-4">
                <VisuallyHidden.Root>
                  <SheetTitle>Details for {data.name}</SheetTitle>
                </VisuallyHidden.Root>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {data?.isSystemic ? (
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-50 font-semibold uppercase text-[10px] tracking-wider">
                        <Dna className="h-3.5 w-3.5 mr-1" /> Systemic
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-slate-400 font-medium uppercase text-[10px] tracking-wider"
                      >
                        Localized
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 leading-tight">
                    {data?.name}
                  </SheetTitle>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    className="rounded-full shadow-md transition-all hover:shadow-lg active:scale-95 px-5"
                    onClick={handleEdit}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit Details
                  </Button>
                  {data?.nhsLink && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full bg-white"
                      asChild
                    >
                      <a href={data?.nhsLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> NHS Resource
                      </a>
                    </Button>
                  )}
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
            <div className="flex-1 overflow-y-auto px-6 md:px-8 py-8 space-y-12">
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
              {/* Primary Content Grid */}
              <div className="space-y-10">
                <ContentSection
                  icon={Info}
                  title="Overview"
                  content={data?.about}
                  color="text-blue-600"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <ContentSection
                    icon={Stethoscope}
                    title="Diagnosis"
                    content={data?.diagnosis}
                    color="text-emerald-600"
                  />

                  <ContentSection
                    icon={Syringe}
                    title="Treatment & Management"
                    content={data?.treatment}
                    color="text-indigo-600"
                  />
                </div>

                <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100 ring-4 ring-rose-50/20">
                  <ContentSection
                    icon={AlertTriangle}
                    title="Potential Complications"
                    content={data?.complications}
                    color="text-rose-600"
                  />
                </div>

                <ContentSection
                  icon={ShieldCheck}
                  title="Prevention"
                  content={data?.prevention}
                  color="text-teal-600"
                />

                <ContentSection
                  icon={UserCheck2Icon}
                  title="Attribution"
                  content={data?.attribution}
                  color="text-teal-600"
                />
              </div>

              {/* 3. Clinical Variants (Types) Section */}
              {data.symptomTypes?.length > 0 && (
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
                    {data.symptomCauses.map((type: any) => (
                      <div
                        key={type.id}
                        className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-indigo-200 transition-colors"
                      >
                        <p className="font-bold text-slate-900 text-base mb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {type.typeName}
                        </p>
                        <div className="text-sm text-slate-600 leading-relaxed">
                          <LexicalRenderer initialState={type.aboutType} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 4. Secondary Meta Section */}
              <footer className="pt-10 border-t border-slate-200 space-y-6 pb-10">
                <div className="grid grid-cols-2 gap-8 px-2">
                  <MetaItem
                    icon={User}
                    label="Medical Specialist"
                    value={data?.specialist || "General Practitioner"}
                  />
                  <MetaItem
                    icon={Calendar}
                    label="Last Verified"
                    value={new Date(data?.updated_at).toLocaleDateString(
                      undefined,
                      { dateStyle: "medium" },
                    )}
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
export default ViewSymptomDialog;

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
