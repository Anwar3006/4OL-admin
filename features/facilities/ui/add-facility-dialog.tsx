import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Path, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TFacilityProfileInput,
  TFacilityProfileOutput,
  facilityProfileSchema,
} from "@/features/facilities/schema/types";
import {
  DEFAULT_BUSINESS_HOURS,
  FACILITY_REQUIREMENTS,
  FACILITY_TYPE_OPTIONS,
} from "@/types/formInput";
import ghanaLocations from "@/constants/ghana-locations.json";
import { Button } from "@/components/ui/button";
import { BusinessHoursSection } from "./business-hours";
import CustomInput from "@/components/CustomInput";
import CustomSelect from "@/components/CustomSelect";
import { useGeolocation } from "@/hooks/use-geolocation";
import useGhanaPostGPS from "@/hooks/useGhanaPostGPS";
import { toast } from "sonner";
import { ImageIcon, Loader2, MapPinHouse, Star, Trash2 } from "lucide-react";
import z from "zod";
import { MultiSelect } from "@/components/MultiSelect";
import { cn, getPublicImageUrl } from "@/lib/utils";
import ImageDropZone, { isMediaVideo } from "@/components/ImageDropZone";
import { nanoid } from "nanoid";
import { useAddFacilityDialog } from "@/features/facilities/data/dialog-hooks";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import FacilityCredentialsModal from "./facility-credentials-modal";
import {
  FACILITY_PROFILE_QUERY_KEYS,
  useUpdateFacilityProfile,
} from "@/features/facilities/data/useFacilities";
import { useRegisterProviderAccount } from "@/features/providers/data/useRegisterProviderAccount";
import { useUpdateOnboardingRequestStatus } from "@/features/onboarding-requests/data/useOnboardingRequests";
import type { CredentialDeliveryResult } from "@/features/providers/schema/types";
import { useQueryClient } from "@tanstack/react-query";

import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type FacilityFormValues = TFacilityProfileInput & { sameForWeekdays: boolean };

const STEP_1_FIELDS: Array<Path<FacilityFormValues>> = [
  "facility_type",
  "facility_name",
  "contact_number",
  "email",
  "gps_address",
  "area",
  "latitude",
  "longitude",
  "district",
  "region",
  "amenities",
  "services",
  "first_name",
  "last_name",
  "owner_email",
];

