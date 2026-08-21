"use client";

// Gap Analysis Part H (H-D1/H-Phase 5): the legacy Top Rated page was
// replaced by the Top Rated tab on /facilities. This redirect keeps old
// bookmarks working.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyTopRatedRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/facilities?tab=top-rated");
  }, [router]);
  return null;
}
