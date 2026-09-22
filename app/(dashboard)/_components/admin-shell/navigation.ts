import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Dumbbell,
  HeartPulse,
  Home,
  LayoutGrid,
  Lock,
  Map,
  Megaphone,
  MessageSquare,
  Pill,
  Search,
  Settings,
  Shield,
  Star,
  Trash2,
  UserCog,
  Users,
  UserSquare2,
  Workflow,
} from "lucide-react";

export type DashboardNavChild = {
  title: string;
  href: string;
  /** Permission key; when omitted the parent item's permission applies. */
  permission?: string;
};

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: string; // Emoji string
  badge?: string;
  /**
   * Permission key required to see (and reach) this item. Omitted items
   * (Logout, Settings) are always visible to any authenticated admin.
   * The sidebar filters on this; the API enforces the same keys.
   */
  permission?: string;
  children?: DashboardNavChild[];
};

export type DashboardNavSection = {
  title: string;
  items: DashboardNavItem[];
};

export const dashboardNavSections: DashboardNavSection[] = [
  {
    title: "Core",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: "🏠", permission: "dashboard.view" },
      {
        // Flat, no children: /transactions already renders these seven as
        // page tabs (recent/service-charge/subscriptions/failed/refunds/
        // tax-vat/expenses), so the sidebar sub-nav duplicated the same
        // destinations one level up.
        title: "Transactions",
        href: "/transactions",
        icon: "💳",
        permission: "transactions.view",
      },
      {
        title: "Subscriptions",
        href: "/subscriptions",
        icon: "🎟️",
        permission: "subscriptions.view",
      },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Admins", href: "/admins", icon: "👥", permission: "admins.view" },
      { title: "Users", href: "/users", icon: "👤", permission: "users.view" },
      { title: "Task Manager", href: "/tasks", icon: "📋", permission: "tasks.view" },
      {
        // Flat, no children: /reports already renders these as page tabs
        // (inbox/schedules/recipients/runs), so the sidebar sub-nav
        // duplicated the same destinations one level up.
        title: "Reports",
        href: "/reports",
        icon: "📊",
        permission: "reports.view",
      },
    ],
  },
  {
    title: "Health Services",
    items: [
      { title: "Facilities", href: "/facilities", icon: "🏥", permission: "facilities.view" },
      { title: "Diseases & Conditions", href: "/diseases", icon: "🦠", permission: "diseases.view" },
      { title: "Human Anatomy", href: "/anatomy", icon: "🫁", permission: "anatomy.view" },
      { title: "Symptoms", href: "/symptoms", icon: "🩺", permission: "symptoms.view" },
      { title: "Healthy Living", href: "/healthy-living", icon: "🥗", permission: "healthyliving.view" },
      { title: "Fitness", href: "/fitness", icon: "💪", permission: "fitness.view" },
      { title: "Period Tracker", href: "/period", icon: "📅", permission: "period.view" },
      { title: "Medication Reminder", href: "/medication-reminder", icon: "💊", permission: "medication.view" },
      {
        title: "Healthcare Professionals",
        href: "/hcp",
        icon: "🧑‍⚕️",
        permission: "hcp.view",
      },
      {
        title: "Jobs",
        href: "/jobs",
        icon: "💼",
        permission: "jobs.view",
      },
      {
        // Flat, no children: /medenquiry already renders these six as page
        // tabs (all/pending/escrow/delivery/pharmacies/disputes), so the
        // sidebar sub-nav duplicated the same six destinations one level up.
        title: "Medication Enquiry",
        href: "/medenquiry",
        icon: "🔬",
        permission: "medenquiry.view",
      },
      {
        title: "BedTracker (PKM)",
        href: "/bed-tracker",
        icon: "🛏️",
        badge: "LIVE",
        permission: "bedtracker.view",
      },
      { title: "Top Rated", href: "/top-rated", icon: "🏆", permission: "reviews.view" },
    ],
  },
  {
    title: "Engagement",
    items: [
      {
        title: "Rewards",
        href: "/rewards",
        icon: "🎁",
        permission: "rewards.view",
      },
      {
        title: "Reviews & Ratings",
        href: "/reviews",
        icon: "⭐",
        permission: "reviews.view",
      },
      { title: "Map", href: "/map", icon: "🗺️", permission: "facilities.view" },
    ],
  },
  {
    title: "Growth",
    items: [
      { title: "Marketing", href: "/marketing", icon: "📣", permission: "marketing.view" },
      {
        title: "Chats",
        href: "/chats",
        icon: "💬",
        permission: "chats.view",
      },
      {
        title: "FacilityScout",
        href: "/facility-scout",
        icon: "🔍",
        permission: "facilityscout.view",
      },
      {
        // Registrar-only in practice: registrar's ROLE_DEFAULTS grants only
        // facilityscout.assignments, not facilityscout.view, so this and
        // the item above are mutually exclusive per role today.
        title: "My Field Work",
        href: "/my-field-work",
        icon: "🧭",
        permission: "facilityscout.assignments",
      },
      { title: "FAQ", href: "/faq", icon: "❓", permission: "faq.view" },
      {
        title: "Notifications",
        href: "/notifications",
        icon: "🔔",
        permission: "notifications.view",
      },
      {
        title: "Devices",
        href: "/notifications/devices",
        icon: "📱",
        permission: "notifications.view",
      },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      {
        // Flat, no children — /ai already renders these four as page tabs
        // (models/moderation/recommendations/analytics). Same rationale as
        // Medication Enquiry above.
        title: "AI Hub",
        href: "/ai",
        icon: "🤖",
        permission: "ai.view",
      },
    ],
  },
  {
    title: "Platform",
    items: [
      { title: "Security Center", href: "/security", icon: "🔐", permission: "security.view" },
      // Gap Analysis Part U: hidden by default — devops.view is granted to no
      // role in ROLE_DEFAULTS, so only super_admin sees this entry.
      { title: "DevOps", href: "/devops", icon: "🖥️", permission: "devops.view" },
      // Gap Analysis Part Y: super_admin-only. schematic.view is granted to no
      // role in ROLE_DEFAULTS, so only super_admin sees this entry (mirrors the
      // mockup's Platform Schematic matrix, which is Super Admin only).
      { title: "Platform Schematic", href: "/schematic", icon: "🗂️", permission: "schematic.view" },
      { title: "Settings", href: "/settings", icon: "⚙️" },
      {
        // Flat, no children: /delete-account-request already renders these
        // five as page tabs (all/pending/grace/completed/settings), so the
        // sidebar sub-nav duplicated the same destinations one level up.
        title: "Delete Account Requests",
        href: "/delete-account-request",
        icon: "🗑️",
        permission: "deleteaccount.view",
      },
      { title: "Logout", href: "/logout", icon: "🚪" },
    ],
  },
];
