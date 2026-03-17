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
  useViewSubscriptionDialog,
  useAddSubscriptionDialog,
} from "@/stores/dialog-store";
import {
  useMarketingSubscription,
  useDeleteMarketingSubscription,
} from "@/hooks/supabase-calls/useSubscriptions";

export const ViewSubscriptionDialog = () => {
  const { isOpen, entityId, close } = useViewSubscriptionDialog();
  const addDialog = useAddSubscriptionDialog();
  const { data: subscription, isLoading } = useMarketingSubscription({
    id: entityId || "",
    enabled: isOpen && !!entityId,
  });
  const deleteSubscription = useDeleteMarketingSubscription();

  const handleEdit = () => {
    if (subscription) {
      addDialog.open(subscription);
    }
  };

  const handleDelete = async () => {
    if (!subscription?.id) return;
    if (window.confirm("Are you sure you want to delete this subscription?")) {
      await deleteSubscription.mutateAsync(subscription.id);
      close();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Subscription Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : subscription ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">
                Name
              </h3>
              <p className="text-lg">{subscription.name}</p>
            </div>

            {subscription.description && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Description
                </h3>
                <p className="text-sm">{subscription.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Price
                </h3>
                <p className="text-lg">${subscription.price.toFixed(2)}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Billing Cycle
                </h3>
                <p className="text-sm capitalize">
                  {subscription.billingCycle}
                </p>
              </div>
            </div>

            {subscription.maxUsers && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground">
                  Max Users
                </h3>
                <p className="text-sm">{subscription.maxUsers}</p>
              </div>
            )}

            {subscription.features && subscription.features.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                  Features
                </h3>
                <ul className="space-y-1">
                  {subscription.features.map((feature, index) => (
                    <li key={index} className="text-sm flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground">
                Status
              </h3>
              <p className="text-sm">
                {subscription.isActive ? (
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
                disabled={deleteSubscription.isPending}
                className="flex items-center gap-2"
              >
                {deleteSubscription.isPending ? (
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

export default ViewSubscriptionDialog;
