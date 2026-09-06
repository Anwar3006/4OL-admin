"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormDescription,
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
import { MessageSquare, Loader2 } from "lucide-react";
import { UserSearchSelect } from "@/components/UserSearchSelect";
import {
  fitnessOutdoorReviewSchema,
  TFitnessOutdoorReviewInput,
  MODERATION_STATUS,
} from "@/schemas/fitness-outdoor.schema";
import { useAddOutdoorReviewDialog } from "@/features/fitness/data/dialog-hooks";
import {
  useCreateFitnessOutdoorReview,
  useUpdateFitnessOutdoorReview,
  useFitnessOutdoorRoutes,
} from "@/features/fitness/data/useFitnessOutdoor";
import { cn } from "@/lib/utils";

const AddOutdoorReviewDialog = () => {
  const { isOpen, close, data, isEditMode } = useAddOutdoorReviewDialog();
  const { mutate: createReview, isPending: isCreating } = useCreateFitnessOutdoorReview();
  const { mutate: updateReview, isPending: isUpdating } = useUpdateFitnessOutdoorReview();

  // Fetch routes to link to the review
  const { data: routesData } = useFitnessOutdoorRoutes({ page: 1, limit: 100 });
  const routes = routesData?.routes || [];

  const isPending = isCreating || isUpdating;

  const defaultValues: TFitnessOutdoorReviewInput = {
    route_id: null,
    user_id: null,
    rating: 5,
    comment: "",
    is_flagged: false,
    moderation_status: "approved",
  };

  const form = useForm<TFitnessOutdoorReviewInput>({
    resolver: zodResolver(fitnessOutdoorReviewSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && data) {
        form.reset({
          route_id: data.route_id ?? null,
          user_id: data.user_id ?? null,
          rating: data.rating ?? 5,
          comment: data.comment ?? "",
          is_flagged: data.is_flagged === true,
          moderation_status: data.moderation_status ?? "approved",
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [isOpen, isEditMode, data]);

  const onSubmit = (values: TFitnessOutdoorReviewInput) => {
    if (isEditMode && data?.id) {
      updateReview({ id: data.id, data: values }, { onSuccess: close });
    } else {
      createReview(values, { onSuccess: close });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[92vh] p-0 border-none shadow-2xl bg-white">
        <div className="bg-white rounded-lg overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-gray-50">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-800">
              <MessageSquare className="h-6 w-6 text-emerald-600" />
              {isEditMode ? "Edit Review Details" : "Create Review Submission"}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6 bg-white">
              
              {/* Linked Route & Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="route_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Reviewed Route *</FormLabel>
                      <Select onValueChange={(val) => field.onChange(val === "none" ? null : val)} value={field.value ?? "none"}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl">
                            <SelectValue placeholder="Select Route" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100] shadow-md border">
                          <SelectItem value="none" className="italic cursor-pointer text-slate-400">None (No route)</SelectItem>
                          {routes.map((route) => (
                            <SelectItem key={route.id} value={route.id} className="cursor-pointer">
                              {route.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Rating (1 to 5 Stars) *</FormLabel>
                      <Select 
                        onValueChange={(val) => field.onChange(parseInt(val))} 
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl">
                            <SelectValue placeholder="Select rating stars" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100] shadow-md border">
                          {["5", "4", "3", "2", "1"].map((stars) => (
                            <SelectItem key={stars} value={stars} className="cursor-pointer">
                              {"⭐".repeat(parseInt(stars))} ({stars} Stars)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reviewing User Selector */}
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Review Author (User) *</FormLabel>
                    <FormControl>
                      <UserSearchSelect 
                        value={field.value ?? ""} 
                        onValueChange={(val) => field.onChange(val || null)} 
                        placeholder="Select reviewing user..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Moderation Status & Flag Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="moderation_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-semibold">Moderation Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl">
                            <SelectValue placeholder="Select moderation status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white z-[100] shadow-md border">
                          {MODERATION_STATUS.map((status) => (
                            <SelectItem key={status} value={status} className="capitalize cursor-pointer">
                              {status.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_flagged"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border border-slate-200 p-3 bg-white shadow-sm mt-1">
                      <div className="space-y-0.5">
                        <FormLabel className="text-slate-700 font-semibold">Flagged / Reported</FormLabel>
                        <FormDescription>Flagged as inappropriate</FormDescription>
                      </div>
                      <FormControl>
                        <Button
                          type="button"
                          variant={field.value ? "destructive" : "outline"}
                          size="sm"
                          className={cn(
                            "w-24 rounded-xl font-bold",
                            !field.value ? "border-slate-200" : ""
                          )}
                          onClick={() => field.onChange(!field.value)}
                        >
                          {field.value ? "Flagged" : "Clear"}
                        </Button>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Comment Content */}
              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 font-semibold">Comment / Review Text</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write details of the trail conditions, difficulty, obstacles, or scenery..." 
                        readOnly={false} 
                        className="bg-white border-slate-200 focus:border-emerald-500 rounded-xl resize-y min-h-[120px]"
                        {...field} 
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t gap-2 md:gap-0">
                <Button type="button" variant="outline" onClick={close} className="rounded-xl border-slate-200">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="min-w-[140px] rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditMode ? "Update Review" : "Post Review"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddOutdoorReviewDialog;
