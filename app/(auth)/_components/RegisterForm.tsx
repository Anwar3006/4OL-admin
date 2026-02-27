"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldSeparator,
} from "@/components/ui/field";

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
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateUserProfile } from "@/hooks/supabase-calls/useUser";

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
  const { mutateAsync, isPending } = useCreateUserProfile();
  const isSubmittingForm = isSubmitting || isPending;

  const handleSubmit = async (data: TUserProfileRegistrationInput) => {
    setIsSubmitting(true);
    try {
      const authResult = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
      });

      if (authResult.error) {
        form.setError("root", { message: authResult.error.message });
        return;
      }

      await mutateAsync({
        userId: authResult.data.user.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        sex: data.sex,
        dob: data.dob,
        phoneNumber: data.phoneNumber,
        role: data.role,
        userType: data.userType,
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem("isAuth", JSON.stringify(true));
        window.localStorage.setItem("user_id", authResult.data?.user?.id || "");
        window.localStorage.setItem(
          "user_email",
          authResult.data?.user?.email || "",
        );
        window.localStorage.setItem("user_role", data.role || "user");
      }

      router.push("/dashboard/overview");
    } catch (error: unknown) {
      console.error("Error registering user: ", error);
      toast.error("Registration failed! : " + (error as Error).message);
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
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">
              {isInvited
                ? "Administrative Account Setup"
                : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-sm text-balance">
              Fill in the form below to create an account
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <CustomInput
              type="text"
              name="firstName"
              label="First Name"
              placeholder="Francis Neizer"
              control={form.control}
              disabled={false}
              readOnly={false}
            />

            <CustomInput
              type="text"
              name="lastName"
              label="Last Name"
              placeholder="Mensah"
              control={form.control}
              disabled={false}
              readOnly={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <CustomSelect
              name="sex"
              label="Sex"
              placeholder="Select sex"
              options={SEX_OPTIONS}
              control={form.control}
              description="Your biological sex"
            />

            <CustomDatePicker
              name="dob"
              label="Date of Birth"
              control={form.control}
              description="Must be 18 years or older"
            />
          </div>

          <CustomInput
            type="email"
            name="email"
            label="Email Address"
            placeholder="francis@gmail.com"
            control={form.control}
            description="This email address will be your primary form of contact. Periodically check your inbox."
            disabled={isInvited}
            readOnly={isInvited}
          />

          <CustomInput
            type="text"
            name="phoneNumber"
            label="Phone Number"
            placeholder="+233 55 555 5555"
            control={form.control}
            description="We will use this to contact you if need be. Make sure it is accessible."
            disabled={false}
            readOnly={false}
          />

          <CustomSelect
            name="role"
            label="Your Role"
            options={ROLE_OPTIONS}
            control={form.control}
            description="You have been assigned this role by the Administrator."
            disabled={isInvited}
          />

          <div className="grid grid-cols-2 gap-5">
            <CustomInput
              type="password"
              name="password"
              label="Password"
              placeholder="***********"
              control={form.control}
              disabled={false}
              readOnly={false}
            />
            <CustomInput
              type="password"
              name="confirmPassword"
              label="Confirm Password"
              placeholder="***********"
              control={form.control}
              disabled={false}
              readOnly={false}
            />
          </div>

          <Field>
            <Button
              type="submit"
              className="py-5 bg-emerald-600"
              disabled={isSubmittingForm}
            >
              {isPending ? "Creating..." : "Register an Account"}
            </Button>
          </Field>

          <FieldSeparator>Or continue with</FieldSeparator>

          <Field>
            <FieldDescription className="px-6 text-center">
              Already have an account?{" "}
              <a href="/login" className="text-emerald-600">
                Sign in
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );
};

export default RegisterForm;
