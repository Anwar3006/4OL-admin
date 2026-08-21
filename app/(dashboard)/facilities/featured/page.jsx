"use client";

// Gap Analysis Part H (H-D1/H-Phase 5): the legacy Featured page was
// replaced by the Featured tab on /facilities. This redirect keeps old
// bookmarks working.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyFeaturedRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/facilities?tab=featured");
  }, [router]);
  return null;
}
