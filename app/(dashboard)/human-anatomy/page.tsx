"use client";
import React from 'react';
import SectionHeader from "@/components/SectionHeader";
import { Accessibility } from "lucide-react";

const HumanAnatomyPage = () => {
  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Human Anatomy"
        Icon={Accessibility}
        description="Explore the human body and anatomy"
      />
      <div className="p-10 text-center text-muted-foreground">
        Human Anatomy exploration coming soon...
      </div>
    </section>
  );
};

export default HumanAnatomyPage;
