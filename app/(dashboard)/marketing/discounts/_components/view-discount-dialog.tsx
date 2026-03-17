"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Edit, Trash2 } from "lucide-react";
import React from "react";
import {
  useViewDiscountDialog,
  useAddDiscountDialog,
} from "@/stores/dialog-store";
import {
  useMarketingDiscount,
  useDeleteMarketingDiscount,
} from "@/hooks/supabase-calls/useDiscounts";

export const ViewDiscountDialog = () => {
  const { isOpen, entityId, close } = useViewDiscountDialog();
  const addDialog = useAddDiscountDialog();
  const { data: discount, isLoading } = useMarketingDiscount({
    id: entityId || "",
    enabled: isOpen && !!entityId,
  });
  const deleteDiscount = useDeleteMarketingDiscount();

  const handleEdit = () => {
    if (discount) {
      addDialog.open(discount);
    }
  };

  const handleDelete = async () => {
    if (!discount?.id) return;
    if (window.confirm("Are you sure you want to delete this discount?")) {
      await deleteDiscount.mutateAsync(discount.id);
      close();
    }
  };

  const formatDiscountDisplay = () => {
    if (!discount) return "";
    return discount.discountType === "percentage"
      ? `${discount.discountValue}%`
      : discount.discountType === "fixed"
        ? `$${discount.discountValue.toFixed(2)}`
        : "Buy One Get One";
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Discount Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : discount ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">
                Name
              </h3>
              <p className="text-lg">{discount.name}</p>
            </div>

            {discount.description && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm">{discount.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Code
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    {discount.code}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Value
                </h3>
                <p className="text-lg font-semibold text-primary">
                  {formatDiscountDisplay()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Type
                </h3>
                <p className="text-sm capitalize">{discount.discountType}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Usage
                </h3>
                <p className="text-sm">
                  {discount.currentUses || 0}
                  {discount.maxUses ? `/${discount.maxUses}` : " (Unlimited)"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Valid From
                </h3>
                <p className="text-sm">
                  {new Date(discount.validFrom).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Valid Until
                </h3>
                <p className="text-sm">
                  {discount.validUntil
                    ? new Date(discount.validUntil).toLocaleDateString()
                    : "No expiry"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">
                Applies To
              </h3>
              <p className="text-sm capitalize">{discount.appliesTo}</p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">
                Status
              </h3>
              <p className="text-sm">
                {discount.isActive ? (
                  <span className="text-green-600 font-semibold">Active</span>
                ) : (
                  <span className="text-gray-600">Inactive</span>
                )}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteDiscount.isPending}
                className="flex items-center gap-2"
              >
                {deleteDiscount.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ViewDiscountDialog;
