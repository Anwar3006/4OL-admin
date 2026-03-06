"use client";
import React from 'react';
import SectionHeader from "@/components/SectionHeader";
import { Activity } from "lucide-react";

const WorkoutsPage = () => {
  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title={"Workouts"}
        Icon={Activity}
        description="Manage healthy living workouts"
      />
      <div className="p-10 text-center text-muted-foreground">
        Workouts management coming soon...
      </div>
    </section>
  );
};

export default WorkoutsPage;
