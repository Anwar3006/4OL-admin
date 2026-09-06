"use client";
import { redirect, useSearchParams } from "next/navigation";
import RegisterForm from "../_components/RegisterForm";
import { useGetInvitedAdmin } from "@/features/users/data/useUser";
import Lottie from "lottie-react";
import medical_care from "@/public/assets/lottie/medical-care.json";
import { Heart, Shield, Stethoscope } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
      <div className="grid min-h-dvh lg:grid-cols-2 bg-white">
        <div className="flex flex-col p-6 md:p-10 2xl:p-24 h-full items-center justify-center">
          <div className="w-12 h-12 2xl:w-20 2xl:h-20 rounded-xl bg-[#57CE83]/10 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 2xl:w-10 2xl:h-10 text-[#57CE83]" />
          </div>
          <h1 className="mt-4 text-xl 2xl:text-3xl font-semibold text-slate-900">Loading...</h1>
        </div>

        <div className="relative hidden lg:flex flex-col bg-[#57CE83] overflow-hidden p-12 2xl:p-24 justify-between">
          <div className="absolute -top-20 -left-20 w-64 h-64 2xl:w-96 2xl:h-96 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 2xl:w-[600px] 2xl:h-[600px] rounded-full bg-white/10" />
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
      <div className="grid min-h-dvh lg:grid-cols-2 bg-white">
        <div className="flex flex-col p-6 md:p-10 2xl:p-24 h-full items-center justify-center text-center">
          <div className="w-12 h-12 2xl:w-20 2xl:h-20 rounded-xl bg-red-50 flex items-center justify-center mb-4 2xl:mb-6">
            <Shield className="w-6 h-6 2xl:w-10 2xl:h-10 text-red-500" />
          </div>
          <h1 className="text-xl 2xl:text-3xl font-semibold text-slate-900">
            Expired Invitation
          </h1>
          <p className="mt-2 text-muted-foreground max-w-sm 2xl:max-w-lg 2xl:text-lg">
            This invitation is invalid, has already been used, or has expired.
          </p>
        </div>

        <div className="relative hidden lg:flex flex-col bg-[#57CE83] overflow-hidden p-12 2xl:p-24 justify-between">
          <div className="absolute -top-20 -left-20 w-64 h-64 2xl:w-96 2xl:h-96 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 2xl:w-[600px] 2xl:h-[600px] rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2 bg-white">
      
      {/* Left Column: Form Container */}
      <div className="flex flex-col p-6 md:p-10 2xl:p-24 h-full overflow-y-auto bg-white">
        {/* Mobile-only logo */}
        <div className="flex items-center lg:hidden mb-8">
          <Link href="/register" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex items-center justify-center p-1.5 rounded-xl shadow-sm bg-card">
              <Image
                src="/assets/images/all-img/logo.png"
                alt="4 Our Life Logo"
                width={36}
                height={36}
                className="rounded-md w-9 h-9"
              />
            </div>
            <span className="text-sm font-bold tracking-tight">
              4 Our Life.
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md 2xl:max-w-xl">
            <RegisterForm
              isInvited={true}
              inviteData={{ email: invite.email, role: invite.role }}
            />
          </div>
        </div>
      </div>

      {/* Right Column: Green Branding Panel */}
      <div className="relative hidden lg:flex flex-col bg-emerald-600 overflow-hidden p-12 2xl:p-24 justify-between">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 2xl:w-96 2xl:h-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 2xl:w-[600px] 2xl:h-[600px] rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] 2xl:w-[800px] 2xl:h-[800px] rounded-full bg-white/5" />
        
        {/* Top Logo & Brand */}
        <div className="relative z-10 flex items-center gap-3 2xl:gap-4">
          <Link href="/login" className="flex items-center gap-3 2xl:gap-4 transition-opacity hover:opacity-80">
            <div className="flex items-center justify-center p-1.5 2xl:p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
              <Image
                src="/assets/images/all-img/logo.png"
                alt="4 Our Life Logo"
                width={56}
                height={56}
                className="rounded-md w-9 h-9 2xl:w-14 2xl:h-14"
              />
            </div>
            <span className="text-sm 2xl:text-xl font-bold tracking-tight text-white">
              4 Our Life.
            </span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex flex-col gap-8 2xl:gap-14 max-w-md 2xl:max-w-2xl">
          <div className="space-y-4 2xl:space-y-6">
            <h1 className="text-4xl 2xl:text-6xl font-bold text-white leading-tight">
              Healthcare Management<br />
              Simplified
            </h1>
            <p className="text-white/80 text-base 2xl:text-xl leading-relaxed">
              A centralized platform for health facilities, patient management, and wellness tracking — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 2xl:gap-4">
            <div className="flex items-center gap-2 px-4 py-2 2xl:px-6 2xl:py-3 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm 2xl:text-lg font-medium">
              <Heart className="w-4 h-4 2xl:w-5 2xl:h-5" />
              Patient Care
            </div>
            <div className="flex items-center gap-2 px-4 py-2 2xl:px-6 2xl:py-3 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm 2xl:text-lg font-medium">
              <Shield className="w-4 h-4 2xl:w-5 2xl:h-5" />
              Secure Data
            </div>
            <div className="flex items-center gap-2 px-4 py-2 2xl:px-6 2xl:py-3 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm 2xl:text-lg font-medium">
              <Stethoscope className="w-4 h-4 2xl:w-5 2xl:h-5" />
              Facility Tools
            </div>
          </div>

          {/* Lottie Illustration */}
          <div className="w-full max-w-md 2xl:max-w-2xl h-auto">
            <Lottie
              animationData={medical_care}
              loop={true}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-white/60 text-xs 2xl:text-base">
          © {new Date().getFullYear()} 4 Our Life. All rights reserved.
        </div>
      </div>
    </div>
  );
}
