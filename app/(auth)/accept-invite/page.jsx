"use client";
import React from "react";
import { redirect, useSearchParams } from "next/navigation";
import RegisterForm from "../_components/RegisterForm";
import { useGetInvitedAdmin } from "@/hooks/supabase-calls/useUser";

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!token) {
    return redirect("/register");
  }

  const { data, isLoading } = useGetInvitedAdmin({ token });
  const invite = data?.[0];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4 text-center">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-sm border border-emerald-100">
          <h1 className="text-xl font-semibold text-gray-900">Loading...</h1>
        </div>
      </div>
    );
  }

  const expiresAt = invite?.expires_at
    ? typeof invite.expires_at === "string"
      ? new Date(invite.expires_at)
      : invite.expires_at
    : null;

  if (!invite || (expiresAt && expiresAt < new Date())) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-4 text-center">
        <div className="max-w-md rounded-lg bg-white p-8 shadow-sm border border-emerald-100">
          <h1 className="text-xl font-semibold text-gray-900">
            Expired Invitation
          </h1>
          <p className="mt-2 text-gray-600">
            This invitation is invalid, has already been used, or has expired.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 h-[98vh] overflow-y-scroll">
        <div className="flex justify-center gap-2 md:justify-start items-end">
          <a href="/register" className="flex items-center gap-2 ">
            <div className="p-2 text-primary-foreground flex size-full items-center justify-center rounded-xl shadow-sm border border-muted">
              <img
                src="/assets/images/all-img/logo.png"
                alt="Logo"
                className="w-10 rounded-md "
              />
            </div>
          </a>
          <span className="text-sm font-medium underline underline-offset-3">
            4 Our Life.
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <RegisterForm
              isInvited={true}
              inviteData={{ email: invite.email, role: invite.role }}
            />
          </div>
        </div>
      </div>

      <div className="bg-[#57CE83] relative hidden lg:block h-full">
        <img
          src="/assets/images/all-img/4 Our Life.png"
          alt="placeholder"
          className="absolute inset-0 h-full w-full object-contain dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
}
