"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "@/components/CustomInput";
import * as zod from "zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  TUserProfile,
  TUserProfileRegistrationInput,
  userRegistrationSchema,
} from "@/schemas/user-profile.schema";
import { Form } from "@/components/ui/form";
import CustomSelect from "@/components/CustomSelect";
import CustomDatePicker from "@/components/CustomDatePicker";
import { ROLE_OPTIONS, SEX_OPTIONS } from "@/types/formInput";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Shield, AlertCircle } from "lucide-react";

const RegisterForm = ({
  isInvited = false,
  inviteData,
  className,
  ...props
}: React.ComponentProps<"form"> & {
  isInvited?: boolean;
  inviteData?: { email: string; role: string };
}) => {
  const form = useForm<zod.infer<typeof userRegistrationSchema>>({
    resolver: zodResolver(userRegistrationSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: inviteData?.email || "",
      sex: "" as "male" | "female" | "other",
      dob: "",
      password: "",
      confirmPassword: "",
      role: (inviteData?.role as TUserProfile["role"]) || "user",
      phoneNumber: "",
      userType: "customer",
    },
  });
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: TUserProfileRegistrationInput) => {
    setIsSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();

      // 1. Create Supabase Auth user.
      //    Pass all profile fields in options.data so the handle_new_user
      //    trigger can populate user_profiles immediately on insert.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            phone_number: data.phoneNumber,
            sex: data.sex,
            dob: data.dob,
            role: data.role,
            user_type: data.userType || "customer",
          },
        },
      });

      if (authError) {
        form.setError("root", { message: authError.message });
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        form.setError("root", { message: "User ID missing from auth response." });
        return;
      }

      // 2. The handle_new_user trigger already created the user_profiles row.
      //    We do a targeted UPDATE here for any fields the trigger may not
      //    have covered (belt-and-suspenders), and to set role correctly.
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          sex: data.sex,
          dob: data.dob,
          role: data.role,
          user_type: data.userType || "customer",
        })
        .eq("user_id", userId);

      if (profileError) {
        // Non-fatal — trigger may have already set these. Log and continue.
        console.warn("[RegisterForm] Profile update warning:", profileError.message);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("isAuth", JSON.stringify(true));
        window.localStorage.setItem("user_id", userId);
        window.localStorage.setItem("user_email", authData.user?.email || "");
        window.localStorage.setItem("user_role", data.role || "user");
      }

      toast.success("Account created successfully!");
      router.push("/dashboard/overview");
    } catch (error: unknown) {
      console.error("Error registering user: ", error);
      toast.error("Registration failed: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
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
          <div className="flex flex-col items-center gap-2 text-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-[#57CE83]/10 flex items-center justify-center mb-1">
              <Shield className="w-6 h-6 text-[#57CE83]" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isInvited ? "Administrative Account Setup" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm text-balance">
              Fill in the form below to create an account
            </p>
          </div>

          {form.formState.errors.root && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{form.formState.errors.root.message}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <CustomInput type="text" name="firstName" label="First Name" placeholder="Francis" control={form.control} />
            <CustomInput type="text" name="lastName" label="Last Name" placeholder="Mensah" control={form.control} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <CustomSelect name="sex" label="Sex" placeholder="Select sex" options={SEX_OPTIONS} control={form.control} description="Your biological sex" />
            <CustomDatePicker name="dob" label="Date of Birth" control={form.control} description="Must be 18 years or older" />
          </div>

          <CustomInput
            type="email"
            name="email"
            label="Email Address"
            placeholder="francis@gmail.com"
            control={form.control}
            description="This will be your primary contact email."
            disabled={isInvited}
            readOnly={isInvited}
          />

          <CustomInput
            type="text"
            name="phoneNumber"
            label="Phone Number"
            placeholder="+233 55 555 5555"
            control={form.control}
            description="We may use this to contact you."
          />

          <CustomSelect
            name="role"
            label="Your Role"
            options={ROLE_OPTIONS}
            control={form.control}
            description="Assigned by the Administrator."
            disabled={isInvited}
          />

          <div className="grid grid-cols-2 gap-5">
            <CustomInput type="password" name="password" label="Password" placeholder="***********" control={form.control} />
            <CustomInput type="password" name="confirmPassword" label="Confirm Password" placeholder="***********" control={form.control} />
          </div>

          <Field>
            <Button type="submit" className="w-full py-5 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Register an Account"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );
};

export default RegisterForm;
