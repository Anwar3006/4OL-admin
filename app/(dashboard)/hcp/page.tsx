"use client";

import OperationsModuleDashboard from "../_components/operations-module-dashboard";

const tabs = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "chats", label: "Group Chats" },
];

export default function HCPPage() {
  return (
    <OperationsModuleDashboard
      module="hcp"
      title="Healthcare Professionals"
      subtitle="HCP registry, licensing verification, and professional group chats"
      basePath="/hcp"
      tabs={tabs}
    />
  );
}
