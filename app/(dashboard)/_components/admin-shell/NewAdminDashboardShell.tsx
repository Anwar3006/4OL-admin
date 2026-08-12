"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  MessageSquare,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { dashboardNavSections } from "./navigation";
import { cn } from "@/lib/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileModal from "@/components/redesign/modals/ProfileModal";
import AdminSearchDialog from "./AdminSearchDialog";

interface NewAdminDashboardShellProps {
  children: React.ReactNode;
}

// Badge tone map — dark-sidebar-safe pill styles. Numeric counts have been
// removed from nav data entirely; only status/role badges remain.
const badgeToneClass: Record<string, string> = {
  LIVE: "bg-red-500 text-white",
  SA: "bg-white/15 text-white border border-white/15",
  Fac: "bg-white/15 text-white/90 border border-white/15",
};

export default function NewAdminDashboardShell({
  children,
}: NewAdminDashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [profile, setProfile] = useState<any>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Detect platform client-side only, to avoid SSR/client markup mismatch
  useEffect(() => {
    setIsMac(
      /Mac|iPod|iPhone|iPad/.test(
        window.navigator.platform ?? navigator.userAgent,
      ),
    );
  }, []);

  // Global ⌘K (Mac) / Ctrl+K (Windows, Linux) shortcut to open app-wide search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch user profile from Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setProfile({
            ...data,
            name: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
          });
        }
      }
    };
    fetchProfile();
  }, []);

  // Initialize expanded items
  useEffect(() => {
    const initial: Record<string, boolean> = {};
    dashboardNavSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some((c) => {
            const [path] = c.href.split("?");
            return pathname === path || pathname.startsWith(`${path}/`);
          });
          if (hasActiveChild) initial[item.title] = true;
        }
      });
    });
    setExpandedItems(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLinkActive = (href: string) => {
    if (!href) return false;
    const [path, query] = href.split("?");
    if (pathname !== path) return false;
    if (!query) return true;
    const params = new URLSearchParams(query);
    let allMatch = true;
    params.forEach((value, key) => {
      if (searchParams.get(key) !== value) allMatch = false;
    });
    return allMatch;
  };

  const isActivePath = (href: string) => {
    if (!href) return false;
    const [path] = href.split("?");
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const pageTitle = useMemo(() => {
    for (const section of dashboardNavSections) {
      for (const item of section.items) {
        if (isActivePath(item.href)) return item.title;
        if (item.children?.some((child) => isActivePath(child.href)))
          return item.title;
      }
    }
    return "Dashboard";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleItem = (title: string) => {
    setExpandedItems((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isItemExpanded = (
    item: (typeof dashboardNavSections)[0]["items"][0],
  ) => {
    if (!item.children) return false;
    const hasActiveChild = item.children.some((c) => isLinkActive(c.href));
    return expandedItems[item.title] ?? hasActiveChild;
  };

  const getInitials = () => {
    if (!profile?.name) return "U";
    return profile.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <>
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      <AdminSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      <SidebarProvider className="min-h-svh">
        {/* ── Sidebar: solid emerald panel, flush top-to-bottom ── */}
        <Sidebar collapsible="icon" className="border-sidebar-border">
          {/* ── Header: Logo ── */}
          <SidebarHeader className="border-b border-sidebar-border pb-4 pt-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="4 Our Life"
                  className="hover:bg-transparent cursor-default text-sidebar-foreground"
                >
                  <div className="flex size-fit items-center justify-center rounded-full bg-white/10">
                    <Image
                      src="/assets/images/all-img/logo.png"
                      alt="4 Our Life"
                      width={32}
                      height={32}
                      className="w-8 h-8 object-contain rounded-full"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold tracking-tight text-white">
                      4 Our Life
                    </span>
                    <span className="truncate text-xs text-white/50">
                      Admin Panel
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          {/* ── Content: Navigation ── */}
          <SidebarContent className="pt-2 px-2">
            {dashboardNavSections.map((section) => (
              <SidebarGroup key={section.title} className="py-2">
                <SidebarGroupLabel className="text-[11px] font-bold text-white/35 uppercase tracking-widest">
                  {section.title}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-0.1">
                    {section.items.map((item) => {
                      const hasChildren =
                        item.children && item.children.length > 0;
                      const active =
                        isLinkActive(item.href) ||
                        (hasChildren &&
                          item.children!.some((c) => isLinkActive(c.href)));
                      const isExpanded = isItemExpanded(item);

                      if (item.title === "Logout") {
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              onClick={handleLogout}
                              tooltip="Logout"
                              className="text-white/55 hover:bg-white/10 hover:text-white transition-colors font-medium text-[11px]"
                            >
                              <span className="flex items-center justify-center">
                                {item.icon}
                              </span>
                              <span className="truncate">Logout</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      }

                      if (hasChildren) {
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              onClick={() => toggleItem(item.title)}
                              isActive={active}
                              tooltip={item.title}
                              className={cn(
                                "transition-colors font-medium text-[11px]",
                                active
                                  ? "bg-white text-slate-900 shadow-sm hover:bg-white hover:text-slate-900"
                                  : "text-white hover:bg-white/10 hover:text-white",
                              )}
                            >
                              <span className="flex items-center justify-center">
                                {item.icon}
                              </span>
                              <span className="truncate">{item.title}</span>
                              <ChevronRight
                                className={cn(
                                  "ml-auto size-4 transition-transform duration-200",
                                  active ? "text-black" : "text-white",
                                  isExpanded && "rotate-90",
                                )}
                              />
                            </SidebarMenuButton>

                            {isExpanded && (
                              <SidebarMenuSub className="border-l border-sidebar-border ml-4 pl-2 mt-1 gap-0.5">
                                {item.children!.map((child) => (
                                  <SidebarMenuSubItem key={child.href}>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={isLinkActive(child.href)}
                                      className={cn(
                                        "font-medium text-[11px]",
                                        isLinkActive(child.href)
                                          ? "bg-white text-slate-900 shadow-sm hover:bg-white hover:text-slate-900"
                                          : "text-white/50 hover:bg-white/10 hover:text-white",
                                      )}
                                    >
                                      <Link href={child.href}>
                                        <span>{child.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            )}
                          </SidebarMenuItem>
                        );
                      }

                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={item.title}
                            className={cn(
                              "transition-colors font-medium text-[11px]",
                              active
                                ? "bg-white! text-black! shadow-sm hover:bg-white hover:text-slate-900"
                                : "text-white hover:bg-white/10 hover:text-white",
                            )}
                          >
                            <Link href={item.href}>
                              <span className="flex items-center justify-center">
                                {item.icon}
                              </span>
                              <span className="truncate">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                          {item.badge && (
                            <SidebarMenuBadge
                              className={cn(
                                "rounded-full px-2 text-[10px] font-bold uppercase tracking-wider",
                                badgeToneClass[item.badge] ??
                                  "bg-white/15 text-white",
                              )}
                            >
                              {item.badge}
                            </SidebarMenuBadge>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          {/* ── Footer: User Profile ── */}
          <SidebarFooter className="border-t border-sidebar-border p-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="text-white hover:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:text-white"
                    >
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="bg-white/15 text-white font-semibold text-xs rounded-lg">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold text-white">
                          {profile?.name || "Loading..."}
                        </span>
                        <span className="truncate text-xs text-white/50">
                          {profile?.role || "Administrator"}
                        </span>
                      </div>
                      <ChevronDown className="ml-auto size-4 text-white/50" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    side="top"
                    align="start"
                    className="w-[240px] rounded-xl"
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="size-8 rounded-lg">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs rounded-lg">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">
                            {profile?.name || "Admin"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {profile?.role || "Administrator"}
                          </span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => setProfileOpen(true)}
                        className="cursor-pointer"
                      >
                        <User className="mr-2 size-4 text-muted-foreground" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/settings")}
                        className="cursor-pointer"
                      >
                        <Settings className="mr-2 size-4 text-muted-foreground" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 size-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main Content Area ── */}
        <SidebarInset className="bg-background min-h-svh min-w-0 max-w-[3800px]!">
          {/* Sticky Header */}
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 sm:px-6 2xl:px-10 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mx-2 h-4" />
              <nav className="flex items-center text-sm font-medium text-muted-foreground">
                <span className="text-foreground font-semibold tracking-tight">
                  {pageTitle}
                </span>
              </nav>
            </div>

            {/* Right side actions */}
            <div className="ml-auto flex items-center gap-4">
              {/* Search */}
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="relative hidden lg:flex items-center h-9 w-64 2xl:w-80 5xl:w-96 rounded-md bg-muted/50 border border-transparent hover:bg-muted transition-colors text-left"
              >
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <span className="pl-9 pr-12 text-sm text-muted-foreground truncate">
                  Search...
                </span>
                <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                  {isMac ? "⌘K" : "Ctrl K"}
                </kbd>
              </button>

              {/* Mobile Search */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-muted-foreground"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="size-4" />
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                >
                  <Bell className="size-4" />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-destructive" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground hover:text-foreground"
                >
                  <MessageSquare className="size-4" />
                  <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
                </Button>
              </div>

              <Separator
                orientation="vertical"
                className="mx-1 h-6 hidden sm:block"
              />

              <Avatar className="size-8 cursor-pointer border border-border">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 w-full p-4 sm:p-6 xl:p-8 2xl:p-10 min-w-0 max-w-[3800px]!">
            <div className="mx-auto w-full max-w-[3800px] animate-in fade-in-50 duration-500">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
