import React, { useEffect, useState, memo } from "react";
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
import { cn, getDeepestNodes, rehydrateHierarchy } from "@/lib/utils";
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

// Step 1 Fields - To make sure we validate these fields before moving on to Step 2
const STEP_1_FIELDS = [
  "name",
  "bodyParts",
  "categories",
  "about",
] as const;

const AddSymptomDialog = () => {
  //has the same input fields as conditions so reuse the conditions dialog
  const { isOpen, data, isEditMode, close } = useAddConditionDialog();
  // Progress Step Management
  const [step, setStep] = useState<number>(1);

  //Supabase Hooks Invocation
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

  console.log("Data: ", data);
  // PREVENT LAG: Use a clean reset when the dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        form.reset({
          ...data,
          // Rehydrate the visual selection for the tree components
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
            causes: [
              { cause_name: "", other_possible_causes: EMPTY_LEXICAL_STATE },
            ],
          });
      }
    }
  }, [isOpen, isEditMode, data, form, bodyParts, categories]);

  const name = form.watch("name") ?? "";
  const filename = `${name.replaceAll(/\s+/g, "")}-${nanoid(8)}`;
  const filePath = `symptoms/${filename}`;

  const handleDialogClose = () => {
    setStep(1);
    close();
  };
  const handleSubmit = async (formdata: TSymptomsInput) => {
    try {
      const optimizedBodyPartIds = getDeepestNodes(
        formdata.bodyParts,
        bodyParts,
      );
      const optimizedCategoryIds = getDeepestNodes(
        formdata.categories,
        categories,
      );
      const slug = slugify(formdata.name, {
        lower: true,
      });
      const payload = {
        ...formdata,
        bodyParts: optimizedBodyPartIds,
        categories: optimizedCategoryIds,
        slug,
      };

      console.log("Payload: ", payload);

      if (isEditMode) {
        await mutateAsyncEdit({
          id: data.id,
          payload: payload,
        });
      } else {
        await mutateAsync(payload);
      }
    } catch (error) {
      console.error("Registration Error: ", error);
    } finally {
      form.reset();
      setStep(1);
      close();
    }
  };

  const handleContinue = async () => {
    const isValid = await form.trigger(STEP_1_FIELDS as any);
    if (!isValid) {
      toast.error("Please complete all required fields");
      return;
    }
    setStep((prev) => prev + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-5xl! max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5! px-2 md:px-6">
        {/* Step Tracker */}
        <div className="flex justify-center gap-2 mb-4 w-full pr-4">
          {[1, 2, 3, 4, 5].map((index) => (
            <div
              key={index}
              className={cn(
                "h-2 w-1/5 rounded",
                index <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Edit Symptom` : `Register New Symptom`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              (data) => {
                handleSubmit(data);
              },
              (errors) => {
                toast.error("Errors: " + errors);
                console.log("Errors: ", errors);
              },
            )}
            className="space-y-6"
          >
            {isLoadingForm && (
              <div className="flex items-center w-full h-full justify-center">
                Loading Form...
              </div>
            )}
            {step === 1 && (
              <>
                <h3 className="card-title mb-2 underline text-center">
                  Symptom Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomInput
                    type="text"
                    name="name"
                    control={form.control}
                    label="Symptom Name"
                    readOnly={false}
                  />

                  <TreeMultiSelectForm
                    label="Select Associated Body Part/s"
                    name="bodyParts"
                    control={form.control}
                    rawParts={bodyParts}
                  />

                  <TreeMultiSelectForm
                    label="Select Associated Category/s"
                    name="categories"
                    control={form.control}
                    rawParts={categories}
                  />

                  <CustomInput
                    type="text"
                    name="specialist_to_contact"
                    control={form.control}
                    label="Specialists To Contact(Comma-Separated)"
                    readOnly={false}
                  />
                </div>

                {/* Type and About Type */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Symptom Types</h3>
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
                    <div key={field.id} className=" space-y-4 relative mb-2">
                      <div className="grid grid-cols-1 gap-4 relative">
                        {/* Type Name Input */}
                        <CustomInput
                          type="text"
                          name={`types.${index}.type_name`} // Important: include index
                          control={form.control}
                          label="Type Name"
                          readOnly={false}
                        />

                        {/* About Type Input (RichText logic usually goes here) */}
                        <RichTextEditor
                          name={`types.${index}.about_type`}
                          control={form.control}
                          label="About Type"
                        />
                      </div>

                      {/* Remove Button */}
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => remove(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    className="w-full bg-emerald-600"
                    onClick={handleContinue}
                  >
                    Continue
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={close}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {/* Types and About Types, About, Diagnosis */}
            {step === 2 && (
              <>
                {/* ---------------- STEP 2 ---------------- */}
                <h3 className="card-title mb-4 underline text-center">
                  Symptom Details (2/5)
                </h3>

                {/* Type and About Type */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Symptom Causes</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-green-100"
                      onClick={() =>
                        causesAppend({
                          cause_name: "",
                          other_possible_causes: "",
                        })
                      }
                    >
                      Add Cause
                    </Button>
                  </div>

                  {causesFields.map((field, index) => (
                    <div key={field.id} className=" space-y-4 relative mb-2">
                      <div className="grid grid-cols-1 gap-4 relative">
                        {/* Causes Input */}
                        <CustomInput
                          type="text"
                          name={`causes.${index}.cause_name`}
                          control={form.control}
                          label="Cause Name"
                          readOnly={false}
                        />

                        {/* About Type Input (RichText logic usually goes here) */}
                        <RichTextEditor
                          name={`causes.${index}.other_possible_causes`}
                          control={form.control}
                          label="Other Possible Causes"
                        />
                      </div>

                      {/* Remove Button */}
                      {causesFields.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => causesRemove(index)}
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* About */}
                <div className="grid grid-cols-1 gap-4">
                  <RichTextEditor
                    label="About Symptom"
                    control={form.control}
                    name="about"
                  />

                  {/* Diagnosis */}
                  <RichTextEditor
                    label="Symptom Diagnosis"
                    control={form.control}
                    name="diagnosis"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>

                  <Button
                    type="button"
                    className="w-full bg-emerald-600"
                    onClick={handleContinue}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {/* Complications - Prevention - Treatment */}
            {step === 3 && (
              <>
                {/* ---------------- STEP 3 ---------------- */}
                <h3 className="card-title mb-4 underline text-center">
                  Symptom Details (3/5)
                </h3>

                <div className="grid grid-cols-1 space-y-8">
                  {/* Complications */}
                  <RichTextEditor
                    label="Symptom Complications"
                    control={form.control}
                    name="complications"
                  />

                  {/* Prevention */}
                  <RichTextEditor
                    label="Prevention"
                    control={form.control}
                    name="prevention"
                  />

                  {/* Treatment */}
                  <RichTextEditor
                    label="Treatment"
                    control={form.control}
                    name="treatment"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>

                  <Button
                    type="button"
                    className="w-full bg-emerald-600"
                    onClick={handleContinue}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {/* Contact your Doctor - More Information - Attribution */}
            {step === 4 && (
              <>
                {/* ---------------- STEP 4 ---------------- */}
                <h3 className="card-title mb-4 underline text-center">
                  Symptom Details (4/5)
                </h3>

                <div className="grid grid-cols-1 gap-4">
                  {/* Contact Your Doctor */}
                  <RichTextEditor
                    label="Contact Your Doctor"
                    control={form.control}
                    name="contact_your_doctor"
                  />

                  {/* More Information */}
                  <RichTextEditor
                    label="More Information"
                    control={form.control}
                    name="more_information"
                  />

                  {/* Attribution */}
                  <RichTextEditor
                    label="Attribution"
                    control={form.control}
                    name="attribution"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                  >
                    Back
                  </Button>

                  <Button
                    type="button"
                    className="w-full bg-emerald-600"
                    onClick={handleContinue}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {/* Media - NHS Link */}
            {step === 5 && (
              <>
                {/* ---------------- STEP 5 ---------------- */}
                <h3 className="card-title mb-4 underline text-center">
                  Symptom Details (5/5)
                </h3>

                <CustomInput
                  control={form.control}
                  name="nhs_link"
                  label="NHS Link for this Symptom"
                  type="text"
                  readOnly={false}
                />

                <ImageDropZone
                  filePath={filePath}
                  text="Drop media for the Symptom"
                  onFilesChange={(url) =>
                    url.map((u) => form.setValue("image_url", u))
                  }
                  initialFiles={[]}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(4)}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>

                  <Button
                    type="submit"
                    className="md:col-span-2 bg-emerald-600"
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
              </>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default memo(AddSymptomDialog);
