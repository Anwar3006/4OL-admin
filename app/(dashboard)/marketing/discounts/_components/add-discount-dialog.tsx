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
  TMarketingDiscountInput,
  marketingDiscountSchema,
} from "@/schemas/marketing-discount.schema";
import CustomSelect from "@/components/CustomSelect";
import CustomInput from "@/components/CustomInput";
import CustomDatePicker from "@/components/CustomDatePicker";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

import { useAddDiscountDialog } from "@/stores/dialog-store";
import {
  useCreateMarketingDiscount,
  useUpdateMarketingDiscount,
} from "@/hooks/supabase-calls/useDiscounts";

const DISCOUNT_TYPE_OPTIONS = [
  { label: "Percentage (%)", value: "percentage" },
  { label: "Fixed Amount ($)", value: "fixed" },
  { label: "Buy One Get One", value: "bogo" },
];

const APPLIES_TO_OPTIONS = [
  { label: "All Items", value: "all" },
  { label: "Subscriptions Only", value: "subscriptions" },
  { label: "Specific Items", value: "specific" },
];

const AddDiscountDialog = () => {
  const { isOpen, close, data: editData, isEditMode } = useAddDiscountDialog();
  const createDiscount = useCreateMarketingDiscount();
  const updateDiscount = useUpdateMarketingDiscount();

  const form = useForm<TMarketingDiscountInput>({
    resolver: zodResolver(marketingDiscountSchema),
    defaultValues: {
      name: "",
      description: "",
      discountValue: 0,
      discountType: "percentage",
      code: "",
      maxUses: undefined,
      validFrom: new Date().toISOString().split("T")[0],
      validUntil: undefined,
      isActive: true,
      appliesTo: "all",
      applicableItems: [],
    },
  });

  useEffect(() => {
    if (isEditMode && editData) {
      form.reset({
        ...editData,
        code: editData.code?.toUpperCase(),
      });
    } else {
      form.reset();
    }
  }, [isEditMode, editData, form]);

  const onSubmit = async (values: TMarketingDiscountInput) => {
    try {
      if (isEditMode && editData?.id) {
        await updateDiscount.mutateAsync({
          id: editData.id,
          data: values,
        });
      } else {
        await createDiscount.mutateAsync(values);
      }
      form.reset();
      close();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const isLoading = createDiscount.isPending || updateDiscount.isPending;
  const discountType = form.watch("discountType");

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Discount" : "Create New Discount"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <CustomInput
              control={form.control}
              type="text"
              name="name"
              label="Discount Name"
              placeholder="e.g., Summer Sale"
              readOnly={false}
            />

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this discount"
                {...form.register("description")}
                className="min-h-16"
              />
            </div>

            {/* Code */}
            <CustomInput
              control={form.control}
              type="text"
              name="code"
              label="Discount Code"
              placeholder="e.g., SAVE20"
              readOnly={false}
            />

            {/* Discount Type and Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discountType">Discount Type</Label>
                <CustomSelect
                  control={form.control}
                  name="discountType"
                  label=""
                  options={DISCOUNT_TYPE_OPTIONS}
                />
              </div>
              <CustomInput
                control={form.control}
                name="discountValue"
                label={`Value (${discountType === "percentage" ? "%" : "$"})`}
                type="number"
                placeholder="0.00"
                readOnly={false}
              />
            </div>

            {/* Applies To */}
            <div className="space-y-2">
              <Label htmlFor="appliesTo">Applies To</Label>
              <CustomSelect
                control={form.control}
                name="appliesTo"
                label=""
                options={APPLIES_TO_OPTIONS}
              />
            </div>

            {/* Max Uses */}
            <CustomInput
              control={form.control}
              name="maxUses"
              label="Max Uses (Optional)"
              type="number"
              placeholder="Leave empty for unlimited"
            />

            {/* Valid From */}
            <div className="space-y-2">
              <Label htmlFor="validFrom">Valid From</Label>
              <CustomDatePicker
                control={form.control}
                name="validFrom"
                label=""
              />
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="validUntil">Valid Until (Optional)</Label>
              <CustomDatePicker
                control={form.control}
                name="validUntil"
                label=""
              />
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
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditMode ? "Update" : "Create"} Discount
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDiscountDialog;
