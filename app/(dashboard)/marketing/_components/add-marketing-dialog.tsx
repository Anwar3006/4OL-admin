"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  TMarketingProfileInput,
  marketingProfileSchema,
} from "@/schemas/marketing-profile.schema";
import { toast } from "sonner";
import CustomSelect from "@/components/CustomSelect";
import {
  CTA_CONFIG,
  MARKETING_CTA_OPTIONS,
  MARKETING_TYPE_OPTIONS,
} from "@/types/formInput";
import CustomInput from "@/components/CustomInput";
import { Textarea } from "@/components/ui/textarea";
import CustomDatePicker from "@/components/CustomDatePicker";
import ImageDropZone from "@/components/ImageDropZone";
import { Label } from "@/components/ui/label";
import { nanoid } from "nanoid";

import { Card } from "@/components/ui/card";
import { Phone, ExternalLink, Calendar, ImageIcon } from "lucide-react";

import { useAddMarketingDialog } from "@/stores/dialog-store";
import {
  useCreateMarketingProfile,
  useUpdateMarketingProfile,
} from "@/hooks/supabase-calls/useMarketing";

const STEP_1_FIELDS: (keyof TMarketingProfileInput)[] = [
  "marketingType",
  "headline",
  "cta",
  "description",
  "organization",
  "startDate",
  "endDate",
  "imageUrl",
];

