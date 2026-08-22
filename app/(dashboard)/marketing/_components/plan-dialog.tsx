"use client";

/**
 * Plan create/edit dialog — mirrors mockup `m-edit-plan` + Create Plan.
 * Writes subscription_tiers via /api/marketing/plans (the same catalog the
 * mobile paywall/entitlement consume), so pricing/benefits changes here go
 * live on the consumer app immediately. Marketing unification build.
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import CustomInput from "@/components/CustomInput";
import CustomSelect from "@/components/CustomSelect";
import {
  marketingSubscriptionSchema,
  TMarketingSubscriptionInput,
  TMarketingSubscriptionOutput,
  SUBSCRIPTION_PERIODS,
} from "@/schemas/marketing-subscription.schema";
import {
  useCreateMarketingSubscription,
  useUpdateMarketingSubscription,
} from "@/hooks/supabase-calls/useSubscriptions";

const PERIOD_OPTIONS = SUBSCRIPTION_PERIODS.map((period) => ({
  value: period,
  label: period === "Lifetime" ? "Lifetime (one-time)" : period,
}));

interface PlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: TMarketingSubscriptionOutput | null;
}

export default function PlanDialog({ open, onOpenChange, plan }: PlanDialogProps) {
  const createMutation = useCreateMarketingSubscription();
  const updateMutation = useUpdateMarketingSubscription();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<TMarketingSubscriptionInput>({
    resolver: zodResolver(marketingSubscriptionSchema),
    defaultValues: {
      name: "",
      description: "",
      tierType: "consumer",
      price: 0,
      period: "1month",
      billingCycle: "monthly",
      privileges: [],
      tierLimit: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: plan?.name ?? "",
        description: plan?.description ?? "",
        tierType: plan?.tierType ?? "consumer",
        price: plan?.price ?? 0,
        period: plan?.period ?? "1month",
        billingCycle: plan?.billingCycle ?? "monthly",
        privileges: plan?.privileges ?? [],
        tierLimit: 0,
        isActive: plan?.isActive ?? true,
      });
    }
  }, [open, plan, form]);

  const handleSubmit = async (data: TMarketingSubscriptionInput) => {
    try {
      if (plan?.id) {
        await updateMutation.mutateAsync({ id: plan.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the plan");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? `Edit ${plan.name} plan` : "Create plan"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                type="text"
                name="name"
                control={form.control}
                label="Plan Name"
                placeholder="e.g. Pro"
                readOnly={false}
              />
              <CustomInput
                type="number"
                name="price"
                control={form.control}
                label="Price (GH₵)"
                placeholder="45"
                readOnly={false}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                name="period"
                label="Billing Period"
                options={PERIOD_OPTIONS}
                control={form.control}
              />
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  Visibility
                </Label>
                <select
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white"
                  value={form.watch("isActive") ? "active" : "inactive"}
                  onChange={(e) =>
                    form.setValue("isActive", e.target.value === "active")
                  }
                >
                  <option value="active">Active (visible on paywall)</option>
                  <option value="inactive">Inactive (hidden)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <CustomInput
                type="textarea"
                name="description"
                control={form.control}
                label="Description"
                placeholder="Short line shown under the plan name"
                readOnly={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                Features (one per line)
              </Label>
              <Textarea
                rows={5}
                placeholder={"Unlimited symptom checks\nAI personal trainer\nTelemedicine (5 consults/mo)"}
                value={(form.watch("privileges") ?? []).join("\n")}
                onChange={(e) =>
                  form.setValue(
                    "privileges",
                    e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter(Boolean),
                  )
                }
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isPending ? "Saving..." : plan ? "Save Changes" : "Create Plan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
