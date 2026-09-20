"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ShieldCheck,
  Loader2,
  Mail,
  MessageCircle,
  Smartphone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useResendProviderInvite } from "@/features/providers/data/useRegisterProviderAccount";
import type { CredentialDeliveryResult } from "@/features/providers/schema/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: {
    email: string;
    facilityName: string;
    phoneNumber: string;
    ownerNumber: string;
    providerId: string;
    deliveries: CredentialDeliveryResult[];
  };
}

const CHANNEL_LABEL: Record<CredentialDeliveryResult["channel"], string> = {
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
};
const CHANNEL_ICON: Record<CredentialDeliveryResult["channel"], React.FC<{ className?: string }>> = {
  email: Mail,
  whatsapp: MessageCircle,
  sms: Smartphone,
};

function StatusIcon({ status }: { status: CredentialDeliveryResult["status"] }) {
  if (status === "sent" || status === "delivered") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (status === "skipped") {
    return <MinusCircle className="h-4 w-4 text-slate-300 dark:text-slate-600" />;
  }
  return <XCircle className="h-4 w-4 text-red-500" />;
}

const FacilityCredentialsModal = ({ isOpen, onClose, data }: Props) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState(data.deliveries);
  const resendInvite = useResendProviderInvite();

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleResend = () => {
    resendInvite.mutate(data.providerId, {
      onSuccess: (res) => {
        setDeliveries(res.deliveries);
        toast.success("Invite resent");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-emerald-500">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Registration Success
            </span>
          </div>
          <DialogTitle className="text-xl font-bold">
            Provider Invite
          </DialogTitle>
          <DialogDescription>
            Account created for{" "}
            <span className="font-semibold text-foreground">
              {data.facilityName}
            </span>
            . They&apos;ll sign in with a one-time link — there&apos;s no password to share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Owner email</Label>
            <div className="relative">
              <Input
                id="email"
                value={data.email}
                readOnly
                className="pr-10 bg-slate-50 dark:bg-slate-900 font-medium"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => copyToClipboard(data.email, "Email")}
              >
                {copiedField === "Email" ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-400" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Delivery status</Label>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {deliveries.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  No delivery attempts recorded yet.
                </p>
              )}
              {deliveries.map((d, i) => {
                const Icon = CHANNEL_ICON[d.channel];
                return (
                  <div key={`${d.channel}-${i}`} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-slate-400" />
                      <span className="font-medium">{CHANNEL_LABEL[d.channel]}</span>
                      <span className="text-xs text-muted-foreground">{d.destinationMasked}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={d.status} />
                      <span className="text-xs capitalize text-muted-foreground">{d.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-100 dark:border-amber-500/30 text-amber-800">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              The invite link expires after 24 hours and can only be used once.
              If every channel above failed, use Resend invite.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleResend}
            disabled={resendInvite.isPending}
          >
            {resendInvite.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Resend invite
          </Button>
          <Button type="button" onClick={onClose}>
            Done & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FacilityCredentialsModal;
