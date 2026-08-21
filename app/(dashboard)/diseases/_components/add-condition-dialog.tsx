import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import slugify from "slugify";
import { Button } from "@/components/ui/button";

import CustomInput from "@/components/CustomInput";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { getDeepestNodes, rehydrateHierarchy } from "@/lib/utils";
import ImageDropZone from "@/components/ImageDropZone";
import { nanoid } from "nanoid";
import { useAddConditionDialog } from "@/stores/dialog-store";
import {
  conditionsSchema,
  TConditionsInput,
  TConditionsOutput,
} from "@/schemas/conditions.schema";
import { TreeMultiSelectForm } from "@/components/TreeMultiSelect";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";
import {
  useBodyPartsForSymptoms,
  useCategoriesForSymptoms,
} from "@/hooks/supabase-calls/useSymptoms";
import {
  useCreateConditionApi,
  useUpdateConditionApi,
} from "@/hooks/supabase-calls/useDiseasesApi";

const RichTextEditor = dynamic(
  () => import("@/components/RichTextInput").then((mod) => mod.RichTextEditor),
  { ssr: false },
);

const AddConditionDialog = () => {
  const {
    isOpen,
    data: condition,
    isEditMode,
    close,
  } = useAddConditionDialog();

  const { data: bodyParts = [], isLoading: loadingParts } =
    useBodyPartsForSymptoms();
  const { data: categories = [], isLoading: loadingCats } =
    useCategoriesForSymptoms();

  const { mutateAsync, isPending } = useCreateConditionApi();
  const { mutateAsync: mutateAsyncEdit, isPending: submittingEdit } =
    useUpdateConditionApi();

  const isLoadingForm = loadingParts || loadingCats;
  const isSubmitting = isPending || submittingEdit;

  const form = useForm<TConditionsInput>({
    resolver: zodResolver(conditionsSchema),
    defaultValues: {
      name: "",
      slug: "",
      bodyParts: [],
      categories: [],
      about: EMPTY_LEXICAL_STATE,
      diagnosis: EMPTY_LEXICAL_STATE,
      treatment: EMPTY_LEXICAL_STATE,
      complications: EMPTY_LEXICAL_STATE,
      symptoms: EMPTY_LEXICAL_STATE,
      prevention: EMPTY_LEXICAL_STATE,
      contact_your_doctor: EMPTY_LEXICAL_STATE,
      more_information: EMPTY_LEXICAL_STATE,
      attribution: EMPTY_LEXICAL_STATE,
      is_systemic: false,
      specialist: "",
      nhs_link: "",
      image_url: "",
      icd11_code: "",
      severity: "",
      nhis_coverage: "",
      types: [{ type_name: "", about_type: EMPTY_LEXICAL_STATE }],
      causes: [{ cause_name: "", other_possible_causes: EMPTY_LEXICAL_STATE }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "types",
  });
  const {
    fields: causesFields,
    append: causesAppend,
    remove: causesRemove,
  } = useFieldArray({
    control: form.control,
    name: "causes",
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && condition) {
        // Helper to extract IDs from either objects or strings
        const getIds = (data: any[], items: any[]): string[] => {
          if (!Array.isArray(data)) return [];

          // Check if data is already an array of objects (from useCondition)
          if (data.length > 0 && typeof data[0] === "object") {
            // Extract IDs from junction objects
            return data
              .map((item) => {
                // Handle nested structure: condition_body_parts[0].body_parts.id
                return item.body_parts?.id || item.categories?.id || item.id;
              })
              .filter(Boolean);
          }

          // Otherwise, treat as array of names (from useConditions list)
          return data
            .map((name: string) => items.find((item) => item.name === name)?.id)
            .filter(Boolean);
        };

        // Get body part and category IDs
        const bodyPartIds = getIds(condition.bodyParts || [], bodyParts);
        const categoryIds = getIds(condition.categories || [], categories);

        form.reset({
          ...condition,
          bodyParts: rehydrateHierarchy(bodyPartIds, bodyParts),
          categories: rehydrateHierarchy(categoryIds, categories),
          types: condition.types,
          causes: condition.causes,
          nhs_link: condition.nhs_link ?? "",
          image_url: condition.image_url ?? "",
          specialist: condition.specialist ?? "",
          icd11_code: condition.icd11_code ?? "",
          severity: condition.severity ?? "",
          nhis_coverage: condition.nhis_coverage ?? "",
        });
      } else {
        form.reset({
          name: "",
          slug: "",
          bodyParts: [],
          categories: [],
          about: EMPTY_LEXICAL_STATE,
          diagnosis: EMPTY_LEXICAL_STATE,
          treatment: EMPTY_LEXICAL_STATE,
          complications: EMPTY_LEXICAL_STATE,
          symptoms: EMPTY_LEXICAL_STATE,
          prevention: EMPTY_LEXICAL_STATE,
          contact_your_doctor: EMPTY_LEXICAL_STATE,
          more_information: EMPTY_LEXICAL_STATE,
          attribution: EMPTY_LEXICAL_STATE,
          is_systemic: false,
          specialist: "",
          nhs_link: "",
          image_url: "",
          icd11_code: "",
          severity: "",
          nhis_coverage: "",
          types: [{ type_name: "", about_type: EMPTY_LEXICAL_STATE }],
          causes: [
            { cause_name: "", other_possible_causes: EMPTY_LEXICAL_STATE },
          ],
        });
      }
    }
  }, [isOpen, isEditMode, condition, bodyParts, categories, form]);

  const name = form.watch("name") ?? "";
  const filename = `${name.replace(/\s+/g, "").toLowerCase()}-${nanoid(8)}`;
  const filePath = `conditions/${filename}`;

  const handleSubmit = async (data: TConditionsInput) => {
    try {
      const optimizedBodyPartIds = getDeepestNodes(data.bodyParts, bodyParts);
      const optimizedCategoryIds = getDeepestNodes(data.categories, categories);
      const slug = slugify(data.name as string, { lower: true });
      const payload = {
        ...data,
        bodyPartIds: optimizedBodyPartIds,
        categoryIds: optimizedCategoryIds,
        slug,
        more_information:
          typeof data.more_information === "string"
            ? JSON.parse(data.more_information)
            : data.more_information,
        contact_your_doctor:
          typeof data.contact_your_doctor === "string"
            ? JSON.parse(data.contact_your_doctor)
            : data.contact_your_doctor,
        attribution:
          typeof data.attribution === "string"
            ? JSON.parse(data.attribution)
            : data.attribution,
      };

      if (isEditMode) {
        const editPayload = {
          ...payload,
          id: condition.id,
          specialist: payload.specialist ?? null,
          created_at: condition.created_at,
          updated_at: condition.updated_at,
          categories: data.categories,
          bodyParts: data.bodyParts,
        } as TConditionsOutput;
        await mutateAsyncEdit(editPayload);
        toast.success("Condition updated successfully!");
      } else {
        await mutateAsync(payload);
        toast.success("Condition registered successfully!");
      }
    } catch (error) {
      console.error("Registration Error: ", error);
      toast.error("Registration failed: " + (error as Error).message);
    } finally {
      close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-4 md:px-8 !bg-white border-slate-200 shadow-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Condition" : "Register New Condition"}
          </DialogTitle>
        </DialogHeader>

        {isLoadingForm ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin mr-2" />
            Loading form...
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit, (errors) => {
                console.error("Validation errors:", errors);
                toast.error("Please fill in all required fields.");
              })}
              className="space-y-8 grid grid-cols-1 gap-4 items-start"
            >
              {/* ── Basic Details ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">
                  Basic Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomInput
                    type="text"
                    name="name"
                    control={form.control}
                    label="Condition Name"
                    readOnly={false}
                  />
                  <CustomInput
                    type="text"
                    name="specialist"
                    control={form.control}
                    label="Specialists To Contact (Comma-Separated)"
                    readOnly={false}
                  />
                  <div className="bg-white">
                    <TreeMultiSelectForm
                      label="Associated Body Part/s"
                      name="bodyParts"
                      control={form.control}
                      rawParts={bodyParts}
                    />
                  </div>
                  <div className="bg-white">
                    <TreeMultiSelectForm
                      label="Associated Category/s"
                      name="categories"
                      control={form.control}
                      rawParts={categories}
                    />
                  </div>
                </div>

                {/* Classification (Gap Analysis Part I, I-D1 / m-add-condition) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CustomInput
                    type="text"
                    name="icd11_code"
                    control={form.control}
                    label="ICD-11 Code"
                    readOnly={false}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      Severity
                    </label>
                    <select
                      {...form.register("severity")}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="">Not set</option>
                      <option value="low">Low</option>
                      <option value="moderate">Moderate</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">
                      NHIS Coverage
                    </label>
                    <select
                      {...form.register("nhis_coverage")}
                      className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
                    >
                      <option value="">Not set</option>
                      <option value="covered">Covered</option>
                      <option value="partial">Partial</option>
                      <option value="not_covered">Not covered</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* ── About ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">About</h3>
                <RichTextEditor
                  label="About Condition"
                  control={form.control}
                  name="about"
                />
              </section>

              {/* ── Types ── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <h3 className="text-base font-semibold">Condition Types</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-green-50"
                    onClick={() =>
                      append({ type_name: "", about_type: EMPTY_LEXICAL_STATE })
                    }
                  >
                    + Add Type
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative space-y-3 rounded-lg border p-4"
                  >
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-3 -right-3 h-6 w-6 rounded-full p-0"
                        onClick={() => remove(index)}
                      >
                        ×
                      </Button>
                    )}
                    <CustomInput
                      type="text"
                      name={`types.${index}.type_name`}
                      control={form.control}
                      label="Type Name"
                      readOnly={false}
                    />
                    <RichTextEditor
                      name={`types.${index}.about_type`}
                      control={form.control}
                      label="About Type"
                    />
                  </div>
                ))}
              </section>

              {/* ── Symptoms ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">
                  Symptoms
                </h3>
                <RichTextEditor
                  label="Symptoms"
                  control={form.control}
                  name="symptoms"
                />
              </section>

              {/* ── Complications & Diagnosis ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">
                  Complications & Diagnosis
                </h3>
                <RichTextEditor
                  label="Complications"
                  control={form.control}
                  name="complications"
                />
                <RichTextEditor
                  label="Diagnosis"
                  control={form.control}
                  name="diagnosis"
                />
              </section>

              {/* ── Causes ── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <h3 className="text-base font-semibold">Causes</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-green-50"
                    onClick={() =>
                      causesAppend({
                        cause_name: "",
                        other_possible_causes: EMPTY_LEXICAL_STATE,
                      })
                    }
                  >
                    + Add Cause
                  </Button>
                </div>
                {causesFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative space-y-3 rounded-lg border p-4"
                  >
                    {causesFields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-3 -right-3 h-6 w-6 rounded-full p-0"
                        onClick={() => causesRemove(index)}
                      >
                        ×
                      </Button>
                    )}
                    <CustomInput
                      type="text"
                      name={`causes.${index}.cause_name`}
                      control={form.control}
                      label="Cause Name"
                      readOnly={false}
                    />
                    <RichTextEditor
                      name={`causes.${index}.other_possible_causes`}
                      control={form.control}
                      label="Other Possible Causes"
                    />
                  </div>
                ))}
              </section>

              {/* ── Treatment & Prevention ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">
                  Treatment & Prevention
                </h3>
                <RichTextEditor
                  label="Treatment"
                  control={form.control}
                  name="treatment"
                />
                <RichTextEditor
                  label="Prevention"
                  control={form.control}
                  name="prevention"
                />
              </section>

              {/* ── Additional Information ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">
                  Additional Information
                </h3>
                <RichTextEditor
                  label="More Information"
                  control={form.control}
                  name="more_information"
                />
                <RichTextEditor
                  label="Contact Your Doctor"
                  control={form.control}
                  name="contact_your_doctor"
                />
                <RichTextEditor
                  label="Attribution"
                  control={form.control}
                  name="attribution"
                />
              </section>

              {/* ── Media & Links ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">
                  Media & Links
                </h3>
                <CustomInput
                  control={form.control}
                  name="nhs_link"
                  label="NHS Link"
                  type="text"
                  readOnly={false}
                />
                <ImageDropZone
                  filePath={filePath}
                  text="Drop condition image here"
                  onFilesChange={(url) =>
                    url.map((u) => form.setValue("image_url", u))
                  }
                  initialFiles={[form.watch("image_url")!]}
                />
              </section>

              {/* ── Actions ── */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={close}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isEditMode ? (
                    "Update Condition"
                  ) : (
                    "Register Condition"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddConditionDialog;
