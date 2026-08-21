// app/(dashboard)/fitness/_components/add-outdoor-route-dialog.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Loader2, UploadCloud, CheckCircle2, X } from "lucide-react";
import ImageDropZone from "@/components/ImageDropZone";
import { useAddOutdoorRouteDialog } from "@/stores/dialog-store";
import {
  useCreateFitnessOutdoorRoute,
  useUpdateFitnessOutdoorRoute,
} from "@/hooks/supabase-calls/useFitnessOutdoor";
import { GHANA_REGIONS_ENUM } from "@/types/formInput";
import { parseGpx, computeBoundsFromPoints, type GpxParseResult } from "@/lib/gpx";

// Expanded Schema handling Area, Region, and Metadata injection
const routeFormSchema = z.object({
  name: z.string().min(2, "Route name required"),
  category: z.string().min(1, "Category required"),
  difficulty: z.string().min(1, "Difficulty required"),
  distance_km: z.number().positive("Must be positive"),
  estimated_duration_mins: z.number().nullable(),
  area: z.string().min(1, "Area/Suburb required"),
  region: z.string().min(1, "Region required"),
  surface_type: z.string().optional(),
  description: z.string().optional(),
  verification_status: z.string(),
  registered_by: z.string().optional(), // Maps to JSON metadata
  fitcoins_reward: z.number().default(50), // Maps to JSON metadata
  features: z.array(z.string()).default([]), // Maps to JSON metadata
  image_url: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof routeFormSchema>;

const SAFETY_TAGS = [
  "Safe at night",
  "Well lit",
  "Ocean view",
  "Coastal",
  "Shade cover",
  "Water stations",
  "Parking available",
  "Restrooms",
  "Pet friendly",
];

const AddOutdoorRouteDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddOutdoorRouteDialog();
  const { mutate: createRoute, isPending: isCreating } =
    useCreateFitnessOutdoorRoute();
  const { mutate: updateRoute, isPending: isUpdating } =
    useUpdateFitnessOutdoorRoute();
  const isPending = isCreating || isUpdating;

  const [gpxResult, setGpxResult] = useState<GpxParseResult | null>(null);
  const [gpxFileName, setGpxFileName] = useState<string | null>(null);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: "",
      category: "Running",
      difficulty: "low",
      distance_km: 0,
      estimated_duration_mins: null,
      area: "",
      region: "Greater Accra",
      surface_type: "Paved",
      description: "",
      verification_status: "pending_review",
      registered_by: "",
      fitcoins_reward: 50,
      features: [],
      image_url: [],
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        form.reset({
          name: data.name ?? "",
          category: data.category ?? "Running",
          difficulty: data.difficulty ?? "low",
          distance_km: data.distance_km ?? 0,
          estimated_duration_mins: data.estimated_duration_mins ?? null,
          area: data.area ?? "",
          region: data.region ?? "Greater Accra",
          surface_type: data.surface_type ?? "Paved",
          description: data.description ?? "",
          verification_status: data.verification_status ?? "pending_review",
          registered_by: (data as any).registered_by ?? "",
          fitcoins_reward: (data as any).fitcoins_reward ?? 50,
          features: (data as any).features ?? [],
          image_url: Array.isArray(data.image_url) ? data.image_url : [],
        });

        // Existing GPS track, if any -- show a summary instead of re-parsing
        const existingGps = (data as any).gps_data as
          | {points?: [number, number][]; distanceKm?: number}
          | null
          | undefined;
        if (existingGps?.points?.length) {
          setGpxResult({
            points: existingGps.points,
            pointCount: existingGps.points.length,
            bounds: computeBoundsFromPoints(existingGps.points),
            distanceKm: existingGps.distanceKm ?? data.distance_km ?? 0,
          });
          setGpxFileName("Existing route track");
        } else {
          setGpxResult(null);
          setGpxFileName(null);
        }
        setGpxError(null);
      } else {
        form.reset();
        setGpxResult(null);
        setGpxFileName(null);
        setGpxError(null);
      }
    }
  }, [isOpen, isEditMode, data, form]);

  const handleGpxFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGpxError(null);
    try {
      const text = await file.text();
      const result = parseGpx(text);
      setGpxResult(result);
      setGpxFileName(file.name);
      // Auto-fill distance if the admin hasn't already typed one in
      if (!form.getValues("distance_km")) {
        form.setValue("distance_km", result.distanceKm, {
          shouldValidate: true,
        });
      }
    } catch (err: any) {
      setGpxResult(null);
      setGpxFileName(null);
      setGpxError(err?.message ?? "Couldn't parse this GPX file.");
    } finally {
      // Allow re-selecting the same file name after a failed/changed upload
      e.target.value = "";
    }
  };

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name,
      category: values.category.toLowerCase(),
      difficulty: values.difficulty,
      distance_km: values.distance_km,
      estimated_duration_mins: values.estimated_duration_mins,
      area: values.area,
      region: values.region,
      surface_type: values.surface_type,
      description: values.description,
      verification_status: values.verification_status,
      // Class mirrors the verification type: admin-published = official
      route_class: values.verification_status === "approved" ? "official" : "community",
      image_url: values.image_url,
      is_active: true,
      // Real columns as of the latest schema -- no longer nested inside gps_data
      features: values.features,
      fitcoins_reward: values.fitcoins_reward,
      registered_by: values.registered_by,
      // gps_data is reserved exclusively for the actual GPS track now
      gps_data: gpxResult
        ? {
            points: gpxResult.points,
            pointCount: gpxResult.pointCount,
            bounds: gpxResult.bounds,
            distanceKm: gpxResult.distanceKm,
            source: "gpx",
            uploadedAt: new Date().toISOString(),
          }
        : null,
    };

    if (isEditMode && data?.id) {
      updateRoute({ id: data.id, data: payload as any }, { onSuccess: close });
    } else {
      createRoute(payload as any, { onSuccess: close });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white">
        <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
            🗺️ {isEditMode ? "Edit Outdoor Route" : "Add Outdoor Route"}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            Register a new outdoor workout route for the fitness app
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="p-6 space-y-5 bg-white"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Labone Beach Run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4 w-full">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        {["Running", "Walking", "Cycling", "Hiking"].map(
                          (t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="low">Beginner</SelectItem>
                        <SelectItem value="medium">Intermediate</SelectItem>
                        <SelectItem value="high">Advanced</SelectItem>
                        <SelectItem value="extreme">Extreme</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distance_km"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance (km) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 3.2"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="estimated_duration_mins"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Est. Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 22"
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || null)
                        }
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area / Suburb *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Labone" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        {GHANA_REGIONS_ENUM.map((r) => (
                          <SelectItem key={r} value={r.toUpperCase()}>
                            {r.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="surface_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Surface Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white">
                      {["Paved", "Trail", "Mixed", "Sand"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the route experience, scenery, safety notes..."
                      className="resize-y"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="verification_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white">
                        <SelectItem value="approved">
                          Official Business Verified
                        </SelectItem>
                        <SelectItem value="pending_review">
                          Community Verified
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="registered_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registered By (Business)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. FitLife Gym" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Tags Grid */}
            <FormField
              control={form.control}
              name="features"
              render={() => (
                <FormItem className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="font-bold text-sm text-slate-800 mb-3">
                    📋 Safety & Features Tags
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {SAFETY_TAGS.map((tag) => (
                      <FormField
                        key={tag}
                        control={form.control}
                        name="features"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={tag}
                              className="flex flex-row items-start space-x-2 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(tag)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = Array.isArray(
                                      field.value,
                                    )
                                      ? field.value
                                      : [];
                                    return checked
                                      ? field.onChange([...currentValues, tag])
                                      : field.onChange(
                                          currentValues.filter(
                                            (val) => val !== tag,
                                          ),
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-medium cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {tag}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fitcoins_reward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FitCoins Reward per Completion</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* File Uploaders */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route Gallery Images</FormLabel>
                  <FormControl>
                    <ImageDropZone
                      filePath="fitness/outdoor/routes"
                      maxFiles={5}
                      onFilesChange={(urls) => field.onChange(urls)}
                      initialFiles={field.value || []}
                      text="Upload up to 5 route photos"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* GPX Upload */}
            <div>
              <FormLabel className="mb-2 block">Route GPS Track</FormLabel>
              <input
                ref={gpxInputRef}
                type="file"
                accept=".gpx,application/gpx+xml,application/xml,text/xml"
                className="hidden"
                onChange={handleGpxFileChange}
              />
              {gpxResult ? (
                <div className="border border-emerald-200 rounded-xl p-4 bg-emerald-50 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-emerald-800">
                        {gpxFileName}
                      </div>
                      <div className="text-xs text-emerald-700 mt-0.5">
                        {gpxResult.pointCount.toLocaleString()} points parsed •{" "}
                        {gpxResult.distanceKm.toFixed(2)} km
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-emerald-700 underline mt-1"
                        onClick={() => gpxInputRef.current?.click()}
                      >
                        Replace file
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600"
                    onClick={() => {
                      setGpxResult(null);
                      setGpxFileName(null);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50">
                  <div className="text-2xl mb-2">🗺️</div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    onClick={() => gpxInputRef.current?.click()}
                  >
                    <UploadCloud className="w-3 h-3 mr-2" /> Upload GPX Route File
                  </Button>
                  <div className="text-[10px] text-slate-400 mt-2">
                    Parsed entirely in your browser — no file leaves your machine
                    until you save the route.
                  </div>
                  {gpxError && (
                    <div className="text-xs font-semibold text-rose-600 mt-2">
                      {gpxError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={close}
                className="rounded-xl border-slate-200 min-w-[120px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-[180px] rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                📋 {isEditMode ? "Update Route" : "Add Route"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddOutdoorRouteDialog;
