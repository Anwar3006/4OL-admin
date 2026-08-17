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
        title: "Transactions",
        href: "/transactions",
        icon: "💳",
        permission: "transactions.view",
        children: [
          { title: "Recent Transactions", href: "/transactions?tab=recent" },
          {
            title: "Service Charge %",
            href: "/transactions?tab=service-charge",
          },
          { title: "Subscriptions", href: "/transactions?tab=subscriptions" },
          { title: "Failed", href: "/transactions?tab=failed" },
          { title: "Refunds", href: "/transactions?tab=refunds" },
          { title: "Tax & VAT", href: "/transactions?tab=tax-vat" },
          { title: "Expenses", href: "/transactions?tab=expenses" },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Admins", href: "/admins", icon: "👥", permission: "admins.view" },
      {
        title: "Roles & Permissions",
        href: "/admins?tab=roles",
        icon: "🛡️",
        permission: "roles.view",
      },
      { title: "Users", href: "/users", icon: "👤", permission: "users.view" },
      { title: "IBP Businesses", href: "/ibp", icon: "🏢", permission: "ibp.view" },
      { title: "Task Manager", href: "/tasks", icon: "📋", permission: "tasks.view" },
    ],
  },
  {
    title: "Health Services",
    items: [
      { title: "Facilities", href: "/facilities", icon: "🏥", permission: "facilities.view" },
      { title: "Diseases & Conditions", href: "/diseases", icon: "🦠", permission: "diseases.view" },
      { title: "Human Anatomy", href: "/anatomy", icon: "🫁", permission: "anatomy.view" },
      { title: "Symptoms", href: "/symptoms", icon: "🩺", permission: "symptoms.view" },
      { title: "Healthy Living", href: "/healthy_living", icon: "🥗", permission: "healthyliving.view" },
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
        title: "Medication Enquiry",
        href: "/medenquiry",
        icon: "🔬",
        permission: "medication.view",
      },
      {
        title: "BedTracker (PKM)",
        href: "/bedtracker",
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
        href: "/facilityscout",
        icon: "🔍",
        permission: "facilityscout.view",
      },
      { title: "FAQ", href: "/faq", icon: "❓", permission: "faq.view" },
      {
        title: "Notifications",
        href: "/notifications",
        icon: "🔔",
        permission: "notifications.view",
      },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      {
        title: "AI Hub",
        href: "/ai",
        icon: "🤖",
        permission: "ai.view",
        children: [
          { title: "AI Models", href: "/ai?tab=models" },
          { title: "AI Moderation", href: "/ai?tab=moderation" },
          { title: "Recommendations", href: "/ai?tab=recommendations" },
          { title: "AI Analytics", href: "/ai?tab=analytics" },
        ],
      },
    ],
  },
  {
    title: "Platform",
    items: [
      { title: "Security Center", href: "/security", icon: "🔐", permission: "security.view" },
      { title: "Platform Schematic", href: "/schematic", icon: "🗂️", permission: "dashboard.view" },
      { title: "Settings", href: "/settings", icon: "⚙️" },
      {
        title: "Delete Account Requests",
        href: "/delete-account-request",
        icon: "🗑️",
        permission: "deleteaccount.view",
        children: [
          { title: "All Requests", href: "/delete-account-request?tab=all" },
          {
            title: "Pending Review",
            href: "/delete-account-request?tab=pending",
          },
          { title: "Grace Period", href: "/delete-account-request?tab=grace" },
          { title: "Completed", href: "/delete-account-request?tab=completed" },
          {
            title: "Settings & Policy",
            href: "/delete-account-request?tab=settings",
          },
        ],
      },
      { title: "Logout", href: "/logout", icon: "🚪" },
    ],
  },
];
