"use client";

import React from "react";
import IbpListTab from "./IbpListTab";

export default function SuspendedIbpsTab() {
  return (
    <IbpListTab
      status="suspended"
      paginationKey="ibp_suspended_page"
      emptyLabel="No suspended businesses. 🎉"
      showSuspension
      banner={
        <div className="alert al-ic flex items-start gap-3">
          <span>⏸️</span>
          <div className="text-[11px] leading-relaxed">
            <strong>Suspended businesses</strong> are hidden from the mobile app.
            Reinstate to republish, or remove permanently via the row menu.
          </div>
        </div>
      }
    />
  );
}
