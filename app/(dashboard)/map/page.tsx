"use client";

import React, { useState } from "react";
import PageHeader from "@/components/redesign/PageHeader";
import GoogleMapContainer from "./_components/GoogleMapContainer";
import FilterDropdown from "./_components/FilterDropdown";

const MapPage = () => {
  const [filters, setFilters] = useState<{
    region: string | null;
    district: string | null;
    facilityType: string | null;
    status: string | null;
  }>({
    region: null,
    district: null,
    facilityType: null,
    status: null,
  });

  return (
    <div className="animate-in fade-in duration-500 h-[calc(100vh-100px)] flex flex-col space-y-4">
      <PageHeader
        title="🗺️ Global Health Map"
        subtitle="Geographic coverage · Facility distribution · Real-time data visualization"
      >
        <button className="btn btn-secondary">📥 Export Map Data</button>
        <button className="btn btn-primary">📍 Refresh View</button>
      </PageHeader>

      <div className="flex flex-wrap gap-4 items-end bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
         <FilterDropdown 
            label="Region" 
            value={filters.region} 
            options={["Greater Accra", "Ashanti", "Western"]} 
            onChange={(val) => setFilters(prev => ({...prev, region: val}))} 
         />
         <FilterDropdown 
            label="District" 
            value={filters.district} 
            options={["Accra Metro", "Kumasi Metro"]} 
            onChange={(val) => setFilters(prev => ({...prev, district: val}))} 
         />
         <FilterDropdown 
            label="Facility Type" 
            value={filters.facilityType} 
            options={["hospital", "clinic", "pharmacy"]} 
            onChange={(val) => setFilters(prev => ({...prev, facilityType: val}))} 
         />
         <FilterDropdown 
            label="Status" 
            value={filters.status} 
            options={["active", "pending", "suspended"]} 
            onChange={(val) => setFilters(prev => ({...prev, status: val}))} 
         />
      </div>

      <div className="flex-1 rounded-2xl border border-slate-200 overflow-hidden shadow-xl bg-white relative">
        <GoogleMapContainer filters={filters} />
      </div>
    </div>
  );
};

export default MapPage;
