"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
} from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "@/components/CustomInput";
import * as zod from "zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { userLoginSchema } from "@/schemas/user-profile.schema";
import { Form } from "@/components/ui/form";
// import { authClient } from "@/lib/auth-client"; // Removed BetterAuth client
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"; // Use Supabase client for browser
import { useRouter } from "next/navigation";
import { useState } from "react";

const LoginForm = ({ className, ...props }: React.ComponentProps<"form">) => {
  const form = useForm<zod.infer<typeof userLoginSchema>>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (data: zod.infer<typeof userLoginSchema>) => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (supabaseError) {
        form.setError("root", { message: supabaseError.message });
        return;
      }

      // Role Check: Only Allow admins or group leaders to the admin panel
      // Fetch user profile to get the role, as auth.users.role is for internal Supabase roles.
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', authData.user?.id || '')
        .single();

      if (profileError || !userProfile) {
        toast.error("Failed to fetch user role.");
        await supabase.auth.signOut(); // Sign out if role cannot be fetched
        return;
      }
      
      const role = userProfile.role;
      const isAllowed = role === "super_admin" || role === "admin" || role === "group_leader";

      if (!isAllowed) {
        await supabase.auth.signOut(); // Sign out unauthorized users
        toast.error("Unauthorized! You don't have access to the admin panel.");
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("isAuth", JSON.stringify(true));
        window.localStorage.setItem("user_id", authData.user?.id || "");
        window.localStorage.setItem(
          "user_email",
          authData.user?.email || "",
        );
        window.localStorage.setItem("user_role", role || "user");
      }

      toast.success("Log in successful!");
      router.push("/dashboard/overview");
    } catch (error: unknown) {
      console.error("Error logging in user: ", error);
      toast.error("Login failed! : " + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("flex flex-col gap-6", className)}
        {...props}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Login for Admins</h1>
            <p className="text-muted-foreground text-sm text-balance">
              Fill in the form below to log in to your account
            </p>
          </div>

          <CustomInput
            type="email"
            name="email"
            label="Email Address"
            placeholder="francis@gmail.com"
            control={form.control}
            description="Use the email address you used to sign up"
            disabled={false}
            readOnly={false}
          />

          <CustomInput
            type="password"
            name="password"
            label="Password"
            placeholder="***********"
            control={form.control}
            disabled={false}
            readOnly={false}
          />

          <Field>
            <Button
              type="submit"
              className="py-5 bg-emerald-600"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login to Account"}
            </Button>
          </Field>

          {/* Registration is invite-only — no public sign-up link shown */}
          <Field>
            <FieldDescription className="px-6 text-center text-muted-foreground text-sm">
              Access is by invitation only. Check your email for an invite link.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );
};

export default LoginForm;
