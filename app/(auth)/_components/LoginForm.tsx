"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "@/components/CustomInput";
import * as zod from "zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { userLoginSchema } from "@/schemas/user-profile.schema";
import { Form } from "@/components/ui/form";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LoginForm = ({ className, ...props }: React.ComponentProps<"form">) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<zod.infer<typeof userLoginSchema>>({
    resolver: zodResolver(userLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      form.setError("root", {
        message:
          "This account doesn't have access to the admin dashboard.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isSubmitting } = form.formState;

  const handleSubmit = async (data: zod.infer<typeof userLoginSchema>) => {
    try {
      const supabase = getSupabaseBrowserClient();
      
      const { data: authData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (supabaseError) {
        form.setError("root", { message: supabaseError.message });
        return;
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', authData.user?.id || '')
        .single();

      if (profileError || !userProfile) {
        toast.error("Failed to verify user permissions.");
        await supabase.auth.signOut();
        return;
      }
      
      const role = userProfile.role;
      const isAllowed = ["super_admin", "admin", "registrar"].includes(role);

      if (!isAllowed) {
        await supabase.auth.signOut();
        form.setError("root", { message: "Unauthorized. You do not have admin panel access." });
        return;
      }

      toast.success("Authentication successful");
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Login Error: ", error);
      form.setError("root", { message: "An unexpected network error occurred." });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        // Increased the gap size for larger screens
        className={cn("flex flex-col gap-6 2xl:gap-8", className)}
        {...props}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 2xl:gap-4 text-center mb-6 2xl:mb-8">
            <div className="w-12 h-12 2xl:w-20 2xl:h-20 rounded-xl bg-[#57CE83]/10 flex items-center justify-center mb-2">
              <Shield className="w-6 h-6 2xl:w-10 2xl:h-10 text-[#57CE83]" />
            </div>
            <h1 className="text-2xl 2xl:text-4xl font-semibold tracking-tight text-slate-900">Admin Portal</h1>
            <p className="text-muted-foreground text-sm 2xl:text-lg text-balance">
              Enter your credentials to access the dashboard
            </p>
          </div>

          {form.formState.errors.root && (
            <Alert variant="destructive" className="bg-destructive/10 text-destructive border-none 2xl:p-6">
              <AlertCircle className="h-4 w-4 2xl:w-6 2xl:h-6" />
              <AlertDescription className="2xl:text-lg">
                {form.formState.errors.root.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 2xl:space-y-6">
            <CustomInput
              type="email"
              name="email"
              label="Email Address"
              placeholder="admin@example.com"
              control={form.control}
              description="Use the email address you used to sign up"
              readOnly={false}
            />

            <CustomInput
              type="password"
              name="password"
              label="Password"
              placeholder="••••••••"
              control={form.control}
              readOnly={false}
            />
          </div>

          <Field className="mt-2 2xl:mt-4">
            <Button
              type="submit"
              className="w-full py-6 2xl:py-8 2xl:text-xl bg-emerald-500 hover:bg-[#47a669] text-white transition-colors"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 2xl:w-6 2xl:h-6 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Log in to Account"
              )}
            </Button>
          </Field>

          <Field>
            <FieldDescription className="px-6 text-center text-muted-foreground text-sm 2xl:text-base mt-4 2xl:mt-6">
              Access is by invitation only. Check your email for an invite link.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );
};

export default LoginForm;