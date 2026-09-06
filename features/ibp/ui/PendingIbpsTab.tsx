"use client";

import React from "react";
import IbpListTab from "./IbpListTab";

export default function PendingIbpsTab() {
  return (
    <IbpListTab
      status="pending"
      paginationKey="ibp_pending_page"
      emptyLabel="No businesses awaiting verification. 🎉"
      showDocs
      quickVerify
      banner={
        <div className="alert al-ic flex items-start gap-3">
          <span>🕵️</span>
          <div className="text-[11px] leading-relaxed">
            <strong>Verification queue.</strong> Check RGD/TIN documents before
            publishing — verified IBPs become searchable in the mobile app
            immediately.
          </div>
        </div>
      }
    />
  );
}