const AddFacilityDialog = () => {
  const { isOpen, data: rawData, metadata: openMetadata, isEditMode, close } = useAddFacilityDialog();
  const data = rawData as TFacilityProfileOutput;
  const { data: session } = useSupabaseSession();
  const registerProviderAccount = useRegisterProviderAccount();
  const updateOnboardingRequestStatus = useUpdateOnboardingRequestStatus();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [facilityModal, setFacilityModal] = useState<boolean>(false);
  const [credentials, setCredentials] = useState<{
    email: string;
    facilityName: string;
    phoneNumber: string;
    ownerNumber: string;
    providerId: string;
    deliveries: CredentialDeliveryResult[];
  } | null>(null);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [newlyUploadedFiles, setNewlyUploadedFiles] = useState<string[]>([]);
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);

  const [uploadSessionId] = useState(() => `pending_${nanoid(12)}`);
  const filePath = `facilities/temporary/${uploadSessionId}`;
  const [selectedRegion, setSelectedRegion] = useState<string>(
    data?.region || "greater accra",
  );

  const {
    getLocationCoordinates,
    coordinates,
    loading: coordinatesLoading,
  } = useGeolocation();
  const { fetchGhanaPostAddress, loading: addressLoading } = useGhanaPostGPS();
  const isLoadingLocation = coordinatesLoading || addressLoading;

  // Get region options from ghana-locations
  const regionOptions = useMemo(
    () =>
      Object.keys(ghanaLocations).map((region) => ({
        value: region.toLowerCase(),
        label: region,
      })),
    [],
  );

  // Get districts for selected region
  const districtOptions = useMemo(() => {
    const regionKey = Object.keys(ghanaLocations).find(
      (key) => key.toLowerCase() === selectedRegion,
    );
    if (!regionKey) return [];
    return (ghanaLocations[regionKey as keyof typeof ghanaLocations] || []).map(
      (district) => ({
        value: district.toLowerCase(),
        label: district,
      }),
    );
  }, [selectedRegion]);

  const form = useForm<FacilityFormValues>({
    resolver: zodResolver(
      facilityProfileSchema.extend({
        sameForWeekdays: z.boolean().default(false),
      }),
    ),
    defaultValues: {
      facility_type: "hospital_/_clinic",
      facility_name: "",
      contact_number: "",
      whatsapp_number: "",
      email: "",
      gps_address: "",
      street: "",
      post_code: "",
      area: "",
      district: "",
      region: "greater accra",
      country: "Ghana",
      first_name: "",
      last_name: "",
      owner_email: "",
      person_contact_number: "",
      position: "",
      media_urls: [],
      services: [],
      amenities: [],
      business_hours: DEFAULT_BUSINESS_HOURS,
      sameForWeekdays: false,
      keywords: "",
      ownership: "",
      accepts_nhis: false,
      wellness_subtype: "",
      latitude: 0,
      longitude: 0,
    },
  });

  // Edit mode: populate form from existing data
  useEffect(() => {
    if (isOpen && isEditMode && data) {
      form.reset({
        ...form.getValues(),
        ...(data as any),
        keywords: Array.isArray(data.keywords)
          ? data.keywords.join(", ")
          : data.keywords || "",
        sameForWeekdays: false,
      });
      setExistingImages(data.media_urls || []);
      setImagesToDelete([]);
      setNewlyUploadedFiles([]);
      setFeaturedImage(data.featured_image_url);
    }
  }, [isOpen, isEditMode, data, form.reset]);

  // Create mode: reset to defaults, merging in a prefill (Onboarding
  // Requests' Approve opens this dialog with the request's known fields —
  // see openMetadata.onboardingRequestId below) when one was passed.
  useEffect(() => {
    if (isOpen && !isEditMode) {
      form.reset({
        facility_type: "hospital_/_clinic",
        facility_name: "",
        contact_number: "",
        whatsapp_number: "",
        email: "",
        gps_address: "",
        street: "",
        post_code: "",
        area: "",
        district: "",
        region: "greater accra",
        country: "Ghana",
        first_name: "",
        last_name: "",
        owner_email: "",
        person_contact_number: "",
        position: "",
        media_urls: [],
        services: [],
        amenities: [],
        business_hours: DEFAULT_BUSINESS_HOURS,
        sameForWeekdays: false,
        keywords: "",
        latitude: 0,
        longitude: 0,
        ...(data as any),
      });
      setExistingImages([]);
      setImagesToDelete([]);
      setNewlyUploadedFiles([]);
    }
  }, [isOpen, isEditMode, data, form.reset]);

  // Auto-populate address from GPS coordinates
  useEffect(() => {
    if (coordinates?.latitude && coordinates?.longitude) {
      fetchGhanaPostAddress(coordinates.latitude, coordinates.longitude)
        .then((res) => {
          if (res?.found && res?.data?.Table?.length > 0) {
            const location = res.data.Table[0];
            form.setValue("gps_address", location.GPSName, {
              shouldValidate: true,
            });
            form.setValue(
              "street",
              location.Street === "[UNKNOWN]" ? location.Area : location.Street,
              { shouldValidate: true },
            );
            form.setValue("post_code", location.PostCode, {
              shouldValidate: true,
            });
            form.setValue("area", location.Area, { shouldValidate: true });
            form.setValue("district", location.District, {
              shouldValidate: true,
            });
            if (location.Region) {
              form.setValue(
                "region",
                location.Region.toLowerCase() as TFacilityProfileInput["region"],
                { shouldValidate: true },
              );
            }
            form.setValue("latitude", coordinates.latitude);
            form.setValue("longitude", coordinates.longitude);
            toast.success("Location auto-populated!");
          }
        })
        .catch((err) => {
          console.error("Ghana Post Error:", err);
          toast.error("Could not resolve GPS address");
        });
    }
  }, [coordinates, form.setValue]);

  useEffect(() => {
    if (isOpen && isEditMode && data) {
      setFeaturedImage(data.featured_image_url || data.media_urls?.[0] || null);
    }
  }, [isOpen, isEditMode, data]);

  // Watch for region changes and update selectedRegion
  const watchedRegion = form.watch("region");
  useEffect(() => {
    if (watchedRegion) {
      setSelectedRegion(watchedRegion.toLowerCase());
      // Reset district when region changes
      form.setValue("district", "", { shouldValidate: false });
    }
  }, [watchedRegion, form]);

  const selectedType = form.watch(
    "facility_type",
  ) as keyof typeof FACILITY_REQUIREMENTS;
  const mediaUrls = form.watch("media_urls");

  const availableAmenities = useMemo(
    () => FACILITY_REQUIREMENTS[selectedType]?.amenities || [],
    [selectedType],
  );
  const availableServices = useMemo(
    () => FACILITY_REQUIREMENTS[selectedType]?.services || [],
    [selectedType],
  );

  const handleContinue = async () => {
    const isValid = await form.trigger(STEP_1_FIELDS);
    if (!isValid) {
      toast.error("Please complete all required fields");
      return;
    }
    setStep(2);
  };

  const handleFilesChange = useCallback(
    (urls: string[]) => {
      if (isEditMode) {
        setNewlyUploadedFiles(urls);
      } else {
        form.setValue("media_urls", urls, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }
    },
    [form, isEditMode],
  );

  const gallery = useMemo(() => {
    const createModeImages = (mediaUrls || []).map((path) => ({
      path,
      url: getPublicImageUrl(path),
      isExisting: false,
    }));

    if (isEditMode) {
      return [
        ...newlyUploadedFiles.map((path) => ({
          path,
          url: getPublicImageUrl(path),
          isExisting: false,
        })),
        ...existingImages.map((path) => ({
          path,
          url: getPublicImageUrl(path),
          isExisting: true,
        })),
      ];
    }

    return createModeImages;
  }, [isEditMode, mediaUrls, newlyUploadedFiles, existingImages]);

  useEffect(() => {
    if (gallery.length > 0 && !featuredImage) {
      setFeaturedImage(gallery[0].path);
    }
  }, [gallery, featuredImage]);

  const handleDialogClose = () => {
    setStep(1);
    close();
  };

  const handleDeleteExistingImage = (imagePath: string) => {
    setExistingImages((prev) => prev.filter((p) => p !== imagePath));
    setImagesToDelete((prev) => [...prev, imagePath]);
    toast.info("Image marked for deletion. Save changes to confirm.");
  };

  const handleDeleteImage = (img: any, isFeatured: boolean) => {
    if (img.isExisting) {
      handleDeleteExistingImage(img.path);
    } else {
      const updated = newlyUploadedFiles.filter((p) => p !== img.path);
      setNewlyUploadedFiles(updated);
      if (!isEditMode) {
        const updatedMediaUrls = (mediaUrls || []).filter(
          (p) => p !== img.path,
        );
        form.setValue("media_urls", updatedMediaUrls);
      }
    }
    if (isFeatured) setFeaturedImage(null);
  };

  const facilityUpdateMutation = useUpdateFacilityProfile();

  // Render location detection section
  const renderLocationSection = () => {
    if (isLoadingLocation) {
      return (
        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl bg-muted/20">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            Accessing GPS & Resolving Address...
          </p>
        </div>
      );
    }
    if (form.watch("gps_address")) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-2 duration-700">
          <CustomInput
            type="text"
            name="gps_address"
            control={form.control}
            label="GPS Address"
            readOnly={false}
          />
          <CustomInput
            type="text"
            name="street"
            control={form.control}
            label="Street Name"
            readOnly={false}
          />
          <CustomInput
            type="text"
            name="post_code"
            control={form.control}
            label="Post Code"
            readOnly={false}
          />
          <CustomInput
            type="text"
            name="area"
            control={form.control}
            label="Area"
            readOnly={false}
          />
          <CustomSelect
            name="region"
            label="Region"
            options={regionOptions}
            control={form.control}
            className="bg-white! border-slate-200 dark:border-slate-700"
            placeholder="Select Region"
            disabled={regionOptions.length === 0}
          />
          <CustomSelect
            name="district"
            label="District"
            options={districtOptions}
            control={form.control}
            className="bg-white! border-slate-200 dark:border-slate-700"
            placeholder="Select District"
            disabled={!selectedRegion || districtOptions.length === 0}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs bg-zinc-600 text-white col-span-1 md:col-span-2"
            onClick={() => getLocationCoordinates()}
          >
            Incorrect? Re-detect Location
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-primary/5">
        <MapPinHouse className="h-8 w-8 text-primary/40 mb-3" />
        <Button
          type="button"
          variant="outline"
          onClick={() => getLocationCoordinates()}
        >
          Detect My Location
        </Button>
      </div>
    );
  };

  const handleSubmit = async (values: FacilityFormValues) => {
    setSubmitting(true);
    const { sameForWeekdays, ...profileData } = values;

    try {
      const finalImageUrls = isEditMode
        ? [...existingImages, ...newlyUploadedFiles]
        : profileData.media_urls;

      let finalFacilityType: any = profileData.facility_type;
      if (
        profileData.facility_type === "wellness_center" &&
        values.wellness_subtype
      ) {
        finalFacilityType = `wellness(${values.wellness_subtype})`;
      }

      const payload = {
        ...profileData,
        facility_type: finalFacilityType,
        featured_image_url: featuredImage || finalImageUrls[0],
        adminId: session?.user?.id ?? "",
      };

      // ── EDIT MODE ─────────────────────────────────────────────────────────
      if (isEditMode) {
        await facilityUpdateMutation.mutateAsync({
          id: data.id,
          ...payload,
          media_urls: [...existingImages, ...newlyUploadedFiles],
          imagesToDelete,
          newlyUploadedFiles,
        });
        toast.success("Facility Updated!");
        setStep(1);
        close();
        return;
      }

      // ── CREATE MODE ───────────────────────────────────────────────────────
      // registerProviderAccount() creates the owner's account (no password —
      // a one-time sign-in link is delivered instead), the facility row, and
      // the invite, all server-side (P0-06).
      const { adminId: _adminId, ...registrationPayload } = payload;
      const result = await registerProviderAccount.mutateAsync(registrationPayload);

      queryClient.invalidateQueries({ queryKey: FACILITY_PROFILE_QUERY_KEYS.all });

      toast.success("Facility Registered!");
      setStep(1);
      close();

      setCredentials({
        email: payload.owner_email,
        facilityName: payload.facility_name,
        phoneNumber: payload.contact_number,
        ownerNumber: payload.whatsapp_number || payload.person_contact_number,
        providerId: result.providerId,
        deliveries: result.deliveries,
      });
      setFacilityModal(true);

      // Onboarding Requests' Approve opened this dialog pre-filled — flip
      // that request to approved only now that the facility actually exists.
      if (openMetadata?.onboardingRequestId) {
        updateOnboardingRequestStatus.mutate({
          id: openMetadata.onboardingRequestId,
          status: "approved",
        });
      }
    } catch (error: any) {
      console.error("Error: ", error.message);
      toast.error(error.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      {credentials && (
        <FacilityCredentialsModal
          isOpen={facilityModal}
          onClose={() => {
            setFacilityModal(false);
            setCredentials(null);
          }}
          data={credentials}
        />
      )}
      <DialogContent className="max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-4 md:px-8 bg-white! border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="flex justify-center gap-2 mb-4 w-full pr-4">
          <div
            className={cn(
              "h-2 w-1/2 rounded",
              step >= 1 ? "bg-primary" : "bg-muted",
            )}
          />
          <div
            className={cn(
              "h-2 w-1/2 rounded",
              step >= 2 ? "bg-primary" : "bg-muted",
            )}
          />
        </div>
        <DialogHeader>
          <DialogTitle className="card-title">
            {isEditMode ? "Edit Facility" : "Register New Facility"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              (data) => handleSubmit(data),
              (errors) => {
                const errorFields = Object.keys(errors);
                if (errorFields.length > 0) {
                  const errorMessages = errorFields
                    .slice(0, 2)
                    .map((field) => field.replaceAll("_", " "))
                    .join(", ");
                  const message =
                    errorFields.length > 2
                      ? `Please check ${errorMessages} and ${errorFields.length - 2} other fields.`
                      : `Please correct the following: ${errorMessages}.`;
                  toast.error("Form Validation Failed", {
                    description: message,
                    classNames: {
                      toast:
                        "group-[.toaster]:border-destructive group-[.toaster]:bg-red-50/50",
                      title: "font-black text-destructive",
                      description: "text-slate-900 dark:text-slate-100 font-medium leading-relaxed",
                    },
                    duration: 5000,
                  });
                }
                console.log("Validation Errors:", errors);
              },
            )}
            className="space-y-6"
          >
            {step === 1 && (
              <>
                <h3 className="card-title mb-2 underline text-center">
                  Facility Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomSelect
                    name="facility_type"
                    options={FACILITY_TYPE_OPTIONS}
                    control={form.control}
                    label="Facility Type"
                    className="bg-white! border-slate-200 dark:border-slate-700"
                  />
                  {form.watch("facility_type") === "wellness_center" ? (
                    <CustomSelect
                      name="wellness_subtype"
                      options={[
                        { label: "Gym / Fitness Center", value: "gym" },
                        { label: "Spa", value: "spa" },
                        { label: "Yoga Studio", value: "yoga" },
                        { label: "Meditation Center", value: "meditation" },
                        { label: "Massage Therapy", value: "massage" },
                      ]}
                      control={form.control}
                      label="Wellness Sub-type"
                      className="bg-white! border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <CustomInput
                      type="text"
                      name="facility_name"
                      control={form.control}
                      label="Facility Name"
                      readOnly={false}
                    />
                  )}
                </div>

                {form.watch("facility_type") === "wellness_center" && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <CustomInput
                      type="text"
                      name="facility_name"
                      control={form.control}
                      label="Facility Name"
                      readOnly={false}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="accepts_nhis"
                        className="text-sm font-bold"
                      >
                        Accepts NHIS
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Is this facility under the National Health Insurance
                        Scheme?
                      </p>
                    </div>
                    <Switch
                      id="accepts_nhis"
                      checked={form.watch("accepts_nhis")}
                      onCheckedChange={(val) =>
                        form.setValue("accepts_nhis", val)
                      }
                    />
                  </div>
                  <CustomSelect
                    name="ownership"
                    label="Facility Ownership"
                    options={[
                      { label: "Private", value: "private" },
                      { label: "Government / Public", value: "government" },
                      { label: "Faith-Based", value: "faith" },
                    ]}
                    control={form.control}
                    className="bg-white! border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CustomInput
                    type="text"
                    name="contact_number"
                    control={form.control}
                    label="Facility Contact Number"
                    readOnly={false}
                  />
                  <CustomInput
                    type="text"
                    name="whatsapp_number"
                    control={form.control}
                    label="Whatsapp Number"
                    readOnly={false}
                  />
                  <CustomInput
                    type="email"
                    name="email"
                    control={form.control}
                    label="Facility Email Address"
                    readOnly={false}
                  />
                </div>

                <h3 className="card-title mb-2 underline text-center">
                  Location Details (Auto-Populated)
                </h3>

                {renderLocationSection()}

                <h3 className="card-title mb-2 underline text-center">
                  Services and Specialties
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="col-span-2 md:col-span-1">
                    <MultiSelect
                      name="amenities"
                      label="Facility Amenities"
                      placeholder={
                        selectedType
                          ? "Select Amenities..."
                          : "Please select a facility type first"
                      }
                      options={availableAmenities}
                      selected={form.watch("amenities")}
                      onChange={(value) => form.setValue("amenities", value)}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <MultiSelect
                      name="services"
                      label="Facility Services"
                      placeholder={
                        selectedType
                          ? "Select Services..."
                          : "Please select a facility type first"
                      }
                      options={availableServices}
                      selected={form.watch("services")}
                      onChange={(value) => form.setValue("services", value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <CustomInput
                      type="text"
                      name="keywords"
                      control={form.control}
                      label="Keywords (Comma Separated)"
                      placeholder="Keyword #1, Keyword #2, Keyword #3"
                      readOnly={false}
                    />
                  </div>
                </div>

                <h3 className="card-title mb-2 underline text-center">
                  Manager Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <CustomInput
                    type="text"
                    name="first_name"
                    control={form.control}
                    label="Facility Owner First Name"
                    readOnly={false}
                  />
                  <CustomInput
                    type="text"
                    name="last_name"
                    control={form.control}
                    label="Facility Owner Last Name"
                    readOnly={false}
                  />
                  <CustomInput
                    type="email"
                    name="owner_email"
                    control={form.control}
                    label="Facility Owner Email"
                    readOnly={false}
                  />
                  <CustomInput
                    type="text"
                    name="person_contact_number"
                    control={form.control}
                    label="Facility Owner Contact Number"
                    readOnly={false}
                  />
                  <CustomInput
                    type="text"
                    name="position"
                    control={form.control}
                    label="Facility Owner Position"
                    readOnly={false}
                  />
                </div>



                <div className="rounded-lg border p-2 md:p-4 bg-muted/30">
                  <h3 className="card-title mb-2">Operational Hours</h3>
                  <BusinessHoursSection />
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

            {step === 2 && (
              <>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="card-title text-slate-900 dark:text-slate-100">
                        Facility Gallery
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Select the star icon to set the featured thumbnail
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-white dark:bg-slate-800 border-emerald-200 text-emerald-700 dark:text-emerald-400"
                    >
                      {isEditMode ? "Manage Mode" : "Initial Upload"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const hasNoImages = gallery.length === 0;

                      if (hasNoImages) {
                        return (
                          <div className="col-span-full py-10 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-white/50 dark:bg-slate-800/50">
                            <ImageIcon className="h-8 w-8 text-slate-300 mb-2" />
                            <p className="text-sm text-slate-400">
                              No images yet
                            </p>
                          </div>
                        );
                      }

                      return gallery.map((img) => {
                        const isFeatured = featuredImage === img.path;
                        return (
                          <div
                            key={img.path}
                            className={cn(
                              "relative aspect-4/3 rounded-xl overflow-hidden border-2 transition-all group",
                              isFeatured
                                ? "border-emerald-500 shadow-md ring-2 ring-emerald-500/10"
                                : "border-white shadow-sm",
                            )}
                          >
                            {isMediaVideo(img.path) ? (
                              <video
                                src={img.url}
                                className="object-cover w-full h-full"
                                muted
                                autoPlay
                                loop
                              />
                            ) : (
                              <Image
                                src={img.url}
                                alt="Gallery item"
                                fill
                                sizes="(min-width: 768px) 33vw, 100vw"
                                unoptimized
                                className="object-cover w-full h-full"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setFeaturedImage(img.path)}
                                className={cn(
                                  "p-2 rounded-full transition-all hover:scale-110",
                                  isFeatured
                                    ? "bg-emerald-500 text-white"
                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300",
                                )}
                              >
                                <Star
                                  size={16}
                                  fill={isFeatured ? "currentColor" : "none"}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteImage(img, isFeatured);
                                }}
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all hover:scale-110"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            {isFeatured && (
                              <div className="absolute top-2 left-2 bg-emerald-500 text-white text-3xs font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">
                                Featured
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-semibold">
                    {isEditMode ? "Add More Photos" : "Upload Photos"}
                  </Label>
                  <ImageDropZone
                    text="Upload clear photos of your facility (front view, interior, signage, opposite)"
                    filePath={filePath}
                    initialFiles={isEditMode ? newlyUploadedFiles : mediaUrls}
                    onFilesChange={handleFilesChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="md:col-span-2 bg-emerald-600"
                  >
                    {submitting && (
                      <Loader2 size={16} className="animate-spin mr-2" />
                    )}
                    {isEditMode ? "Update Facility" : "Register Facility"}
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

export default AddFacilityDialog;
