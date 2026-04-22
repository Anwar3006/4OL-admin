"use client";

import React from "react";
import SectionHeader from "@/components/SectionHeader";
import { GitMerge } from "lucide-react";

const ReferralsPage = () => {
  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Referrals"
        Icon={GitMerge}
        description="Track and manage user and facility referrals"
      />
      <div className="p-10 text-center text-muted-foreground">
        Referrals module coming soon...
      </div>
    </section>
  );
};

export default ReferralsPage;
