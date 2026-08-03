"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import NewAdminDashboardShell from "./admin-shell/NewAdminDashboardShell";

export default function DashboardWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [isPending, setIsPending] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthed(Boolean(session));
      setIsPending(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session));
      setIsPending(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isPending && !isAuthed) {
      router.push("/login");
    }
  }, [isPending, isAuthed, router]);

  if (isPending || !isAuthed) return null;

  return <NewAdminDashboardShell>{children}</NewAdminDashboardShell>;
}
