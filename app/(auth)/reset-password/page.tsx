'use client'
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import Link from "next/link";
import Textinput from "@/components/ui/Textinput";
import useDarkmode from "@/hooks/useDarkMode";

/**
 * ⚠️ THIS FLOW HAS NO IMPLEMENTATION.
 *
 * The call below was `resetPassword(...)` — a bare identifier that is defined
 * nowhere in this repo, so submitting this form threw `ReferenceError` at
 * runtime. It was invisible because the file was `.jsx` and `tsconfig` only
 * type-checks `.ts`/`.tsx`; converting it under E5.1 is what surfaced it.
 *
 * The client half of the email password-reset flow was deleted along with
 * `components/redesign/auth/`, the same directory the `/facilities/*` shells
 * point at. `/forgot-password` still has its component commented out.
 *
 * **It was deliberately NOT wired to `/api/verify-otp`**, which looks like the
 * obvious fix and is not: that route verifies a PHONE NUMBER over SMS
 * (`checkVerificationCode(phoneNumber, otp)`), while this page carries an
 * email. Connecting them would send an email address where a phone number is
 * expected and "work" until someone tried it.
 *
 * Nothing in the app links to `/forgot-password`, `/verify-otp` or
 * `/reset-password`. Rebuilding or retiring the flow is a product decision —
 * see docs/cleanup-handoff.md. Until then this throws explicitly rather than
 * failing as an undefined-variable crash.
 */
function resetPassword(..._args: unknown[]): never {
  throw new Error(
    "Password reset is not implemented: resetPassword has no implementation in this " +
      "codebase. See the note in this file before wiring it to /api/verify-otp.",
  );
}

const schema = yup
  .object({
    newPassword: yup.string().required("New password is required"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("newPassword")], "Passwords must match")
      .required("Confirm password is required"),
  })
  .required();

const ResetPassword = () => {
  const [isDark] = useDarkmode();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromQuery = searchParams.get("token");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: { newPassword: string }) => {
    const { newPassword } = data;
    setLoading(true);

    try {
      await resetPassword(
        newPassword,
        () => {
          console.log("Password reset successful");
          router.push("/");
        },
        (error: Error) => {
          console.error("Error:", error.message || "Password reset failed.");
        },
        tokenFromQuery || undefined
      );
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginwrapper">
      <div className="lg-inner-column">
        <div className="right-column relative">
          <div className="inner-content h-full flex flex-col bg-white dark:bg-slate-800">
            <div className="auth-box h-full flex flex-col justify-center">
              <div className="mobile-logo text-center mb-6 lg:hidden block w-10 mx-auto">
                <Link href="/">
                  <Image
                    src={
                      isDark
                        ? "assets/images/all-img/logo-green.png"
                        : "/assets/images/all-img/logo-green.png"
                    }
                    alt=""
                    width={160}
                    height={64}
                    className="mx-auto"
                  />
                </Link>
              </div>
              <div className="text-center 2xl:mb-10 mb-5">
                <h4 className="font-medium">Reset Password</h4>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Textinput
                  name="newPassword"
                  label="New Password"
                  type="password"
                  placeholder="Enter your new password"
                  register={register}
                  error={errors.newPassword}
                  hasicon={true}
                />
                {errors.newPassword && (
                  <p className="text-red-500">{errors.newPassword.message}</p>
                )}

                <Textinput
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  placeholder="Confirm your new password"
                  register={register}
                  error={errors.confirmPassword}
                  hasicon={true}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500">{errors.confirmPassword.message}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn bg-[#56ce84] text-white block w-full text-center"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
              <div className="max-w-[225px] mx-auto font-normal text-slate-500 dark:text-slate-400 2xl:mt-12 mt-6 uppercase text-sm">
                Go To The{" "}
                <Link
                  href="/login2"
                  className="text-slate-900 dark:text-white font-medium hover:underline"
                >
                  Sign In
                </Link>
              </div>
            </div>
            <div className="auth-footer text-center">
              Copyright 2021, 4-Our Life All Rights Reserved.
            </div>
          </div>
        </div>

        <div
          className="left-column bg-cover bg-no-repeat bg-center"
          style={{
            backgroundImage: `url('/assets/images/all-img/4 Our Life.png')`,
            height: "100vh",
          }}
        >
          <div className="flex flex-col h-full justify-center">
            <div className="flex-1 flex flex-col justify-center items-center">
              <Link href="/">{/* Placeholder for logo or other content */}</Link>
            </div>
            <div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
