import React from "react";
import TabPlaceholder from "@/components/redesign/TabPlaceholder";

export default function PendingHCPTab() {
  return (
    <TabPlaceholder
      icon="⏳"
      title="Pending Verification"
      description="HCP applications awaiting license and credential verification will queue here."
    />
  );
}
