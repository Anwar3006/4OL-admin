"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Loader2, User, Mail, Pencil, X, Check } from "lucide-react";
import {
  TUserProfile,
} from "@/schemas/user-profile.schema";
import { useUpdateProfile } from "@/hooks/supabase-calls/useUser";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  first_name: z.string().min(2, "First must be at least 2 characters"),
  last_name: z.string().min(2, "Last must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EditProfileFormProps {
  user: TUserProfile;
}

export function EditProfileForm({ user }: EditProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { mutateAsync } = useUpdateProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
    },
  });

  // Ensure form updates if user object changes (critical for Better Auth)
  useEffect(() => {
    form.reset({
      first_name: user?.first_name,
      last_name: user?.last_name,
      email: user?.email,
    });
  }, [user, form]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setLoading(true);

      const hasNameChanged =
        values.first_name !== user.first_name ||
        values.last_name !== user.last_name;
      const hasEmailChanged = values.email !== user.email;

      if (!hasNameChanged && !hasEmailChanged) {
        setIsEditing(false);
        return;
      }

      if (hasNameChanged) {
        const payload = {
          ...user,
          first_name: values.first_name,
          last_name: values.last_name,
        };
        await authClient.updateUser({
          name: `${values.first_name} ${values.last_name}`,
        });
        await mutateAsync({
          id: user.user_id,
          data: payload,
        });
      }

      if (hasEmailChanged) {
        await authClient.changeEmail({
          newEmail: values.email,
          callbackURL: window.location.origin + "/profile",
        });
        toast.success("Verification email sent to new address");
      }

      if (hasNameChanged && !hasEmailChanged) {
        toast.success("Profile updated successfully");
      }

      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset(); // Resets to the last 'defaultValues' provided
    setIsEditing(false);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">
            Personal Information
          </CardTitle>
          <CardDescription>
            Manage your account display name and email
          </CardDescription>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold">
                    First Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        {...field}
                        disabled={!isEditing || loading}
                        className={cn(
                          "pl-10 h-11 transition-all",
                          !isEditing &&
                            "bg-slate-50 border-transparent focus-visible:ring-0",
                        )}
                        placeholder="John Doe"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold">
                    Last Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        {...field}
                        disabled={!isEditing || loading}
                        className={cn(
                          "pl-10 h-11 transition-all",
                          !isEditing &&
                            "bg-slate-50 border-transparent focus-visible:ring-0",
                        )}
                        placeholder="John Doe"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-700 font-semibold">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        {...field}
                        disabled={!isEditing || loading}
                        className={cn(
                          "pl-10 h-11 transition-all",
                          !isEditing &&
                            "bg-slate-50 border-transparent focus-visible:ring-0",
                        )}
                        type="email"
                        placeholder="john@example.com"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEditing && (
              <div className="flex flex-col items-center gap-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 text-slate-500 gap-2 w-full"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
