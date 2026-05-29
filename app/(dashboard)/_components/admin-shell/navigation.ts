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
        badge: "2",
        children: [
          { title: "Recent Transactions", href: "/transactions?tab=recent" },
          { title: "Service Charge %", href: "/transactions?tab=service-charge" },
          { title: "Subscriptions", href: "/transactions?tab=subscriptions" },
          { title: "Failed (12)", href: "/transactions?tab=failed" },
          { title: "Refunds (4)", href: "/transactions?tab=refunds" },
          { title: "Tax & VAT", href: "/transactions?tab=tax-vat" },
          { title: "Expenses", href: "/transactions?tab=expenses" },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Admins",
        href: "/admins",
        icon: "👥",
        children: [
          { title: "All Admins", href: "/admins?tab=all" },
          { title: "Roles & Permissions", href: "/admins?tab=roles" },
          { title: "Activity Logs", href: "/admins?tab=logs" },
          { title: "Security Center", href: "/admins?tab=security" },
          { title: "Reports", href: "/admins?tab=reports" },
        ],
      },
      {
        title: "Users",
        href: "/users",
        icon: "👤",
        children: [
          { title: "All Users", href: "/users?tab=all" },
          { title: "Flagged", href: "/users?tab=flagged" },
          { title: "Delete Requests", href: "/users?tab=delete-requests" },
          { title: "IBP Businesses", href: "/ibp" },
        ],
      },
      { title: "Task Manager", href: "/tasks", icon: "📋", badge: "SA" },
    ],
  },
  {
    title: "Health Services",
    items: [
      {
        title: "Facilities",
        href: "/facilities",
        icon: "🏥",
        badge: "6",
        children: [
          { title: "All", href: "/facilities" },
          { title: "Pending Approval", href: "/facilities/pending" },
          { title: "Top Rated", href: "/facilities/top-rated" },
          { title: "Featured", href: "/facilities/featured" },
        ],
      },
      { title: "Diseases & Conditions", href: "/diseases", icon: "🦠" },
      { title: "Human Anatomy", href: "/anatomy", icon: "🫁" },
      { title: "Symptoms", href: "/symptoms", icon: "🩺" },
      { title: "Healthy Living", href: "/healthy_living", icon: "🥗" },
      { title: "Fitness", href: "/fitness", icon: "💪", badge: "3" },
      { title: "Period Tracker", href: "/period", icon: "📅" },
      {
        title: "Medication Reminder",
        href: "/medication-reminder",
        icon: "💊",
        children: [
          { title: "Drug Database", href: "/medication-reminder?tab=database" },
          { title: "Logged Reminders", href: "/medication-reminder?tab=logged" },
          { title: "Adherence", href: "/medication-reminder?tab=adherence" },
          { title: "Interactions", href: "/medication-reminder?tab=interactions" },
          { title: "AI Checker", href: "/medication-reminder?tab=ai" },
        ],
      },
      {
        title: "Healthcare Professionals",
        href: "/hcp",
        icon: "🧑‍⚕️",
        badge: "12",
        children: [
          { title: "All", href: "/hcp" },
          { title: "Pending", href: "/hcp?tab=pending" },
          { title: "Group Chats", href: "/hcp?tab=chats" },
        ],
      },
      {
        title: "Jobs",
        href: "/jobs",
        icon: "💼",
        badge: "24",
        children: [
          { title: "All Listings", href: "/jobs" },
          { title: "Post a Job", href: "/jobs?tab=post" },
          { title: "Applicants", href: "/jobs?tab=applicants" },
          { title: "Digital CVs", href: "/jobs?tab=cv" },
          { title: "Premium Services", href: "/jobs?tab=premium" },
        ],
      },
      {
        title: "Medication Enquiry",
        href: "/medenquiry",
        icon: "🔬",
        badge: "8",
        children: [
          { title: "All", href: "/medenquiry" },
          { title: "Pending", href: "/medenquiry?tab=pending" },
          { title: "Escrow", href: "/medenquiry?tab=escrow" },
          { title: "Delivery", href: "/medenquiry?tab=delivery" },
        ],
      },
      {
        title: "BedTracker (PKM)",
        href: "/bedtracker",
        icon: "🛏️",
        badge: "LIVE",
        children: [
          { title: "Live Overview", href: "/bedtracker" },
          { title: "Bed Registry", href: "/bedtracker?tab=registry" },
          { title: "Facilities", href: "/bedtracker?tab=facilities" },
          { title: "Ambulance Dispatch", href: "/bedtracker?tab=dispatch" },
          { title: "Analytics", href: "/bedtracker?tab=analytics" },
          { title: "Design & Strategy", href: "/bedtracker?tab=strategy" },
        ],
      },
    ],
  },
  {
    title: "Engagement",
    items: [
      {
        title: "Reviews & Ratings",
        href: "/reviews",
        icon: "⭐",
        badge: "Fac",
        children: [
          { title: "All Reviews", href: "/reviews?tab=all" },
          { title: "Flagged (12)", href: "/reviews?tab=flagged" },
          { title: "Pending (3)", href: "/reviews?tab=pending" },
        ],
      },
      { title: "Map", href: "/map", icon: "🗺️", badge: "Fac" },
    ],
  },
  {
    title: "Growth",
    items: [
      {
        title: "Marketing",
        href: "/marketing",
        icon: "📣",
        badge: "2",
        children: [
          { title: "Campaigns", href: "/marketing?tab=all" },
          { title: "Subscriptions", href: "/marketing?tab=subscriptions" },
          { title: "Discounts", href: "/marketing?tab=discounts" },
          { title: "Analytics", href: "/marketing?tab=analytics" },
          { title: "Page Linkages", href: "/marketing?tab=linkages" },
        ],
      },
      {
        title: "Chats",
        href: "/chats",
        icon: "💬",
        badge: "5",
        children: [
          { title: "Groups", href: "/chats?tab=groups" },
          { title: "Support", href: "/chats?tab=support" },
          { title: "Flagged", href: "/chats?tab=flagged" },
        ],
      },
      {
        title: "FacilityScout",
        href: "/facilityscout",
        icon: "🔍",
        badge: "14",
        children: [
          { title: "All Submissions", href: "/facilityscout" },
          { title: "Pending Review", href: "/facilityscout?tab=pending" },
          { title: "Rewards Queue", href: "/facilityscout?tab=rewards" },
          { title: "Leaderboard", href: "/facilityscout?tab=leaderboard" },
          { title: "Settings", href: "/facilityscout?tab=settings" },
        ],
      },
      { title: "FAQ", href: "/faq", icon: "❓" },
      { title: "Notifications", href: "/notifications", icon: "🔔", badge: "3" },
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
        badge: "4",
        children: [
          { title: "All Requests", href: "/delete-account-request?tab=all" },
          { title: "Pending Review", href: "/delete-account-request?tab=pending" },
          { title: "Grace Period", href: "/delete-account-request?tab=grace" },
          { title: "Completed", href: "/delete-account-request?tab=completed" },
          { title: "Settings & Policy", href: "/delete-account-request?tab=settings" },
        ],
      },
      { title: "Logout", href: "/logout", icon: "🚪" },
    ],
  },
];
