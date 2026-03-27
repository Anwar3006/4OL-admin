"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  TMarketingSubscriptionInput,
  marketingSubscriptionSchema,
  SUBSCRIPTION_BILLING_CYCLES,
  SUBSCRIPTION_PERIODS,
  SUBSCRIPTION_PRIVILEGES,
} from "@/schemas/marketing-subscription.schema";
import CustomSelect from "@/components/CustomSelect";
import CustomInput from "@/components/CustomInput";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

import { useAddSubscriptionDialog } from "@/stores/dialog-store";
import {
  useCreateMarketingSubscription,
  useUpdateMarketingSubscription,
} from "@/hooks/supabase-calls/useSubscriptions";

const BILLING_CYCLE_OPTIONS = SUBSCRIPTION_BILLING_CYCLES.map((value) => ({
  label: value,
  value,
}));

const PERIOD_OPTIONS = SUBSCRIPTION_PERIODS.map((value) => ({
  label: value,
  value,
}));

const PRIVILEGE_LABELS: Record<(typeof SUBSCRIPTION_PRIVILEGES)[number], string> = {
  business_analytics: "Business analytics",
  performance_analytics: "Performance analytics",
  popup_notification: "Popup notification",
  top_rated_placement: "Top rated placement",
  featured_placement: "Featured placement",
  ad_discount_10: "Ad discount 10%",
  ad_discount_25: "Ad discount 25%",
  ad_discount_30: "Ad discount 30%",
  ad_discount_40: "Ad discount 40%",
  ad_discount_50: "Ad discount 50%",
  ad_flyer_discount_10: "Ad flyer discount 10%",
  advanced_analytics: "Advanced analytics",
  priority_support: "Priority support",
};

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
      tierType: "",
      price: 0,
      period: "free",
      billingCycle: "one-time",
      privileges: [],
      tierLimit: 0,
      isActive: false,
    },
  });

  useEffect(() => {
    if (isEditMode && editData) {
      form.reset({
        ...editData,
        description: editData.description ?? "",
        privileges: editData.privileges ?? [],
        tierLimit: editData.tierLimit ?? 0,
        isActive: editData.isActive ?? true,
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
  const selectedPrivileges = form.watch("privileges") || [];

  const privileges = form.watch("privileges") || [];
const isActive = form.watch("isActive"); // Watch this for the toggle UI

// 2. Fix the toggle function (Remove shouldValidate)
const togglePrivilege = (
  privilege: (typeof SUBSCRIPTION_PRIVILEGES)[number],
  checked: boolean
) => {
  const current = form.getValues("privileges") || [];
  form.setValue(
    "privileges",
    checked
      ? [...current, privilege]
      : current.filter((item) => item !== privilege),
    { shouldDirty: true } // Don't use shouldValidate here!
  );
};

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-4 md:px-8">
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

            <CustomInput
              type="text"
              name="tierType"
              control={form.control}
              label="Tier Type"
              placeholder="e.g., Starter, Premium, Enterprise"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                control={form.control}
                name="price"
                label="Price(GHC)"
                type="number"
                placeholder="0.00"
                readOnly={false}
              />

              <CustomInput
                control={form.control}
                name="tierLimit"
                label="Tier Limit"
                type="number"
                placeholder="0"
                readOnly={false}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <CustomSelect
                  control={form.control}
                  name="period"
                  label=""
                  options={PERIOD_OPTIONS}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingCycle">Billing Cycle</Label>
                <CustomSelect
                  control={form.control}
                  name="billingCycle"
                  label=""
                  options={BILLING_CYCLE_OPTIONS}
                />
              </div>
            </div>

           {/* ────── Privileges Grid ────── */}
<div className="space-y-3">
  <Label className="text-base font-semibold">Plan Privileges</Label>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border bg-slate-50/50 p-4">
    {SUBSCRIPTION_PRIVILEGES.map((privilege) => {
      const isSelected = privileges.includes(privilege);
      return (
        <label
          key={privilege}
          className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
            isSelected 
              ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200" 
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => togglePrivilege(privilege, e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className={`text-sm font-medium ${isSelected ? "text-emerald-900" : "text-slate-700"}`}>
            {PRIVILEGE_LABELS[privilege]}
          </span>
        </label>
      );
    })}
  </div>
</div>

{/* ────── Improved Active Status ────── */}
<div className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/30">
  <div className="space-y-0.5">
    <Label htmlFor="isActive" className="text-base font-medium">Active Status</Label>
    <p className="text-sm text-slate-500">Enable or disable this subscription plan for users.</p>
  </div>
  <button
    type="button"
    role="switch"
    aria-checked={isActive}
    onClick={() => form.setValue("isActive", !isActive, { shouldDirty: true })}
    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
      isActive ? "bg-emerald-600" : "bg-slate-300"
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        isActive ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
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
