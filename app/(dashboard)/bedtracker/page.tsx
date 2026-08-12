"use client";

import OperationsModuleDashboard from "../_components/operations-module-dashboard";

const tabs = [
  { id: "overview", label: "Live Overview" },
  { id: "registry", label: "Bed Registry" },
  { id: "facilities", label: "Facilities" },
  { id: "dispatch", label: "Ambulance Dispatch" },
  { id: "analytics", label: "Analytics" },
  { id: "strategy", label: "Design & Strategy" },
];

export default function BedTrackerPage() {
  return (
    <OperationsModuleDashboard
      module="bedtracker"
      title="BedTracker (PKM)"
      subtitle="Live bed availability, emergency routing, and ambulance dispatch"
      basePath="/bedtracker"
      tabs={tabs}
    />
  );
}
