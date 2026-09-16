"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AiJobContextType {
  runningJobTypes: Set<string>;
  startJob: (input: {
    body: Record<string, unknown>;
    label: string;
    reviewPath: string;
  }) => Promise<void>;
}

const AiJobContext = createContext<AiJobContextType | undefined>(undefined);

// Mounted at the dashboard layout level (above per-page route content) so
// an in-flight generation request and its toast-on-completion survive the
// admin navigating away from /ai-hub/period to work on something else --
// the fetch() promise and its .then()/.catch() live here, not inside the
// page component that kicked it off, so unmounting that page has no effect
// on it.
export const AiJobProviderClient = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const [runningJobTypes, setRunningJobTypes] = useState<Set<string>>(new Set());

  const startJob = useCallback(
    async ({
      body,
      label,
      reviewPath,
    }: {
      body: Record<string, unknown>;
      label: string;
      reviewPath: string;
    }) => {
      const key = String(body.jobType ?? label);
      setRunningJobTypes((prev) => new Set(prev).add(key));
      toast.info(`${label} generation started`, {
        description: "Feel free to work elsewhere — we'll let you know when it's ready.",
      });
      try {
        const response = await fetch("/api/ai-hub/period", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(typeof result.error === "string" ? result.error : "Generation failed");
        }
        toast.success(`${label} ready for review`, {
          description: `${result.itemCount} item${result.itemCount === 1 ? "" : "s"} generated.`,
          action: {
            label: "Review now",
            onClick: () => {
              // Two reasons this is not just router.push():
              //
              // 1. push() to the route you are already on is a no-op in the
              //    App Router, so the drafts the job had just produced stayed
              //    invisible until the admin refreshed by hand.
              // 2. router.refresh() would not help either -- the Period screen
              //    fetches its rows client-side in loadData(), and refresh()
              //    only re-runs Server Components.
              //
              // So: navigate when elsewhere, hard-reload when already there.
              // Location is read at click time rather than via usePathname /
              // useSearchParams because this provider sits in the dashboard
              // layout, where useSearchParams would force a Suspense boundary
              // on everything beneath it.
              //
              // The tab matters as well as the path: /period?tab=content and
              // /period?tab=trivia are different destinations behind one
              // pathname.
              const [targetPath, targetQuery = ""] = reviewPath.split("?");
              const targetTab = new URLSearchParams(targetQuery).get("tab");
              const here = new URL(window.location.href);
              const onTargetPage =
                here.pathname === targetPath &&
                (!targetTab || here.searchParams.get("tab") === targetTab);
              if (onTargetPage) window.location.reload();
              else router.push(reviewPath);
            },
          },
          duration: 15000,
        });
      } catch (cause) {
        toast.error(`${label} generation failed`, {
          description: cause instanceof Error ? cause.message : "Unknown error",
        });
      } finally {
        setRunningJobTypes((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [router],
  );

  return (
    <AiJobContext.Provider value={{ runningJobTypes, startJob }}>
      {children}
    </AiJobContext.Provider>
  );
};

export const useAiJobContext = () => {
  const context = useContext(AiJobContext);
  if (context === undefined) {
    throw new Error("useAiJobContext must be used within an AiJobProviderClient");
  }
  return context;
};
