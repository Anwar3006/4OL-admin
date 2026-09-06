"use client";

import type React from "react";

import useRtl from "@/hooks/useRtl";
import useDarkMode from "@/hooks/useDarkMode";
import useSkin from "@/hooks/useSkin";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [isRtl] = useRtl();
  const [isDark] = useDarkMode();
  const [skin] = useSkin();
  return (
    <>
      <div
        dir={isRtl ? "rtl" : "ltr"}
        className={`app-warp ${isDark ? "dark" : "light"} ${
          skin === "bordered" ? "skin--bordered" : "skin--default"
        }`}
      >
        {children}
      </div>
    </>
  );
}
