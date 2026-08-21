"use client";

import React from "react";
import IbpListTab from "./IbpListTab";

export default function ActiveIbpsTab() {
  return (
    <IbpListTab
      status="active,approved"
      paginationKey="ibp_active_page"
      emptyLabel="No active IBP businesses yet."
    />
  );
}
