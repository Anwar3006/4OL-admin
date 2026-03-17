"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  TMarketingSubscriptionInput,
  marketingSubscriptionSchema,
} from "@/schemas/marketing-subscription.schema";
import { toast } from "sonner";
import CustomSelect from "@/components/CustomSelect";
import CustomInput from "@/components/CustomInput";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";

import { useAddSubscriptionDialog } from "@/stores/dialog-store";
import {
  useCreateMarketingSubscription,
  useUpdateMarketingSubscription,
} from "@/hooks/supabase-calls/useSubscriptions";

const BILLING_CYCLE_OPTIONS = [
  { label: "Monthly", value: "monthly" },
  { label: "Quarterly", value: "quarterly" },
  { label: "Yearly", value: "yearly" },
  { label: "One-time", value: "one-time" },
];

const AddSubscriptionDialog = () => {
  const {
    isOpen,
    close,
    data: editData,
    isEditMode,
  } = useAddSubscriptionDialog();
  const createSubscription = useCreateMarketingSubscription();
  const updateSubscription = useUpdateMarketingSubscription();

  const form = useForm<TMarketingSubscriptionInput>({
    resolver: zodResolver(marketingSubscriptionSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      billingCycle: "monthly",
      features: [],
      maxUsers: undefined,
      isActive: true,
    },
  });

  useEffect(() => {
    if (isEditMode && editData) {
      form.reset({
        ...editData,
        billingCycle: editData.billingCycle,
        maxUsers: editData.maxUsers,
        isActive: editData.isActive,
      });
    } else {
      form.reset();
    }
  }, [isEditMode, editData, form]);

  const onSubmit = async (values: TMarketingSubscriptionInput) => {
    try {
      if (isEditMode && editData?.id) {
        await updateSubscription.mutateAsync({
          id: editData.id,
          data: values,
        });
      } else {
        await createSubscription.mutateAsync(values);
      }
      form.reset();
      close();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const isLoading =
    createSubscription.isPending || updateSubscription.isPending;

  const handleAddFeature = (feature: string) => {
    if (feature.trim()) {
      const currentFeatures = form.getValues("features") || [];
      form.setValue("features", [...currentFeatures, feature]);
    }
  };

  const handleRemoveFeature = (index: number) => {
    const currentFeatures = form.getValues("features") || [];
    form.setValue(
      "features",
      currentFeatures.filter((_, i) => i !== index),
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Subscription" : "Create New Subscription"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <CustomInput
              type="text"
              name="name"
              control={form.control}
              label="Subscription Name"
              placeholder="e.g., Premium Plan"
              readOnly={false}
            />

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this subscription plan"
                {...form.register("description")}
                className="min-h-20"
              />
            </div>

            {/* Price */}
            <CustomInput
              control={form.control}
              name="price"
              label="Price"
              type="number"
              placeholder="0.00"
              readOnly={false}
            />

            {/* Billing Cycle */}
            <div className="space-y-2">
              <Label htmlFor="billingCycle">Billing Cycle</Label>
              <CustomSelect
                control={form.control}
                name="billingCycle"
                label=""
                options={BILLING_CYCLE_OPTIONS}
              />
            </div>

            {/* Max Users */}
            <CustomInput
              control={form.control}
              name="maxUsers"
              label="Max Users (Optional)"
              type="number"
              placeholder="Leave empty for unlimited"
            />

            {/* Features */}
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="space-y-2">
                {(form.getValues("features") || []).map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted p-2 rounded"
                  >
                    <span className="text-sm">{feature}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="featureInput"
                  placeholder="Add a feature"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const input = e.currentTarget;
                      handleAddFeature(input.value);
                      input.value = "";
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById(
                      "featureInput",
                    ) as HTMLInputElement;
                    handleAddFeature(input?.value || "");
                    if (input) input.value = "";
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.getValues("isActive")}
                onChange={(e) => form.setValue("isActive", e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditMode ? "Update" : "Create"} Subscription
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddSubscriptionDialog;
