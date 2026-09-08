"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ChevronDown, LogOut, User, Settings } from "lucide-react";
import { dashboardNavSections } from "./navigation";
import { cn } from "@/lib/utils";
import { getBrowserClient } from "@/lib/db/browser";
import { usePermissionContext } from "@/stores/permission-context";
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
import NotificationBell from "./NotificationBell";
import SupportMessagesButton from "./SupportMessagesButton";
import AlertsButton from "./AlertsButton";
import ThemeMenu from "./ThemeMenu";
import DensityMenu from "./DensityMenu";
import NavGlyph, { NAV_GLYPH } from "./NavGlyph";

interface NewAdminDashboardShellProps {
  children: React.ReactNode;
}

// Badge tone map — dark-sidebar-safe pill styles. Numeric counts have been
// removed from nav data entirely; only status/role badges remain.
const badgeToneClass: Record<string, string> = {
  LIVE: "bg-red-500 text-white",
  SA: "bg-white/15 dark:bg-slate-800/15 text-white border border-white/15",
  Fac: "bg-white/15 dark:bg-slate-800/15 text-white/90 border border-white/15",
};

export default function NewAdminDashboardShell({
  children,
}: NewAdminDashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasPermission } = usePermissionContext();

  // RBAC nav filtering: drop items/children the caller lacks a permission
  // for, then drop emptied sections. Items without a permission key (Logout,
  // Settings) stay visible for every authenticated admin.
  const navSections = useMemo(
    () =>
      dashboardNavSections
        .map((section) => ({
          ...section,
          items: section.items
            .filter((item) => !item.permission || hasPermission(item.permission))
            .map((item) =>
              item.children
                ? {
                    ...item,
                    children: item.children.filter(
                      (child) =>
                        hasPermission(child.permission ?? item.permission ?? ""),
                    ),
                  }
                : item,
            )
            .filter((item) => !item.children || item.children.length > 0),
        }))
        .filter((section) => section.items.length > 0),
    [hasPermission],
  );
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
      const supabase = getBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Explicit column list, not select("*"): the shell only needs the
        // identity chip fields, and the wildcard pulled whitelisted_ips,
        // notes, login_attempts and admin_permissions into the browser —
        // the same leak ProfileModal was rewritten to close.
        const { data } = await supabase
          .from("user_profiles")
          .select("first_name, last_name, role, public_id, avatar_url")
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
    navSections.forEach((section) => {
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
    for (const section of navSections) {
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
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isItemExpanded = (
    item: (typeof navSections)[0]["items"][0],
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
                  <div className="flex size-fit items-center justify-center rounded-full bg-white/10 dark:bg-slate-800/10">
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
            {navSections.map((section) => (
              <SidebarGroup key={section.title} className="py-2">
                <SidebarGroupLabel className="text-xs font-bold text-white/35 uppercase tracking-widest">
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
                              className="text-white/55 hover:bg-white/10 dark:hover:bg-slate-800/10 hover:text-white transition-colors font-medium text-xs"
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
                                "transition-colors font-medium text-xs",
                                active
                                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                                  : "text-white hover:bg-white/10 dark:hover:bg-slate-800/10 hover:text-white",
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
                                        "font-medium text-xs",
                                        isLinkActive(child.href)
                                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                                          : "text-white/50 hover:bg-white/10 dark:hover:bg-slate-800/10 hover:text-white",
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
                              "transition-colors font-medium text-xs",
                              active
                                ? "bg-white! text-black! shadow-sm hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                                : "text-white hover:bg-white/10 dark:hover:bg-slate-800/10 hover:text-white",
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
                                "rounded-full px-2 text-2xs font-bold uppercase tracking-wider",
                                badgeToneClass[item.badge] ??
                                  "bg-white/15 dark:bg-slate-800/15 text-white",
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
                      className="text-white hover:bg-white/10 dark:hover:bg-slate-800/10 data-[state=open]:bg-white/10 data-[state=open]:text-white"
                    >
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="bg-white/15 dark:bg-slate-800/15 text-white font-semibold text-xs rounded-lg">
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
              <nav className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <NavGlyph char={NAV_GLYPH.home} size={13} />
                <span className="text-muted-foreground/60">—</span>
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
                <NavGlyph
                  char={NAV_GLYPH.search}
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2"
                />
                <span className="pl-9 pr-12 text-sm text-muted-foreground truncate">
                  Search...
                </span>
                <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-2xs font-medium text-muted-foreground sm:flex">
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
                <NavGlyph char={NAV_GLYPH.search} />
              </Button>

              <div className="flex items-center gap-1">
                {/* Order matches the mockup topbar: 🔔 🚨 💬 ☰, then the
                    dark-mode control the mockup has no equivalent for. Each
                    owns its own data/state (see the component headers). */}
                <NotificationBell />
                <SupportMessagesButton />
                <AlertsButton />
                <DensityMenu />
                <ThemeMenu />
              </div>

              <Separator
                orientation="vertical"
                className="mx-1 h-6 hidden sm:block"
              />

              {/* Identity chip — the mockup's tb-user. Opens the profile /
                  access / security modal; the sidebar footer dropdown opens
                  the same modal so both entry points stay in sync. */}
              <button
                type="button"
                aria-label="Open admin profile, access and security"
                title="Profile, access & security"
                className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-3"
                onClick={() => setProfileOpen(true)}
              >
                <Avatar className="size-8 cursor-pointer">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden min-w-0 flex-col items-start leading-tight sm:flex">
                  <span className="max-w-[140px] truncate text-xs font-semibold">
                    {profile?.name || "Admin"}
                  </span>
                  <span className="max-w-[140px] truncate text-2xs capitalize text-muted-foreground">
                    {(profile?.role ?? "administrator").replace(/_/g, " ")}
                    {profile?.public_id ? ` · ${profile.public_id}` : ""}
                  </span>
                </span>
                <NavGlyph
                  char={NAV_GLYPH.caret}
                  size={10}
                  className="hidden text-muted-foreground sm:inline-block"
                />
              </button>
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
