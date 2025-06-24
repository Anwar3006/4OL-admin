"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import UsersListing from "@/components/partials/auth/Users/UsersListing";

export default function page() {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="relative mt-5">
        <UsersListing />
      </div>
    </>
  );
}
