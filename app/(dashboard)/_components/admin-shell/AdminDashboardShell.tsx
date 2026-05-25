
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Languages,
  Menu,
  MessageSquare,
  Search,
} from "lucide-react";
import { dashboardNavSections } from "./navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function TopIcon({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <div className="relative">
      <Button variant="outline" size="icon" className="h-9 w-9 rounded-[10px] border-slate-300 bg-[#f8fafc] text-slate-700">
        {children}
      </Button>
      {badge ? (
        <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold leading-4 text-white">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export default function AdminDashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const pageTitle = useMemo(() => {
    for (const section of dashboardNavSections) {
      for (const item of section.items) {
        if (isActivePath(pathname, item.href)) return item.title;
        if (item.children?.some((child) => isActivePath(pathname, child.href))) return item.title;
      }
    }
    return "Dashboard";
  }, [pathname]);

  const doLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#0f172a]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[210px] overflow-y-auto border-r border-emerald-900/40 bg-[#064e3b] px-2.5 py-3 text-white transition-transform duration-300",
          "[background-image:radial-gradient(rgba(255,255,255,0.07)_0.7px,transparent_0.7px)] [background-size:16px_16px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="mb-3 flex items-center gap-2 rounded-md bg-[#0b7f62] px-2 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#10b981] text-sm font-bold">🌿</div>
          <div>
            <p className="text-[18px] font-semibold leading-4">4 Our Life</p>
            <p className="mt-1 text-[10px] text-emerald-100">4OL Admin Panel v2.0</p>
          </div>
        </div>

        {dashboardNavSections.map((section) => (
          <div key={section.title} className="mb-3">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item.href) || item.children?.some((child) => isActivePath(pathname, child.href));
                const open = collapsedGroups[item.title] ?? active;
                const Icon = item.icon;

                if (item.title === "Logout") {
                  return (
                    <button key={item.title} onClick={doLogout} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[15px] text-emerald-50 transition hover:bg-white/10">
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">Logout</span>
                    </button>
                  );
                }

                return (
                  <div key={item.title}>
                    <div className={cn("flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[15px]", active ? "bg-[#059669] text-white" : "text-emerald-50 hover:bg-white/10")}>
                      <Link href={item.href} className="flex flex-1 items-center gap-2.5">
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                      {item.badge ? (
                        <Badge className={cn("rounded-full border-0 px-1.5 py-0 text-[10px] leading-4", item.badge === "LIVE" ? "bg-red-500 text-white" : "bg-emerald-400/25 text-emerald-50")}>
                          {item.badge}
                        </Badge>
                      ) : null}
                      {item.children ? (
                        <button onClick={() => setCollapsedGroups((prev) => ({ ...prev, [item.title]: !open }))}>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", open ? "rotate-0" : "-rotate-90")} />
                        </button>
                      ) : null}
                    </div>
                    {item.children && open ? (
                      <div className="mt-0.5 space-y-0.5 pl-7">
                        {item.children.map((child) => (
                          <Link key={child.href} href={child.href} className={cn("block rounded px-2 py-1 text-[12px]", isActivePath(pathname, child.href) ? "bg-white/20 text-white" : "text-emerald-100/90 hover:bg-white/10")}>
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      <div className="lg:pl-[210px]">
        <header className="sticky top-0 z-40 flex h-[58px] items-center justify-between border-b border-slate-300 bg-[#f3f4f6] px-3 lg:px-5">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-8 w-8 bg-white lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden items-center gap-1 text-slate-400 md:flex">
              <ChevronLeft className="h-4 w-4" />
              <ChevronRight className="h-4 w-4" />
            </div>
            <h1 className="text-[30px] font-semibold leading-none text-slate-900">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            <TopIcon><Search className="h-4 w-4" /></TopIcon>
            <TopIcon badge="3"><Bell className="h-4 w-4" /></TopIcon>
            <TopIcon badge="5"><MessageSquare className="h-4 w-4" /></TopIcon>
            <TopIcon badge="2"><Languages className="h-4 w-4" /></TopIcon>
            <div className="h-10 w-px bg-slate-300" />
            <div className="h-8 w-8 rounded-full bg-emerald-600 text-center text-xs font-semibold leading-8 text-white">FN</div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none">Francis N. Mensah</p>
              <p className="mt-1 text-[11px] text-emerald-700">Superadmin 4OL-000001</p>
            </div>
          </div>
        </header>

        <main className="p-3 lg:p-4">{children}</main>
      </div>

      {mobileOpen ? <button className="fixed inset-0 z-40 bg-black/45 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" /> : null}
    </div>
  );
}
