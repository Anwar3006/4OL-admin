"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, Edit, Trash2, CheckCircle2, 
  Package, Clock, CreditCard, ShieldCheck, AlertTriangle 
} from "lucide-react";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: subscription, isLoading } = useMarketingSubscription({
    id: entityId || "",
    enabled: isOpen && !!entityId,
  });
  
  const deleteSubscription = useDeleteMarketingSubscription();

  const handleEdit = () => {
    if (subscription) {
      close();
      addDialog.open(subscription);
    }
  };

  const handleDelete = async () => {
    if (!subscription?.id) return;
    await deleteSubscription.mutateAsync(subscription.id);
    setShowDeleteConfirm(false);
    close();
  };

  // Helper for formatting
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(val);

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if(!val) { close(); setShowDeleteConfirm(false); } }}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl">
        
        {/* Header with Background Accent */}
        <div className="bg-slate-50 px-6 py-6 border-b">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {subscription?.name || "Subscription Details"}
                </DialogTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Manage and review subscription tier configuration
              </p>
            </div>
            {subscription && (
              <Badge variant={subscription.isActive ? "default" : "secondary"} className="uppercase tracking-widest text-[10px]">
                {subscription.isActive ? "Active" : "Inactive"}
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground animate-pulse">Fetching tier data...</p>
          </div>
        ) : subscription ? (
          <div className="p-6 space-y-6">
            
            {/* Description Section */}
            {subscription.description && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">About this Tier</h3>
                <p className="text-sm leading-relaxed text-slate-600 italic">
                  "{subscription.description}"
                </p>
              </div>
            )}

            {/* Pricing Card */}
            <div className="grid grid-cols-3 gap-0 border rounded-xl overflow-hidden divide-x bg-white shadow-sm">
              <div className="p-4 flex flex-col items-center justify-center bg-slate-50/50">
                <CreditCard className="h-4 w-4 text-slate-400 mb-2" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Price</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(subscription.price)}</span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center">
                <Clock className="h-4 w-4 text-slate-400 mb-2" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Cycle</span>
                <span className="text-sm font-semibold capitalize">{subscription.billingCycle}</span>
              </div>
              <div className="p-4 flex flex-col items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-slate-400 mb-2" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Type</span>
                <Badge variant="outline" className="mt-1 text-[10px] capitalize">{subscription.tierType}</Badge>
              </div>
            </div>

            {/* Features/Privileges Grid */}
            <div className="space-y-3">
               <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Included Privileges</h3>
               <div className="flex flex-wrap gap-2">
                {subscription.privileges?.map((priv, i) => (
                  <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 py-1 px-3 flex gap-1.5 items-center">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="capitalize">{priv.replaceAll("_", " ")}</span>
                  </Badge>
                ))}
                {(!subscription.privileges || subscription.privileges.length === 0) && (
                  <span className="text-xs text-muted-foreground italic">No specific privileges assigned.</span>
                )}
               </div>
            </div>

            <Separator />

            {/* Bottom Metadata */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Tier Limit:</span>
                <span className="font-bold text-slate-900">
                  {subscription.tierLimit === 0 ? "Unlimited Users" : `${subscription.tierLimit} Users`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Validity:</span>
                <span className="font-semibold">{subscription.period}</span>
              </div>
            </div>

            {/* Action Footer */}
            <DialogFooter className="gap-2 sm:gap-0">
              {showDeleteConfirm ? (
                <div className="flex items-center justify-between w-full bg-red-50 p-3 rounded-lg border border-red-100 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2 text-red-700 text-xs font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Confirm permanent deletion?
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="text-xs">Cancel</Button>
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleteSubscription.isPending} className="text-xs">
                      {deleteSubscription.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, Delete"}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={close} className="text-muted-foreground">Close</Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEdit} className="h-9 px-4 border-slate-200">
                      <Edit className="h-4 w-4 mr-2" /> Edit Tier
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} className="h-9 px-4 text-white">
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </>
              )}
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default ViewSubscriptionDialog;