const AddMarketingDialog = () => {
  const addMarketingDialog = useAddMarketingDialog();

  const form = useForm<TMarketingProfileInput>({
    resolver: zodResolver(marketingProfileSchema),
    defaultValues: {
      marketingType: "ads",
      headline: "",
      description: "",
      imageUrl: "",
      organization: "",
      cta: "",
      links: {
        primary: "",
        website: "",
        phone: "",
        email: "",
        whatsapp: "",
      },
      startDate: "",
      endDate: "",
    },
  });

  const [uploadSessionId] = useState(() => `campaign_${nanoid(12)}`);
  const [filePath] = useState(() => `marketing/${uploadSessionId}`);
  const selectedCta = form.watch("cta");
  const config = CTA_CONFIG[selectedCta as keyof typeof CTA_CONFIG];

  const [isImageLoading, setIsImageLoading] = useState(true);

  // Watch all form values for preview
  const formValues = form.watch();
  const uploadedImagePath = formValues.imageUrl;

  useEffect(() => {
    if (uploadedImagePath) {
      setIsImageLoading(true);
    }
  }, [uploadedImagePath]);

  const { mutateAsync, isPending } = useCreateMarketingProfile();
  const { mutateAsync: mutateAsyncEdit, isPending: isPendingEdit } =
    useUpdateMarketingProfile();

  const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME}/${uploadedImagePath}`;

  useEffect(() => {
    if (!addMarketingDialog.isOpen) {
      form.reset();
    }
  }, [addMarketingDialog.isOpen, form]);

  const handleSubmit = async (data: TMarketingProfileInput) => {
    try {
      if (addMarketingDialog.isEditMode && addMarketingDialog.data?.id) {
        await mutateAsyncEdit({
          id: addMarketingDialog.data.id,
          data,
        });
      } else {
        await mutateAsync(data);
      }
      addMarketingDialog.close();
    } catch (error) {
      console.error("Error: ", error);
    } finally {
      form.reset();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  //remove this
  const renderCTAButton = () => {
    if (!selectedCta || !config) return null;

    const ctaLabel = MARKETING_CTA_OPTIONS.find(
      (opt) => opt.value === selectedCta,
    )?.label;

    if (config.type === "single") {
      const linkValue = formValues.links?.primary || "";
      const isPhone = selectedCta.toLowerCase().includes("phone");

      return (
        <Button
          type="button"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          disabled={!linkValue}
        >
          {isPhone ? (
            <>
              <Phone className="w-4 h-4 mr-2" />
              {linkValue || ctaLabel}
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              {ctaLabel}
            </>
          )}
        </Button>
      );
    } else {
      return (
        <div className="grid grid-cols-2 gap-3">
          {config.fields.map((fieldLabel) => {
            const fieldKey = fieldLabel.toLowerCase();
            const linkValue =
              formValues.links?.[fieldKey as keyof typeof formValues.links] ||
              "";
            const isPhone = fieldLabel.toLowerCase().includes("phone");

            return (
              <Button
                key={fieldLabel}
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                disabled={!linkValue}
              >
                {isPhone ? (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    {fieldLabel}
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {fieldLabel}
                  </>
                )}
              </Button>
            );
          })}
        </div>
      );
    }
  };

  return (
    <Dialog
      open={addMarketingDialog.isOpen}
      onOpenChange={addMarketingDialog.close}
    >
      <DialogContent className="max-w-7xl! max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-6">
        <DialogHeader>
          <DialogTitle>
            {addMarketingDialog.isEditMode ? "Edit Campaign" : "Create new Campaign"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              (data) => handleSubmit(data),
              (errors) => {
                toast.error("Please fix the form errors");
                console.log("Errors: ", errors);
              },
            )}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Left Column: Form */}
            <div className="space-y-6">
              <h3 className="font-semibold text-lg border-b pb-2">Campaign Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect
                  name="marketingType"
                  label="Marketing Type"
                  options={MARKETING_TYPE_OPTIONS}
                  control={form.control}
                />
                <CustomInput
                  type="text"
                  name="organization"
                  control={form.control}
                  label="Organization"
                  placeholder="Enter organization"
                  readOnly={false}
                />
              </div>

              <CustomInput
                type="textarea"
                name="headline"
                control={form.control}
                label="Headline"
                placeholder="Enter headline"
                readOnly={false}
              />
              
              <CustomInput
                type="textarea"
                name="description"
                control={form.control}
                label="Campaign Content"
                placeholder="Enter content"
                readOnly={false}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomDatePicker
                  name="startDate"
                  control={form.control}
                  label="Start Date & Time"
                  enableFutureDates={true}
                  showTimePicker={true}
                />
                <CustomDatePicker
                  name="endDate"
                  control={form.control}
                  label="End Date & Time"
                  enableFutureDates={true}
                  showTimePicker={true}
                />
              </div>

              <div>
                <Label className="mb-1">Campaign Media</Label>
                <ImageDropZone
                  filePath={filePath}
                  text="Drop an image/video"
                  onFilesChange={(urls) => {
                    form.setValue("imageUrl", urls.filter(Boolean)[0]);
                  }}
                />
              </div>

              <div className="space-y-4">
                <CustomSelect
                  name="cta"
                  label="Call to Action"
                  control={form.control}
                  options={MARKETING_CTA_OPTIONS}
                />

                {config && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    {config.type === "single" ? (
                      <CustomInput
                        type="text"
                        name="links.primary"
                        control={form.control}
                        label={config.label}
                        placeholder={config.placeholder}
                        readOnly={false}
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {config.fields.map((fieldLabel) => (
                          <CustomInput
                            key={fieldLabel}
                            type="text"
                            name={`links.${fieldLabel.toLowerCase()}`}
                            control={form.control}
                            label={fieldLabel}
                            placeholder={`Enter ${fieldLabel}`}
                            readOnly={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isPending || isPendingEdit}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isPending || isPendingEdit 
                    ? (addMarketingDialog.isEditMode ? "Updating..." : "Creating...") 
                    : (addMarketingDialog.isEditMode ? "Update Campaign" : "Create Campaign")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMarketingDialog.close}
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* Right Column: Preview */}
            <div className="lg:sticky lg:top-0 space-y-6">
              <h3 className="font-semibold text-lg border-b pb-2">Live Preview</h3>
              <Card className="p-0 border-none shadow-xl overflow-hidden rounded-lg">
                <div className="bg-[#56ce84] text-white p-6 grid grid-cols-2 gap-6 min-h-[300px]">
                  {/* Left side: Content */}
                  <div className="flex flex-col justify-center space-y-4 text-left">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-serif font-medium leading-tight">
                        {formValues.headline || "Headline"}
                      </h2>
                      <p className="text-sm tracking-wide opacity-90 line-clamp-4">
                        {formValues.description || "Your campaign description will appear here..."}
                      </p>
                    </div>

                    {selectedCta ? (
                      <div>
                        <span className="inline-block bg-white text-black px-4 py-2 rounded text-sm font-medium shadow-sm">
                          {MARKETING_CTA_OPTIONS.find(opt => opt.value === selectedCta)?.label || "Call to Action"}
                        </span>
                      </div>
                    ) : (
                      <div className="h-10 w-32 bg-white/20 rounded animate-pulse" />
                    )}
                    
                    {formValues.organization && (
                      <div className="pt-2 border-t border-white/20">
                        <span className="text-[10px] uppercase tracking-widest font-bold opacity-80">
                          {formValues.organization} • {formValues.marketingType}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right side: Media */}
                  <div className="flex items-center justify-center">
                    <div className="w-full aspect-square rounded shadow-lg overflow-hidden bg-white/10 relative">
                      {uploadedImagePath ? (
                        <>
                          {isImageLoading && (
                            <div className="absolute inset-0 z-10 animate-pulse bg-white/5 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            </div>
                          )}
                          <img
                            src={imageUrl}
                            alt="Campaign preview"
                            className={cn(
                              "w-full h-full object-cover transition-opacity duration-500",
                              isImageLoading ? "opacity-0" : "opacity-100",
                            )}
                            onLoad={() => setIsImageLoading(false)}
                          />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-white/20">
                          <ImageIcon className="w-10 h-10 opacity-30 mb-2" />
                          <p className="text-[10px] opacity-40 font-medium uppercase tracking-tighter">No Media</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-sm text-emerald-800">
                <p className="font-semibold mb-1 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Real-time Preview
                </p>
                <p className="opacity-80">
                  This reflects how the campaign will appear to users in the mobile app.
                </p>
              </div>

              {(formValues.startDate || formValues.endDate) && (
                <div className="flex items-center gap-3 text-xs bg-gray-50 p-3 rounded-md border border-gray-100">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-gray-600 font-medium">
                    Schedule: {formValues.startDate ? formatDate(formValues.startDate) : "TBD"} 
                    <span className="mx-2 text-gray-300">|</span>
                    {formValues.endDate ? formatDate(formValues.endDate) : "TBD"}
                  </span>
                </div>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMarketingDialog;
