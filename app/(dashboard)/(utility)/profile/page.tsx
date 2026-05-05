"use client";

import { ProfileHeader } from "./_components/profile-header";
import { EditProfileForm } from "./_components/edit-profile-form";
import { ChangePasswordForm } from "./_components/change-password-form";
import { AccountSecurity } from "./_components/account-security";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useUser } from "@/hooks/supabase-calls/useUser";

export default function ProfilePage() {
  const {
    data: session,
    isPending,
    error: sessionError,
  } = useSupabaseSession();

  const {
    data: user,
    isLoading: isUserLoading,
    error: userError,
  } = useUser({
    id: session?.user.id as string,
    enabled: !!session?.user.id,
  });

  const isLoading = isPending || isUserLoading;
  const error = sessionError || userError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !session?.user) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || "Failed to load profile. Please try again."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 animate-in fade-in duration-500">
      {/* Profile Header */}
      <ProfileHeader user={user!} />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <EditProfileForm user={user!} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <ChangePasswordForm />
        </div>
      </div>

      {/* Full Width Security Section */}
      <AccountSecurity user={user!} />
    </div>
  );
}
