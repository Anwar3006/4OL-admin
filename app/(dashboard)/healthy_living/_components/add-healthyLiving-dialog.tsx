import React, { useEffect, useMemo, useState } from "react";
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
import z from "zod";

import { cn } from "@/lib/utils";
import ImageDropZone from "@/components/ImageDropZone";
import { nanoid } from "nanoid";
import { useAddHealthyLivingDialog } from "@/stores/dialog-store";

import { RichTextEditor } from "@/components/RichTextInput";
import { EMPTY_LEXICAL_STATE } from "@/constants/rich-text-editor";
import {
  healthyLivingSchema,
  THealthyLivingInput,
} from "@/schemas/healthyLiving.schema";
import {
  useCreateHealthyLiving,
  useUpdateHealthyLiving,
} from "@/hooks/supabase-calls/useHealthyLiving";

// Step 1 Fields - To make sure we validate these fields before moving on to Step 2
const STEP_1_FIELDS: (keyof THealthyLivingInput)[] = [
  "name",
  "about",
  "category",
  "types",
];

type THealthyLivingInputWithId = THealthyLivingInput & { id: string };

const AddHealthyLivingDialog = () => {
  //has the same input fields as conditions so reuse the conditions dialog
  const { isOpen, data, isEditMode, close } = useAddHealthyLivingDialog();
  // Progress Step Management
  const [step, setStep] = useState<number>(1);

  //Supabase hook Invocation
  const { mutateAsync, isPending } = useCreateHealthyLiving();
  const { mutateAsync: mutateAsyncEdit, isPending: submittingEdit } =
    useUpdateHealthyLiving();

  const form = useForm({
    resolver: zodResolver(healthyLivingSchema),
    defaultValues: {
      name: "",
      about: EMPTY_LEXICAL_STATE,
      category: EMPTY_LEXICAL_STATE,
      contact_your_doctor: EMPTY_LEXICAL_STATE,
      more_information: EMPTY_LEXICAL_STATE,
      image_url: "",
      types: [{ type_name: "", about_type: EMPTY_LEXICAL_STATE }],
      attribution: EMPTY_LEXICAL_STATE,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "types",
  });

  // PREVENT LAG: Use a clean reset when the dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        form.reset({
          ...data,
        });
      } else {
        form.reset({
          name: "",
          about: EMPTY_LEXICAL_STATE,
          category: EMPTY_LEXICAL_STATE,
          contact_your_doctor: EMPTY_LEXICAL_STATE,
          more_information: EMPTY_LEXICAL_STATE,
          image_url: "",
          types: [{ type_name: "", about_type: EMPTY_LEXICAL_STATE }],
        });
      }
    }
  }, [isOpen, isEditMode, data, form]);

  const name = form.watch("name") ?? "";
  const filename = `${name.replaceAll(/\s+/g, "").toLowerCase()}-${nanoid(8)}`;
  const filePath = `healthy_living/${filename}`;

  const isSubmitting = isPending || submittingEdit;

  const handleDialogClose = () => {
    setStep(1);
    close();
  };
  const handleSubmit = async (formData: any) => {
    try {
      const slug = slugify(formData.name, {
        lower: true,
      });
      const payload = {
        ...formData,
        slug,
      };

      if (isEditMode) {
        await mutateAsyncEdit({
          id: data.id,
          data: payload,
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
    const isValid = await form.trigger(STEP_1_FIELDS);
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
        <div className="flex justify-start gap-2 mb-4  pr-4">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                "h-2 flex-1 rounded",
                index <= step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Edit Healthy Living Info` : `Register New Info`}
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
            {step === 1 && (
              <>
                <h3 className="font-semibold mb-2 underline text-center">
                  Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomInput
                    type="text"
                    name="name"
                    control={form.control}
                    label="Name"
                    readOnly={false}
                  />
                </div>

                {/* Type and About Type */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Healthy Living Types
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="bg-green-100"
                      onClick={() =>
                        append({
                          type_name: "",
                          about_type: EMPTY_LEXICAL_STATE,
                        })
                      }
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

                <div className="grid grid-cols-1 gap-4">
                  <RichTextEditor
                    label="Category"
                    control={form.control}
                    name="category"
                  />

                  <RichTextEditor
                    label="About"
                    control={form.control}
                    name="about"
                  />
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

            {/* Contact your Doctor - More Information - Attribution */}
            {step === 2 && (
              <>
                {/* ---------------- STEP 2 ---------------- */}
                <h3 className="font-semibold mb-4 underline text-center">
                  Symptom Details (2/3)
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

            {/* Media */}
            {step === 3 && (
              <>
                {/* ---------------- STEP 3 ---------------- */}
                <h3 className="font-semibold mb-4 underline text-center">
                  Detail (3/3)
                </h3>

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
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>

                  <Button
                    type="submit"
                    className="md:col-span-2 bg-emerald-600"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isEditMode ? (
                      "Update"
                    ) : (
                      "Register"
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

export default AddHealthyLivingDialog;
