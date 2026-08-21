import { TMarketingProfileOutput } from "@/schemas/marketing-profile.schema";
import { JSX } from "react";

export const MarketingStatusMap: Record<
  TMarketingProfileOutput["status"],
  JSX.Element
> = {
  draft: (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
      Draft
    </span>
  ),
  scheduled: (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
      Scheduled
    </span>
  ),

  paused: (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
      Paused
    </span>
  ),
  live: (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
      Live
    </span>
  ),
  ended: (
    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      Ended
    </span>
  ),
  pending_review: (
    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
      Pending Review
    </span>
  ),
  rejected: (
    <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
      Rejected
    </span>
  ),
};
