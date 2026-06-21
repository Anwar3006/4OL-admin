"use client";
import { redirect, useSearchParams } from "next/navigation";
import RegisterForm from "../_components/RegisterForm";
import { useGetInvitedAdmin } from "@/hooks/supabase-calls/useUser";
import Lottie from "lottie-react";
import medical_care from "@/public/assets/lottie/medical-care.json";
import { Heart, Shield, Stethoscope } from "lucide-react";
import Link from "next/link";

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
        <div className="flex flex-col p-6 md:p-10 h-full items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-[#57CE83]/10 flex items-center justify-center animate-pulse">
            <Shield className="w-6 h-6 text-[#57CE83]" />
          </div>
          <h1 className="mt-4 text-xl font-semibold text-slate-900">Loading...</h1>
        </div>

        <div className="relative hidden lg:flex flex-col bg-[#57CE83] overflow-hidden p-12 justify-between">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/10" />
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
        <div className="flex flex-col p-6 md:p-10 h-full items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Expired Invitation
          </h1>
          <p className="mt-2 text-muted-foreground max-w-sm">
            This invitation is invalid, has already been used, or has expired.
          </p>
        </div>

        <div className="relative hidden lg:flex flex-col bg-[#57CE83] overflow-hidden p-12 justify-between">
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2 bg-white">
      
      {/* Left Column: Form Container */}
      <div className="flex flex-col p-6 md:p-10 h-full overflow-y-auto bg-white">
        {/* Mobile-only logo */}
        <div className="flex items-center lg:hidden mb-8">
          <Link href="/register" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex items-center justify-center p-1.5 rounded-xl shadow-sm bg-card">
              <img
                src="/assets/images/all-img/logo.png"
                alt="4 Our Life Logo"
                width={36}
                height={36}
                className="rounded-md"
              />
            </div>
            <span className="text-sm font-bold tracking-tight">
              4 Our Life.
            </span>
          </Link>
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

      {/* Right Column: Green Branding Panel */}
      <div className="relative hidden lg:flex flex-col bg-emerald-600 overflow-hidden p-12 justify-between">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/5" />
        
        {/* Top Logo & Brand */}
        <div className="relative z-10 flex items-center gap-3">
          <Link href="/login" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <div className="flex items-center justify-center p-1.5 rounded-xl bg-white/20 backdrop-blur-sm">
              <img
                src="/assets/images/all-img/logo.png"
                alt="4 Our Life Logo"
                width={36}
                height={36}
                className="rounded-md"
              />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              4 Our Life.
            </span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 flex flex-col gap-8 max-w-md">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Healthcare Management<br />
              Simplified
            </h1>
            <p className="text-white/80 text-base leading-relaxed">
              A centralized platform for health facilities, patient management, and wellness tracking — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <Heart className="w-4 h-4" />
              Patient Care
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <Shield className="w-4 h-4" />
              Secure Data
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium">
              <Stethoscope className="w-4 h-4" />
              Facility Tools
            </div>
          </div>

          {/* Lottie Illustration */}
          <div className="w-full max-w-md h-auto">
            <Lottie
              animationData={medical_care}
              loop={true}
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-white/60 text-xs">
          © {new Date().getFullYear()} 4 Our Life. All rights reserved.
        </div>
      </div>
    </div>
  );
}
