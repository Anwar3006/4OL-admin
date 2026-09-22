"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useProviderDetail, useUpdateProviderStatus } from "../data/useProviders";
import { PROVIDER_KIND_LABELS } from "../schema/types";
import CredentialsTab from "./tabs/CredentialsTab";
import CapabilitiesTab from "./tabs/CapabilitiesTab";
import CatalogueTab from "./tabs/CatalogueTab";
import ReviewsTab from "./tabs/ReviewsTab";
import SubscriptionTab from "./tabs/SubscriptionTab";
import PayoutsTab from "./tabs/PayoutsTab";
import DeliveriesTab from "./tabs/DeliveriesTab";
import ActivityTab from "./tabs/ActivityTab";

/** P0-14's nine detail tabs. All built. */
const TABS = [
  "profile",
  "credentials",
  "capabilities",
  "catalogue",
  "reviews",
  "subscription",
  "payouts",
  "deliveries",
  "activity",
] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  profile: "Profile",
  credentials: "Credentials",
  capabilities: "Capabilities",
  catalogue: "Catalogue",
  reviews: "Reviews",
  subscription: "Subscription",
  payouts: "Payouts",
  deliveries: "Deliveries",
  activity: "Activity",
};

function SuspendDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogTitle>Suspend provider</DialogTitle>
        <p className="text-xs text-slate-500">
          Suspending hides this provider from the public directory and from enquiry matching. A reason is
          required and is recorded on the provider&apos;s record.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this provider being suspended?"
          rows={4}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || isPending}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? "Suspending…" : "Suspend"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const ProviderDetailPage = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const initialTab = searchParams.get("tab");
  const defaultTab = (TABS as readonly string[]).includes(initialTab ?? "") ? (initialTab as string) : "profile";
  const { data: provider, isLoading, isError, error } = useProviderDetail(id || null);
  const updateStatus = useUpdateProviderStatus();
  const [suspendOpen, setSuspendOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="py-24 text-center text-sm text-red-500">
        {error?.message ?? "Provider not found"}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <button
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        onClick={() => router.push("/providers")}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Providers
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200">
              {provider.name}
            </h1>
            <span className="badge badge-blue capitalize">{PROVIDER_KIND_LABELS[provider.kind]}</span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-black uppercase tracking-widest border",
                provider.status === "active"
                  ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/30"
                  : provider.status === "suspended" || provider.status === "rejected"
                    ? "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-100 dark:border-red-500/30"
                    : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-500/30",
              )}
            >
              {provider.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {provider.provider_type_label ?? provider.provider_type} · {provider.district}, {provider.region}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {provider.status === "pending" && (
            <Button
              size="sm"
              onClick={() => updateStatus.mutate({ id: provider.id, status: "active" })}
              disabled={updateStatus.isPending}
            >
              Approve
            </Button>
          )}
          {provider.status !== "suspended" && (
            <Button size="sm" variant="destructive" onClick={() => setSuspendOpen(true)}>
              Suspend
            </Button>
          )}
          {provider.status === "suspended" && (
            <Button
              size="sm"
              onClick={() => updateStatus.mutate({ id: provider.id, status: "active" })}
              disabled={updateStatus.isPending}
            >
              Reinstate
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="border-b border-slate-200 dark:border-slate-700 w-full overflow-hidden">
          <TabsList className="bg-transparent h-auto p-0 flex flex-nowrap gap-0 justify-start w-full overflow-x-auto overflow-y-hidden">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className={cn(
                  "shrink-0 whitespace-nowrap px-4 py-3 text-2xs font-black uppercase tracking-widest",
                  "text-slate-400 border-b-2 border-transparent transition-all rounded-none outline-none cursor-pointer",
                  "hover:text-emerald-700 dark:hover:text-emerald-400",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-700 dark:data-[state=active]:border-emerald-400",
                )}
              >
                {TAB_LABELS[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Contact</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">{provider.contact_number || "—"}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{provider.whatsapp_number || "—"}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{provider.email || "—"}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Address</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {[provider.street, provider.area, provider.district, provider.region]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{provider.gps_address || "—"}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Owner (private)</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {[provider.owner_first_name, provider.owner_last_name].filter(Boolean).join(" ") || "—"}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{provider.owner_email || "—"}</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{provider.owner_phone || "—"}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Status notes</h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">{provider.status_reason || "—"}</p>
              {provider.rejection_reason && (
                <p className="text-sm text-red-600 dark:text-red-400">{provider.rejection_reason}</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="mt-5"><CredentialsTab providerId={provider.id} /></TabsContent>
        <TabsContent value="capabilities" className="mt-5"><CapabilitiesTab providerId={provider.id} /></TabsContent>
        <TabsContent value="catalogue" className="mt-5"><CatalogueTab providerId={provider.id} /></TabsContent>
        <TabsContent value="reviews" className="mt-5"><ReviewsTab providerId={provider.id} /></TabsContent>
        <TabsContent value="subscription" className="mt-5"><SubscriptionTab providerId={provider.id} /></TabsContent>
        <TabsContent value="payouts" className="mt-5"><PayoutsTab /></TabsContent>
        <TabsContent value="deliveries" className="mt-5"><DeliveriesTab providerId={provider.id} /></TabsContent>
        <TabsContent value="activity" className="mt-5"><ActivityTab providerId={provider.id} /></TabsContent>
      </Tabs>

      <SuspendDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        isPending={updateStatus.isPending}
        onConfirm={(reason) => {
          updateStatus.mutate(
            { id: provider.id, status: "suspended", reason },
            { onSuccess: () => setSuspendOpen(false) },
          );
        }}
      />
    </div>
  );
};

export default ProviderDetailPage;
