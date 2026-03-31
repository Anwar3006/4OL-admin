import React, { useEffect, memo } from "react";
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
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { getDeepestNodes, rehydrateHierarchy } from "@/lib/utils";
import ImageDropZone from "@/components/ImageDropZone";
import { nanoid } from "nanoid";
import { useAddConditionDialog } from "@/stores/dialog-store";
import { symptomsSchema, TSymptomsInput } from "@/types/symptoms";
import { TreeMultiSelectForm } from "@/components/TreeMultiSelect";
import { RichTextEditor } from "@/components/RichTextInput";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";
import {
  useBodyPartsForSymptoms,
  useCategoriesForSymptoms,
  useCreateSymptom,
  useUpdateSymptom,
} from "@/hooks/supabase-calls/useSymptoms";

const AddSymptomDialog = () => {
  const { isOpen, data, isEditMode, close } = useAddConditionDialog();

  const { data: bodyParts = [], isLoading: loadingParts } =
    useBodyPartsForSymptoms();
  const { data: categories = [], isLoading: loadingCats } =
    useCategoriesForSymptoms();

  const { mutateAsync, isPending } = useCreateSymptom();
  const { mutateAsync: mutateAsyncEdit, isPending: submittingEdit } =
    useUpdateSymptom();

  const isLoadingForm = loadingParts && loadingCats;
  const isSubmitting = isPending || submittingEdit;

  const form = useForm<TSymptomsInput>({
    resolver: zodResolver(symptomsSchema),
    defaultValues: {
      name: "",
      bodyParts: [],
      categories: [],
      about: EMPTY_LEXICAL_STATE,
      diagnosis: EMPTY_LEXICAL_STATE,
      treatment: EMPTY_LEXICAL_STATE,
      complications: EMPTY_LEXICAL_STATE,
      prevention: EMPTY_LEXICAL_STATE,
      contact_your_doctor: EMPTY_LEXICAL_STATE,
      more_information: EMPTY_LEXICAL_STATE,
      attribution: EMPTY_LEXICAL_STATE,
      symptoms: EMPTY_LEXICAL_STATE,
      specialist_to_contact: "",
      nhs_link: "",
      image_url: "",
      slug: "",
      is_systemic: false,
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
      if (isEditMode && data) {
        form.reset({
          ...data,
          bodyParts: rehydrateHierarchy(data.bodyParts, bodyParts),
          categories: rehydrateHierarchy(data.categories, categories),
          image_url: data.image_url ?? "",
          nhs_link: data.nhs_link ?? "",
        });
      } else {
        form.reset({
          name: "",
          bodyParts: [],
          categories: [],
          about: EMPTY_LEXICAL_STATE,
          diagnosis: EMPTY_LEXICAL_STATE,
          treatment: EMPTY_LEXICAL_STATE,
          complications: EMPTY_LEXICAL_STATE,
          prevention: EMPTY_LEXICAL_STATE,
          contact_your_doctor: EMPTY_LEXICAL_STATE,
          more_information: EMPTY_LEXICAL_STATE,
          attribution: EMPTY_LEXICAL_STATE,
          symptoms: EMPTY_LEXICAL_STATE,
          specialist_to_contact: "",
          nhs_link: "",
          image_url: "",
          slug: "",
          is_systemic: false,
          types: [{ type_name: "", about_type: EMPTY_LEXICAL_STATE }],
          causes: [{ cause_name: "", other_possible_causes: EMPTY_LEXICAL_STATE }],
        });
      }
    }
  }, [isOpen, isEditMode, data, form, bodyParts, categories]);

  const name = form.watch("name") ?? "";
  const filename = `${name.replaceAll(/\s+/g, "")}-${nanoid(8)}`;
  const filePath = `symptoms/${filename}`;

  const handleSubmit = async (formdata: TSymptomsInput) => {
    try {
      const optimizedBodyPartIds = getDeepestNodes(formdata.bodyParts || [], bodyParts);
      const optimizedCategoryIds = getDeepestNodes(formdata.categories || [], categories);
      const slug = slugify(formdata.name || "", { lower: true });
      const payload = {
        ...formdata,
        bodyParts: optimizedBodyPartIds,
        categories: optimizedCategoryIds,
        slug,
      };

      if (isEditMode) {
        await mutateAsyncEdit({ id: data.id, payload });
        toast.success("Symptom updated successfully!");
      } else {
        await mutateAsync(payload);
        toast.success("Symptom registered successfully!");
      }
    } catch (error) {
      console.error("Registration Error: ", error);
      toast.error("Registration failed: " + (error as Error).message);
    } finally {
      form.reset();
      close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-4 md:px-8">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Symptom" : "Register New Symptom"}
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
              className="space-y-8"
            >
              {/* ── Basic Details ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">Basic Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomInput
                    type="text"
                    name="name"
                    control={form.control}
                    label="Symptom Name"
                    readOnly={false}
                  />
                  <CustomInput
                    type="text"
                    name="specialist_to_contact"
                    control={form.control}
                    label="Specialists To Contact (Comma-Separated)"
                    readOnly={false}
                  />
                  <TreeMultiSelectForm
                    label="Associated Body Part/s"
                    name="bodyParts"
                    control={form.control}
                    rawParts={bodyParts}
                  />
                  <TreeMultiSelectForm
                    label="Associated Category/s"
                    name="categories"
                    control={form.control}
                    rawParts={categories}
                  />
                </div>
              </section>

              {/* ── Types ── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b pb-1">
                  <h3 className="text-base font-semibold">Symptom Types</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-green-50"
                    onClick={() => append({ type_name: "", about_type: EMPTY_LEXICAL_STATE })}
                  >
                    + Add Type
                  </Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="relative space-y-3 rounded-lg border p-4">
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
                      causesAppend({ cause_name: "", other_possible_causes: EMPTY_LEXICAL_STATE })
                    }
                  >
                    + Add Cause
                  </Button>
                </div>
                {causesFields.map((field, index) => (
                  <div key={field.id} className="relative space-y-3 rounded-lg border p-4">
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

              {/* ── About ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">About</h3>
                <RichTextEditor
                  label="About Symptom"
                  control={form.control}
                  name="about"
                />
              </section>

              {/* ── Diagnosis & Complications ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">Diagnosis & Complications</h3>
                <RichTextEditor
                  label="Diagnosis"
                  control={form.control}
                  name="diagnosis"
                />
                <RichTextEditor
                  label="Complications"
                  control={form.control}
                  name="complications"
                />
              </section>

              {/* ── Treatment & Prevention ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">Treatment & Prevention</h3>
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
                <h3 className="text-base font-semibold border-b pb-1">Additional Information</h3>
                <RichTextEditor
                  label="Contact Your Doctor"
                  control={form.control}
                  name="contact_your_doctor"
                />
                <RichTextEditor
                  label="More Information"
                  control={form.control}
                  name="more_information"
                />
                <RichTextEditor
                  label="Attribution"
                  control={form.control}
                  name="attribution"
                />
              </section>

              {/* ── Media & Links ── */}
              <section className="space-y-4">
                <h3 className="text-base font-semibold border-b pb-1">Media & Links</h3>
                <CustomInput
                  control={form.control}
                  name="nhs_link"
                  label="NHS Link"
                  type="text"
                  readOnly={false}
                />
                <ImageDropZone
                  filePath={filePath}
                  text="Drop symptom image here"
                  onFilesChange={(url) => url.map((u) => form.setValue("image_url", u))}
                  initialFiles={[form.watch("image_url") as string]}
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
                    "Update Symptom"
                  ) : (
                    "Register Symptom"
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

export default memo(AddSymptomDialog);
