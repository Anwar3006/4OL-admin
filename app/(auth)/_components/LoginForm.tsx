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
import { userLoginSchema } from "@/schemas/user-profile.schema";
import { Form } from "@/components/ui/form";
import { authClient } from "@/lib/auth-client";
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
      const authResult = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (authResult.error) {
        form.setError("root", { message: authResult.error.message });
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("isAuth", JSON.stringify(true));
        window.localStorage.setItem("user_id", authResult.data?.user?.id || "");
        window.localStorage.setItem(
          "user_email",
          authResult.data?.user?.email || "",
        );
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
          <FieldSeparator>Or continue with</FieldSeparator>
          <Field>
            <FieldDescription className="px-6 text-center">
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-emerald-600">
                Sign Up
              </a>
            </FieldDescription>
          </Field>
        </FieldGroup>
      </form>
    </Form>
  );
};

export default LoginForm;
