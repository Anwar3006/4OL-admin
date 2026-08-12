"use client";

import OperationsModuleDashboard from "../_components/operations-module-dashboard";

const tabs = [
  { id: "all", label: "All Submissions" },
  { id: "pending", label: "Pending Review" },
  { id: "rewards", label: "Rewards Queue" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "settings", label: "Settings" },
];

export default function FacilityScoutPage() {
  return (
    <OperationsModuleDashboard
      module="facilityscout"
      title="FacilityScout"
      subtitle="Crowdsourced facility data, verification queues, and reward management"
      basePath="/facilityscout"
      tabs={tabs}
    />
  );
}
