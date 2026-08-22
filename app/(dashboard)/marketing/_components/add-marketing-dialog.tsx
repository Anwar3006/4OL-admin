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
import Image from "next/image";
import React, { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  TMarketingProfileInput,
  marketingProfileSchema,
  CAMPAIGN_CHANNEL_OPTIONS,
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
import ImageDropZone, { isMediaVideo } from "@/components/ImageDropZone";
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

const CAMPAIGN_TYPE_SELECT_OPTIONS = [
  { value: "app_promotion", label: "App Promotion" },
  { value: "feature_launch", label: "Feature Launch" },
  { value: "seasonal", label: "Seasonal" },
  { value: "referral", label: "Referral" },
];

const CHANNEL_LABELS: Record<string, string> = {
  push: "Push",
  sms: "SMS",
  email: "Email",
  in_app_banner: "In-App Banner",
  social: "Social",
};

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
      channels: [],
      target_segment: "",
      budget: null,
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

  const initialFiles = useMemo(() => 
    uploadedImagePath ? [uploadedImagePath] : [], 
  [uploadedImagePath]);

  const { mutateAsync, isPending } = useCreateMarketingProfile();
  const { mutateAsync: mutateAsyncEdit, isPending: isPendingEdit } =
    useUpdateMarketingProfile();

  const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME}/${uploadedImagePath}`;

  useEffect(() => {
    if (addMarketingDialog.isOpen) {
      if (addMarketingDialog.isEditMode && addMarketingDialog.data) {
        const campaign = addMarketingDialog.data;
        
        // Reconstruct links object from array if needed
        let linksObj = campaign.links;
        if (Array.isArray(campaign.links)) {
          // If it's an array, we try to map them back loosely as we don't have keys
          // But it's better to just use what we have in order
          linksObj = {
            primary: campaign.links[0] || "",
            website: campaign.links[1] || "",
            phone: campaign.links[2] || "",
            email: campaign.links[3] || "",
            whatsapp: campaign.links[4] || "",
          };
        }

        form.reset({
          marketingType: campaign.marketingType,
          headline: campaign.headline,
          description: campaign.description,
          imageUrl: campaign.imageUrl,
          organization: campaign.organization,
          cta: campaign.cta,
          links: linksObj || {
            primary: "",
            website: "",
            phone: "",
            email: "",
            whatsapp: "",
          },
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          campaign_type: campaign.campaign_type ?? undefined,
          channels: (campaign.channels ??
            []) as TMarketingProfileInput["channels"],
          target_segment: campaign.target_segment ?? "",
          budget: campaign.budget ?? null,
        });
      }
    } else {
      form.reset({
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
        channels: [],
        target_segment: "",
        budget: null,
      });
    }
  }, [addMarketingDialog.isOpen, addMarketingDialog.isEditMode, addMarketingDialog.data, form]);

  const handleSubmit = async (data: TMarketingProfileInput, status?: any) => {
    try {
      // If status is provided, override the default
      const payload = status ? { ...data, status } : data;

      if (addMarketingDialog.isEditMode && addMarketingDialog.data?.id) {
        await mutateAsyncEdit({
          id: addMarketingDialog.data.id,
          data: payload,
        });
      } else {
        await mutateAsync(payload as any); // Type cast to allow status
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomSelect
                  name="campaign_type"
                  label="Campaign Type"
                  options={CAMPAIGN_TYPE_SELECT_OPTIONS}
                  control={form.control}
                />
                <CustomInput
                  type="number"
                  name="budget"
                  control={form.control}
                  label="Budget (GH₵)"
                  placeholder="0 = no budget"
                  readOnly={false}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Delivery Channels
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_CHANNEL_OPTIONS.map((channelValue) => {
                    const selected = (formValues.channels ?? []).includes(
                      channelValue,
                    );
                    return (
                      <button
                        key={channelValue}
                        type="button"
                        onClick={() => {
                          const current = formValues.channels ?? [];
                          form.setValue(
                            "channels",
                            selected
                              ? current.filter((c) => c !== channelValue)
                              : [...current, channelValue],
                          );
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                          selected
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300",
                        )}
                      >
                        {CHANNEL_LABELS[channelValue] ?? channelValue}
                      </button>
                    );
                  })}
                </div>
              </div>

              <CustomInput
                type="text"
                name="target_segment"
                control={form.control}
                label="Target Segment"
                placeholder="e.g. Premium users, Accra region, NHIS-linked"
                readOnly={false}
              />

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
                  initialFiles={initialFiles}
                  onFilesChange={(urls) => {
                    form.setValue("imageUrl", urls.filter(Boolean)[0] || "");
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

              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <Button
                  type="button"
                  disabled={isPending || isPendingEdit}
                  onClick={form.handleSubmit((data) => handleSubmit(data, "draft"))}
                  variant="outline"
                  className="flex-1"
                >
                  {isPending || isPendingEdit ? "Saving..." : "Save as Draft"}
                </Button>
                <Button
                  type="button"
                  disabled={isPending || isPendingEdit}
                  onClick={form.handleSubmit((data) => handleSubmit(data, "scheduled"))}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {isPending || isPendingEdit 
                    ? (addMarketingDialog.isEditMode ? "Scheduling..." : "Scheduling...") 
                    : "Schedule Campaign"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={addMarketingDialog.close}
                  className="sm:w-auto"
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
                          {isMediaVideo(uploadedImagePath) ? (
                            <video
                              src={imageUrl}
                              controls={false}
                              autoPlay
                              loop
                              muted
                              className={cn(
                                "w-full h-full object-cover transition-opacity duration-500",
                                isImageLoading ? "opacity-0" : "opacity-100",
                              )}
                              onLoadedData={() => setIsImageLoading(false)}
                            />
                          ) : (
                            <Image
                              src={imageUrl}
                              alt="Campaign preview"
                              fill
                              sizes="(min-width: 768px) 520px, 90vw"
                              className={cn(
                                "w-full h-full object-cover transition-opacity duration-500",
                                isImageLoading ? "opacity-0" : "opacity-100",
                              )}
                              onLoad={() => setIsImageLoading(false)}
                            />
                          )}
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
