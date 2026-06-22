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
        console.warn("[RegisterForm] Profile update warning:", profileError.message);
      }

      // NOTE: We've kept local storage logic here per your original code, 
      // but as discussed in the login component, relying exclusively on 
      // Supabase's secure cookies is a safer long-term architecture.
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
        className={cn("flex flex-col gap-6 2xl:gap-8", className)}
        {...props}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 2xl:gap-4 text-center mb-2 2xl:mb-6">
            <div className="w-12 h-12 2xl:w-20 2xl:h-20 rounded-xl bg-[#57CE83]/10 flex items-center justify-center mb-1 2xl:mb-2">
              <Shield className="w-6 h-6 2xl:w-10 2xl:h-10 text-[#57CE83]" />
            </div>
            <h1 className="text-2xl 2xl:text-4xl font-semibold tracking-tight text-slate-900">
              {isInvited ? "Administrative Account Setup" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm 2xl:text-lg text-balance">
              Fill in the form below to create an account
            </p>
          </div>

          {form.formState.errors.root && (
            <div className="flex items-center gap-2 2xl:gap-3 rounded-lg bg-red-50 px-3 py-2 2xl:p-4 text-sm 2xl:text-base text-red-600">
              <AlertCircle className="h-4 w-4 2xl:w-6 2xl:h-6 shrink-0" />
              <span>{form.formState.errors.root.message}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5 2xl:gap-8">
            <CustomInput type="text" name="firstName" label="First Name" placeholder="Francis" control={form.control} />
            <CustomInput type="text" name="lastName" label="Last Name" placeholder="Mensah" control={form.control} />
          </div>

          <div className="grid grid-cols-2 gap-5 2xl:gap-8">
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

          <div className="grid grid-cols-2 gap-5 2xl:gap-8">
            <CustomInput type="password" name="password" label="Password" placeholder="***********" control={form.control} />
            <CustomInput type="password" name="confirmPassword" label="Confirm Password" placeholder="***********" control={form.control} />
          </div>

          <Field className="mt-2 2xl:mt-4">
            <Button type="submit" className="w-full py-5 2xl:py-8 2xl:text-xl mt-2 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Register an Account"}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );
};

export default RegisterForm;