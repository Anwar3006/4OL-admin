"use client";

import LoginForm from "../_components/LoginForm";
import Link from "next/link";
import Image from "next/image";
import Lottie from "lottie-react";
import medical_care from "@/public/assets/lottie/medical-care.json";
import { Heart, Shield, Stethoscope } from "lucide-react";

const LoginPage = () => {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:grid-cols-2 lg:overflow-hidden bg-white dark:bg-slate-800">
      
      {/* Left Column: Green Branding Panel */}
      <div className="relative hidden lg:flex flex-col bg-emerald-600 overflow-hidden p-12 2xl:p-24 justify-between">
        {/* Decorative circles - Scaled for 4K */}
        {/* Decorative circles stay white-translucent in BOTH themes — the panel
            is emerald-600 in light and dark, so the old dark:bg-slate-800/* made
            them dark-on-emerald (nearly invisible) in dark mode. */}
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
        <div className="relative z-10 flex flex-col gap-8 2xl:gap-14 [@media(max-height:820px)]:gap-5 max-w-md 2xl:max-w-2xl min-h-0">
          <div className="space-y-4 2xl:space-y-6">
            <h1 className="text-3xl font-bold text-white leading-tight">
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

          {/* Lottie Illustration — height-capped so it scales down (and hides on
              very short viewports) instead of overflowing the emerald panel,
              which justify-between + overflow-hidden used to clip. */}
          <div className="w-full max-w-md 2xl:max-w-2xl [@media(max-height:760px)]:hidden">
            <Lottie
              animationData={medical_care}
              loop={true}
              className="w-full h-auto max-h-[26vh] 2xl:max-h-[34vh] object-contain"
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-white/60 text-sm 2xl:text-lg">
          © 2026 4 Our Life. All rights reserved.
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex flex-col p-6 md:p-10 2xl:p-24 h-full overflow-y-auto bg-white dark:bg-slate-800">
        {/* Mobile-only logo */}
        <div className="flex items-center lg:hidden mb-8">
          <Link href="/login" className="flex items-center gap-3 transition-opacity hover:opacity-80">
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

        {/* Auto margins (m-auto) centre the form when there is room and, unlike
            items-center/justify-center, collapse to 0 when it is taller than the
            viewport so the top is never clipped — the column scrolls instead. */}
        <div className="flex flex-1 flex-col py-6">
          {/* Scaled the form container for 4K */}
          <div className="w-full max-w-sm 2xl:max-w-lg m-auto">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
