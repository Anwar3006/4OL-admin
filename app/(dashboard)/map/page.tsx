"use client";

import SectionHeader from "@/components/SectionHeader";
import { Map } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import GoogleMapContainer from "./_components/GoogleMapContainer";
import FilterDropdown from "./_components/FilterDropdown";
import BusinessPinsToggle from "./_components/BusinessPinsToggle";

// Import the JSON data
import locationData from "@/constant/ghana-locations.json";

const MapPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize state from URL
  const [selectedRegion, setSelectedRegion] = useState(
    searchParams.get("region") || "",
  );
  const [selectedDistrict, setSelectedDistrict] = useState(
    searchParams.get("district") || "",
  );
  const [selectedFacilityType, setSelectedFacilityType] = useState(
    searchParams.get("facilityType") || "",
  );
  const [selectedStatus, setSelectedStatus] = useState(
    searchParams.get("status") || "",
  );
  const [selectedFootprint, setSelectedFootprint] = useState(
    searchParams.get("footprint") || "",
  );
  const [showBusinessPins, setShowBusinessPins] = useState(
    searchParams.get("businessPins") !== "false",
  );

  // Get available regions from the JSON keys
  const regions = useMemo(() => Object.keys(locationData), []);

  // Get districts based on selected region
  const availableDistricts = useMemo(() => {
    if (!selectedRegion) return [];
    return locationData[selectedRegion as keyof typeof locationData] || [];
  }, [selectedRegion]);

  // AUTO-POPULATION LOGIC: Reset district when region changes
  useEffect(() => {
    if (selectedRegion) {
      // If the current district isn't in the new region's list, reset it
      if (!availableDistricts.includes(selectedDistrict)) {
        setSelectedDistrict("");
      }
    } else {
      setSelectedDistrict("");
    }
  }, [selectedRegion, availableDistricts, selectedDistrict]);

  const facilityTypes = ["Hospital", "Clinic", "Pharmacy", "Wellness Center"];
  const statuses = ["Approved", "Pending"];
  const footprints = ["Small", "Medium", "Large"];

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedRegion) params.set("region", selectedRegion);
    if (selectedDistrict) params.set("district", selectedDistrict);
    if (selectedFacilityType) params.set("facilityType", selectedFacilityType);
    if (selectedStatus) params.set("status", selectedStatus);
    if (selectedFootprint) params.set("footprint", selectedFootprint);
    if (!showBusinessPins) params.set("businessPins", "false");

    const queryString = params.toString();
    router.replace(queryString ? `?${queryString}` : "/map", { scroll: false });
  }, [
    selectedRegion,
    selectedDistrict,
    selectedFacilityType,
    selectedStatus,
    selectedFootprint,
    showBusinessPins,
    router,
  ]);

  return (
    <section className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-4 lg:pt-2 max-w-[2400px] h-[calc(100dvh-5.5rem)] flex flex-col overflow-hidden bg-white shadow-sm mt-2 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <SectionHeader
          title="Map View"
          Icon={Map}
          description="Track facilities and admins"
          hasButton={false}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 xl:grid-cols-6 gap-4">
        <FilterDropdown
          label="Region"
          value={selectedRegion}
          options={regions}
          onChange={setSelectedRegion}
        />

        <FilterDropdown
          label="District"
          value={selectedDistrict}
          options={availableDistricts} // Now dynamically populated
          // disabled={!selectedRegion} // Optional: disable if no region selected
          onChange={setSelectedDistrict}
        />

        <FilterDropdown
          label="Facility Type"
          value={selectedFacilityType}
          options={facilityTypes}
          onChange={setSelectedFacilityType}
        />

        <FilterDropdown
          label="Status"
          value={selectedStatus}
          options={statuses}
          onChange={setSelectedStatus}
        />

        <FilterDropdown
          label="Footprint"
          value={selectedFootprint}
          options={footprints}
          onChange={setSelectedFootprint}
        />

        <div className="w-fit flex items-end">
          <BusinessPinsToggle
            enabled={showBusinessPins}
            onToggle={setShowBusinessPins}
          />
        </div>
      </div>

      <div className="flex-1 h-[800px]">
        <GoogleMapContainer
          filters={{
            region: selectedRegion,
            district: selectedDistrict,
            facilityType: selectedFacilityType,
            status: selectedStatus,
            footprint: selectedFootprint,
            showBusinessPins,
          }}
        />
      </div>
    </section>
  );
};

export default MapPage;
