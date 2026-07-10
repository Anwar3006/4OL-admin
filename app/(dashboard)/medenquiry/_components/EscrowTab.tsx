import React from "react";
import TabPlaceholder from "@/components/redesign/TabPlaceholder";

export default function EscrowTab() {
  return (
    <TabPlaceholder
      icon="🔒"
      title="Escrow"
      description="Payments held in escrow pending fulfillment confirmation will be tracked here."
    />
  );
}
