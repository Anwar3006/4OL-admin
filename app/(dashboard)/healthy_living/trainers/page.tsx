"use client";
import React from 'react';
import SectionHeader from "@/components/SectionHeader";
import { Dumbbell } from "lucide-react";

const TrainersPage = () => {
  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Trainers"
        Icon={Dumbbell}
        description="Manage healthy living trainers"
      />
      <div className="p-10 text-center text-muted-foreground">
        Trainers management coming soon...
      </div>
    </section>
  );
};

export default TrainersPage;
