"use client";

import React from 'react';
import SectionHeader from "@/components/SectionHeader";
import { Calendar } from "lucide-react";
import PlaceholderPage from "@/components/PlaceholderPage";

const FitnessSchedulePage = () => {
  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <SectionHeader
        title="Training Schedule"
        Icon={Calendar}
        description="Coordinate trainer availability and class sessions"
      />
      <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
         <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-emerald-600" />
         </div>
         <div>
            <h2 className="text-xl font-bold text-slate-900">Master Schedule Coming Soon</h2>
            <p className="text-slate-400 max-w-sm mx-auto mt-2">
                We are building a robust scheduling engine to link trainers with participants in real-time.
            </p>
         </div>
      </div>
    </section>
  );
};

export default FitnessSchedulePage;
