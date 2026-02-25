"use client";

import React, { useEffect, useState } from "react";
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
import { cn, getDeepestNodes, rehydrateHierarchy } from "@/lib/utils";
import ImageDropZone from "@/components/ImageDropZone";
import { nanoid } from "nanoid";
import { useAddConditionDialog } from "@/stores/dialog-store";
import {
  conditionsSchema,
  TConditionsInput,
} from "@/schemas/conditions.schema";
import { TreeMultiSelectForm } from "@/components/TreeMultiSelect";
import { RichTextEditor } from "@/components/RichTextInput";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";
import {
  useBodyPartsForSymptoms,
  useCategoriesForSymptoms,
} from "@/hooks/supabase-calls/useSymptoms";
import {
  useCreateCondition,
  useUpdateCondition,
} from "@/hooks/supabase-calls/useCondition";

const STEP_1_FIELDS: (keyof TConditionsInput)[] = [
  "name",
  "bodyParts",
  "categories",
  "about",
];

const AddConditionDialog = () => {
  const { isOpen, data: condition, isEditMode, close } = useAddConditionDialog();
  const [step, setStep] = useState<number>(1);

  const { data: bodyParts = [], isLoading: loadingParts } = useBodyPartsForSymptoms();
  const { data: categories = [], isLoading: loadingCats } = useCategoriesForSymptoms();

  const { mutateAsync, isPending } = useCreateCondition();
  const { mutateAsync: mutateAsyncEdit, isPending: submittingEdit } = useUpdateCondition();

  const isLoadingForm = loadingParts && loadingCats;
  const isSubmitting = isPending || submittingEdit;

  const form = useForm({
    resolver: zodResolver(conditionsSchema),
    defaultValues: {
      name: "",
      bodyParts: [],
      categories: [],
      about: {},
      diagnosis: {},
      treatment: {},
      complications: {},
      symptoms: {},
      prevention: {},
      specialist_to_contact: "",
      nhs_link: "",
      image_url: "",
      types: [{ type_name: "", about_type: {} }],
      causes: [{ cause_name: "", other_possible_causes: {} }],
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
        form.reset({
          ...condition,
          bodyParts: rehydrateHierarchy(condition.bodyParts, bodyParts),
          categories: rehydrateHierarchy(condition.categories, categories),
          types: condition.types,
          causes: condition.causes,
          nhs_link: condition.nhs_link ?? "",
          image_url: condition.image_url ?? "",
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
          symptoms: EMPTY_LEXICAL_STATE,
          prevention: EMPTY_LEXICAL_STATE,
          contact_your_doctor: EMPTY_LEXICAL_STATE,
          more_information: EMPTY_LEXICAL_STATE,
          specialist_to_contact: "",
          nhs_link: "",
          image_url: "",
          types: [{ type_name: "", about_type: EMPTY_LEXICAL_STATE }],
          causes: [{ cause_name: "", other_possible_causes: EMPTY_LEXICAL_STATE }],
        });
      }
    }
  }, [isOpen, isEditMode, condition, form]);

  const name = form.watch("name") ?? "";
  const filename = `${name.replace(/\s+/g, "").toLowerCase()}-${nanoid(8)}`;
  const filePath = `conditions/${filename}`;

  const handleDialogClose = () => {
    setStep(1);
    close();
  };

  const handleSubmit = async (data: TConditionsInput) => {
    try {
      const optimizedBodyPartIds = getDeepestNodes(data.bodyParts, bodyParts);
      const optimizedCategoryIds = getDeepestNodes(data.categories, categories);
      const slug = slugify(data.name, { lower: true });
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
          specialist: data.specialist_to_contact ?? "",
          created_at: condition.created_at,
          updated_at: condition.updated_at,
          categories: data.categories,
          bodyParts: data.bodyParts,
        };
        await mutateAsyncEdit(editPayload);
      } else {
        await mutateAsync(payload);
      }
    } catch (error) {
      console.error("Registration Error:", error);
      toast.error("Registration failed: " + (error as Error).message);
    } finally {
      setStep(1);
      close();
    }
  };

  const handleContinue = async () => {
    const isValid = await form.trigger(STEP_1_FIELDS);
    if (!isValid) {
      toast.error("Please complete all required fields");
      return;
    }
    setStep((prev) => prev + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-4 md:px-6">
        {/* Step Progress Bar */}
        <div className="flex justify-center gap-2 mb-4 w-full pr-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={cn("h-2 w-1/5 rounded", index <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>

        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Condition" : "Register New Condition"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              (data) => handleSubmit(data),
              (errors) => {
                toast.error("Please fix form errors before submitting");
                console.log("Form Errors:", errors);
              },
            )}
            className="space-y-6"
          >
            {isLoadingForm && (
              <div className="flex items-center justify-center gap-2 text-slate-500 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading form...
              </div>
            )}

            {/* ── Step 1: Basic Info + Types ── */}
            {step === 1 && (
              <>
                <h3 className="font-semibold mb-2 underline text-center">Condition Details (1/5)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <CustomInput type="text" name="name" control={form.control} label="Condition Name" readOnly={false} />
                  <TreeMultiSelectForm label="Select Associated Body Part/s" name="bodyParts" control={form.control} rawParts={bodyParts} />
                  <TreeMultiSelectForm label="Select Associated Category/s" name="categories" control={form.control} rawParts={categories} />
                  <CustomInput type="text" name="specialist_to_contact" control={form.control} label="Specialists To Contact (Comma-Separated)" readOnly={false} />
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Condition Types</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-green-100"
                      onClick={() => append({ type_name: "", about_type: "" })}
                    >
                      Add Type
                    </Button>
                  </div>
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-4 relative mb-2">
                      <div className="grid grid-cols-1 gap-4 relative">
                        <CustomInput type="text" name={`types.${index}.type_name`} control={form.control} label="Type Name" readOnly={false} />
                        <RichTextEditor name={`types.${index}.about_type`} control={form.control} label="About Type" />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => remove(index)}
                        >×</Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button type="button" className="w-full bg-emerald-600" onClick={handleContinue}>Continue</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={close}>Cancel</Button>
                </div>
              </>
            )}

            {/* ── Step 2: Causes + About + Diagnosis ── */}
            {step === 2 && (
              <>
                <h3 className="font-semibold mb-4 underline text-center">Condition Details (2/5)</h3>
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Condition Causes</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-green-100"
                      onClick={() => causesAppend({ cause_name: "", other_possible_causes: "" })}
                    >
                      Add Cause
                    </Button>
                  </div>
                  {causesFields.map((field, index) => (
                    <div key={field.id} className="space-y-4 relative mb-2">
                      <div className="grid grid-cols-1 gap-4 relative">
                        <CustomInput type="text" name={`causes.${index}.cause_name`} control={form.control} label="Cause Name" readOnly={false} />
                        <RichTextEditor name={`causes.${index}.other_possible_causes`} control={form.control} label="Other Possible Causes" />
                      </div>
                      {causesFields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => causesRemove(index)}
                        >×</Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <RichTextEditor label="About Condition" control={form.control} name="about" />
                  <RichTextEditor label="Condition Diagnosis" control={form.control} name="diagnosis" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button type="button" className="w-full bg-emerald-600" onClick={() => setStep(3)}>Continue</Button>
                </div>
              </>
            )}

            {/* ── Step 3: Complications, Symptoms, Prevention, Treatment ── */}
            {step === 3 && (
              <>
                <h3 className="font-semibold mb-4 underline text-center">Condition Details (3/5)</h3>
                <div className="grid grid-cols-1 space-y-8">
                  <RichTextEditor label="Condition Complications" control={form.control} name="complications" />
                  <RichTextEditor label="Symptoms" control={form.control} name="symptoms" />
                  <RichTextEditor label="Prevention" control={form.control} name="prevention" />
                  <RichTextEditor label="Treatment" control={form.control} name="treatment" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button type="button" className="w-full bg-emerald-600" onClick={() => setStep(4)}>Continue</Button>
                </div>
              </>
            )}

            {/* ── Step 4: Contact Doctor, More Info, Attribution ── */}
            {step === 4 && (
              <>
                <h3 className="font-semibold mb-4 underline text-center">Condition Details (4/5)</h3>
                <div className="grid grid-cols-1 gap-4">
                  <RichTextEditor label="Contact Your Doctor" control={form.control} name="contactYourDoctor" />
                  <RichTextEditor label="More Information" control={form.control} name="moreInformation" />
                  <RichTextEditor label="Attribution" control={form.control} name="attribution" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(3)}>Back</Button>
                  <Button type="button" className="w-full bg-emerald-600" onClick={() => setStep(5)}>Continue</Button>
                </div>
              </>
            )}

            {/* ── Step 5: Media + NHS Link ── */}
            {step === 5 && (
              <>
                <h3 className="font-semibold mb-4 underline text-center">Condition Details (5/5)</h3>
                <CustomInput control={form.control} name="nhs_link" label="NHS Link for this Condition" type="text" readOnly={false} />
                <ImageDropZone
                  filePath={filePath}
                  text="Drop media for the Condition"
                  onFilesChange={(url) => url.map((u) => form.setValue("image_url", u))}
                  initialFiles={[form.watch("image_url")]}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setStep(4)} disabled={isSubmitting}>Back</Button>
                  <Button type="submit" className="md:col-span-2 bg-emerald-600" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isEditMode ? (
                      "Update Condition"
                    ) : (
                      "Register Condition"
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddConditionDialog;
