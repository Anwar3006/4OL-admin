"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Share2,
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: {
    email: string;
    password: string;
    facilityName: string;
    phoneNumber: string;
    ownerNumber: string;
  };
}

const FacilityCredentialsModal = ({ isOpen, onClose, data }: Props) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleShare = () => {
    const phoneNumber = data.phoneNumber;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-t-4 border-t-emerald-500">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Registration Success
            </span>
          </div>
          <DialogTitle className="text-xl font-bold">
            Facility Credentials
          </DialogTitle>
          <DialogDescription>
            Account created for{" "}
            <span className="font-semibold text-foreground">
              {data.facilityName}
            </span>
            . Please share these credentials with the facility administrator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Administrator Email</Label>
            <div className="relative">
              <Input
                id="email"
                value={data.email}
                readOnly
                className="pr-10 bg-slate-50 font-medium"
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

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={data.password}
                readOnly
                className="pr-20 bg-slate-50 font-mono"
              />
              <div className="absolute right-0 top-0 h-full flex items-center pr-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 hover:bg-transparent"
                  onClick={() => copyToClipboard(data.password, "Password")}
                >
                  {copiedField === "Password" ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              <span className="font-bold">Security Warning:</span> This is a
              temporary password. The administrator will be required to change
              it upon their first login. Ensure this is shared over a secure
              channel.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onClose}
          >
            Done & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FacilityCredentialsModal;
