"use client";

/**
 * Discount create/edit dialog — mirrors mockup `m-create-discount` (Code,
 * Discount Type, Value, Eligible Plans, Eligible Users, Usage/Per-User
 * limits, Start/Expiry, Linked Campaign). Marketing unification build:
 * writes marketing_discounts via /api/marketing/discounts.
 */

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import CustomInput from "@/components/CustomInput";
import CustomSelect from "@/components/CustomSelect";
import {
  marketingDiscountSchema,
  TDiscountRow,
  TMarketingDiscountInput,
} from "@/features/marketing/schema/discount";
import {
  useCreateMarketingDiscount,
  useUpdateMarketingDiscount,
} from "@/features/marketing/data/useDiscounts";
import { useMarketingSubscriptions } from "@/features/marketing/data/useSubscriptions";
import { useMarketingProfiles } from "@/features/marketing/data/useMarketing";

const TYPE_OPTIONS = [
  { value: "percentage", label: "% Off" },
  { value: "fixed", label: "Fixed Amount (₵)" },
  { value: "free_trial", label: "Free Trial (days)" },
  { value: "partner", label: "Partner Discount" },
];

const ELIGIBLE_USER_OPTIONS = [
  { value: "all", label: "All users" },
  { value: "new", label: "New users only" },
  { value: "nhis_linked", label: "NHIS-Linked users" },
  { value: "free_plan", label: "Free-Plan users" },
];

const toDateInput = (value: string | null | undefined) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

interface DiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discount: TDiscountRow | null;
}

export default function DiscountDialog({
  open,
  onOpenChange,
  discount,
}: DiscountDialogProps) {
  const createMutation = useCreateMarketingDiscount();
  const updateMutation = useUpdateMarketingDiscount();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const plans = useMarketingSubscriptions();
  const campaigns = useMarketingProfiles({ page: 1, limit: 100 });

  const form = useForm<TMarketingDiscountInput>({
    resolver: zodResolver(marketingDiscountSchema),
    defaultValues: {
      name: "",
      description: "",
      discountValue: 0,
      discountType: "percentage",
      code: "",
      maxUses: null,
      validFrom: toDateInput(new Date().toISOString()),
      validUntil: null,
      isActive: true,
      appliesTo: "all",
      applicableItems: [],
      eligiblePlans: [],
      eligibleUsers: "all",
      perUserLimit: null,
      campaignId: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: discount?.name ?? "",
        description: discount?.description ?? "",
        discountValue: Number(discount?.discount_value ?? 0),
        discountType: discount?.discount_type ?? "percentage",
        code: discount?.code ?? "",
        maxUses: discount?.max_uses ?? null,
        validFrom: toDateInput(discount?.valid_from ?? new Date().toISOString()),
        validUntil: toDateInput(discount?.valid_until ?? null) || null,
        isActive: discount?.is_active ?? true,
        appliesTo: discount?.applies_to ?? "all",
        applicableItems: [],
        eligiblePlans: discount?.eligible_plans ?? [],
        eligibleUsers: discount?.eligible_users ?? "all",
        perUserLimit: discount?.per_user_limit ?? null,
        campaignId: discount?.campaign_id ?? "",
      });
    }
  }, [open, discount, form]);

  const handleSubmit = async (data: TMarketingDiscountInput) => {
    try {
      if (discount?.id) {
        await updateMutation.mutateAsync({ id: discount.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the discount code");
    }
  };

  const eligiblePlans = form.watch("eligiblePlans") ?? [];
  const togglePlan = (planId: string) => {
    form.setValue(
      "eligiblePlans",
      eligiblePlans.includes(planId)
        ? eligiblePlans.filter((id) => id !== planId)
        : [...eligiblePlans, planId],
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {discount ? `Edit ${discount.code}` : "Create discount code"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                type="text"
                name="name"
                control={form.control}
                label="Name"
                placeholder="e.g. Launch promo"
                readOnly={false}
              />
              <CustomInput
                type="text"
                name="code"
                control={form.control}
                label="Code"
                placeholder="WELCOME20"
                readOnly={Boolean(discount)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                name="discountType"
                label="Discount Type"
                options={TYPE_OPTIONS}
                control={form.control}
              />
              <CustomInput
                type="number"
                name="discountValue"
                control={form.control}
                label="Value"
                placeholder="20"
                readOnly={false}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                name="eligibleUsers"
                label="Eligible Users"
                options={ELIGIBLE_USER_OPTIONS}
                control={form.control}
              />
              <CustomSelect
                name="campaignId"
                label="Linked Campaign"
                options={[
                  { value: "", label: "No linked campaign" },
                  ...(campaigns.data?.data ?? []).map((campaign) => ({
                    value: campaign.id,
                    label: campaign.headline,
                  })),
                ]}
                control={form.control}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                Eligible Plans (none selected = all plans)
              </Label>
              <div className="flex flex-wrap gap-2">
                {(plans.data?.data ?? []).map((plan) => {
                  const selected = eligiblePlans.includes(plan.id);
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => togglePlan(plan.id)}
                      className={`px-3 py-1.5 rounded-full text-2xs font-black uppercase tracking-widest border transition-all ${
                        selected
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      {plan.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <CustomInput
                type="number"
                name="maxUses"
                control={form.control}
                label="Usage Limit"
                placeholder="∞"
                readOnly={false}
              />
              <CustomInput
                type="number"
                name="perUserLimit"
                control={form.control}
                label="Per-User Limit"
                placeholder="1"
                readOnly={false}
              />
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Start Date
                </Label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                  value={form.watch("validFrom") ?? ""}
                  onChange={(e) => form.setValue("validFrom", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Expiry Date
                </Label>
                <input
                  type="date"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800"
                  value={form.watch("validUntil") ?? ""}
                  onChange={(e) => form.setValue("validUntil", e.target.value || null)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isPending ? "Saving..." : discount ? "Save Changes" : "Create Code"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
