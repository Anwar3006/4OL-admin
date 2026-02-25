import { JSX } from "react";

export type FacilityStatus = "pending" | "active" | "inactive" | "rejected";

export const StatusMap: Record<FacilityStatus, JSX.Element> = {
  pending: (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
      Pending
    </span>
  ),
  active: (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
      Active
    </span>
  ),
  inactive: (
    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
      Inactive
    </span>
  ),
  rejected: (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      Rejected
    </span>
  ),
};
