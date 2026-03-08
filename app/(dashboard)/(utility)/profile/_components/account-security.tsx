"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Shield, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import {
  TUserProfile,
} from "@/schemas/user-profile.schema";
import { useRouter } from "next/navigation";

interface AccountSecurityProps {
  user: TUserProfile;
}

export function AccountSecurity({ user }: AccountSecurityProps) {
  const router = useRouter();
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      // Note: This requires the deleteUser feature to be enabled in your auth config
      await authClient.deleteUser();
      toast.success("Account deleted successfully");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          <CardTitle>Account Security</CardTitle>
        </div>
        <CardDescription>
          Manage your account security settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Verification Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Email Verification</h4>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {user.email_verified ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Email Verified</p>
                    <p className="text-xs text-muted-foreground">
                      Your email has been verified
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Email Not Verified</p>
                    <p className="text-xs text-muted-foreground">
                      Please verify your email address
                    </p>
                  </div>
                </>
              )}
            </div>
            <Badge variant={user.email_verified ? "default" : "secondary"}>
              {user.email_verified ? "Verified" : "Unverified"}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Session Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Active Sessions</h4>
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              You are currently logged in on this device. Sign out from all
              other devices to ensure your account security.
            </p>
          </div>
        </div>

        <Separator />

        {/* Danger Zone */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-sm font-medium mb-1">Delete Account</h5>
                <p className="text-xs text-muted-foreground">
                  Once you delete your account, there is no going back. Please
                  be certain. All your data will be permanently removed.
                </p>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={deleteLoading}
                >
                  {deleteLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={deleteLoading}
                  >
                    {deleteLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
