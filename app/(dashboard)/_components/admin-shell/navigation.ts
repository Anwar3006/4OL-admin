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
};

export type DashboardNavItem = {
  title: string;
  href: string;
  icon: string; // Emoji string
  badge?: string;
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
      { title: "Dashboard", href: "/dashboard", icon: "🏠" },
      {
        title: "Transactions",
        href: "/transactions",
        icon: "💳",
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
      { title: "Admins", href: "/admins", icon: "👥" },
      { title: "Users", href: "/users", icon: "👤" },
      { title: "IBP Businesses", href: "/ibp", icon: "🏢" },
      { title: "Task Manager", href: "/tasks", icon: "📋" },
    ],
  },
  {
    title: "Health Services",
    items: [
      { title: "Facilities", href: "/facilities", icon: "🏥" },
      { title: "Diseases & Conditions", href: "/diseases", icon: "🦠" },
      { title: "Human Anatomy", href: "/anatomy", icon: "🫁" },
      { title: "Symptoms", href: "/symptoms", icon: "🩺" },
      { title: "Healthy Living", href: "/healthy_living", icon: "🥗" },
      { title: "Fitness", href: "/fitness", icon: "💪" },
      { title: "Period Tracker", href: "/period", icon: "📅" },
      { title: "Medication Reminder", href: "/medication-reminder", icon: "💊" },
      {
        title: "Healthcare Professionals",
        href: "/hcp",
        icon: "🧑‍⚕️",
      },
      {
        title: "Jobs",
        href: "/jobs",
        icon: "💼",
      },
      {
        title: "Medication Enquiry",
        href: "/medenquiry",
        icon: "🔬",
      },
      {
        title: "BedTracker (PKM)",
        href: "/bedtracker",
        icon: "🛏️",
        badge: "LIVE",
      },
      { title: "Top Rated", href: "/top-rated", icon: "🏆" },
    ],
  },
  {
    title: "Engagement",
    items: [
      {
        title: "Reviews & Ratings",
        href: "/reviews",
        icon: "⭐",
      },
      { title: "Map", href: "/map", icon: "🗺️" },
    ],
  },
  {
    title: "Growth",
    items: [
      { title: "Marketing", href: "/marketing", icon: "📣" },
      {
        title: "Chats",
        href: "/chats",
        icon: "💬",
      },
      {
        title: "FacilityScout",
        href: "/facilityscout",
        icon: "🔍",
      },
      { title: "FAQ", href: "/faq", icon: "❓" },
      {
        title: "Notifications",
        href: "/notifications",
        icon: "🔔",
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
      { title: "Security Center", href: "/security", icon: "🔐" },
      { title: "Platform Schematic", href: "/schematic", icon: "🗂️" },
      { title: "Settings", href: "/settings", icon: "⚙️" },
      {
        title: "Delete Account Requests",
        href: "/delete-account-request",
        icon: "🗑️",
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
