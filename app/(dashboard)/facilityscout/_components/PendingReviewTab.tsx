import React from "react";
import TabPlaceholder from "@/components/redesign/TabPlaceholder";

export default function PendingReviewTab() {
  return (
    <TabPlaceholder
      icon="⏳"
      title="Pending Review"
      description="Submissions awaiting admin verification before being published will queue here."
    />
  );
}
