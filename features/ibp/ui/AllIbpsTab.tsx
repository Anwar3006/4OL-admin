"use client";

import React from "react";
import IbpListTab from "./IbpListTab";

export default function AllIbpsTab() {
  return (
    <IbpListTab
      paginationKey="ibp_all_page"
      emptyLabel="No IBP businesses registered yet."
    />
  );
}
