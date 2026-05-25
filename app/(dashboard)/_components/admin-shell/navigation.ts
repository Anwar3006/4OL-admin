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
  icon: LucideIcon;
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
      { title: "Dashboard", href: "/dashboard/overview", icon: Home },
      { title: "Transactions", href: "/transactions", icon: CreditCard, badge: "2" },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Admins",
        href: "/admins",
        icon: UserCog,
        children: [
          { title: "All Admins", href: "/admins" },
          { title: "Roles & Permissions", href: "/admins" },
          { title: "Activity Logs", href: "/admins" },
          { title: "Security Center", href: "/security-center" },
          { title: "Reports", href: "/admins" },
        ],
      },
      {
        title: "Users",
        href: "/users",
        icon: Users,
        children: [
          { title: "All Users", href: "/users" },
          { title: "IBP Businesses", href: "/facilities/ibp" },
        ],
      },
      { title: "Task Manager", href: "/kanban", icon: ClipboardList, badge: "SA" },
    ],
  },
  {
    title: "Health Services",
    items: [
      {
        title: "Facilities",
        href: "/facilities",
        icon: Building2,
        badge: "6",
        children: [
          { title: "All", href: "/facilities" },
          { title: "Pending Approval", href: "/facilities/pending-reviews" },
          { title: "Top Rated", href: "/facilities/top-rated" },
          { title: "Featured", href: "/facilities/featured" },
        ],
      },
      { title: "Diseases & Conditions", href: "/diseases_&_conditions", icon: Activity },
      { title: "Human Anatomy", href: "/human-anatomy", icon: UserSquare2 },
      { title: "Symptoms", href: "/symptoms", icon: HeartPulse },
      { title: "Healthy Living", href: "/healthy_living/information", icon: BookOpen },
      { title: "Fitness", href: "/fitness", icon: Dumbbell, badge: "3" },
      { title: "Period Tracker", href: "/period_tracker", icon: CalendarDays },
      { title: "Medication Reminder", href: "/medication-reminder", icon: Pill },
      {
        title: "Healthcare Professionals",
        href: "/healthcare-professionals",
        icon: Users,
        badge: "12",
        children: [
          { title: "All", href: "/healthcare-professionals" },
          { title: "Pending", href: "/healthcare-professionals/pending" },
          { title: "Group Chats", href: "/chats/groups" },
        ],
      },
      {
        title: "Jobs",
        href: "/jobs",
        icon: Briefcase,
        badge: "24",
        children: [
          { title: "All Listings", href: "/jobs" },
          { title: "Post a Job", href: "/jobs/post" },
          { title: "Applicants", href: "/jobs/applicants" },
          { title: "Digital CVs", href: "/jobs/cvs" },
          { title: "Premium Services", href: "/jobs/premium" },
        ],
      },
      {
        title: "Medication Enquiry",
        href: "/medication-enquiry",
        icon: Search,
        badge: "8",
        children: [
          { title: "All", href: "/medication-enquiry" },
          { title: "Pending", href: "/medication-enquiry/pending" },
          { title: "Escrow", href: "/medication-enquiry/escrow" },
          { title: "Delivery", href: "/medication-enquiry/delivery" },
        ],
      },
      {
        title: "BedTracker (PKM)",
        href: "/bedtracker",
        icon: Workflow,
        badge: "LIVE",
        children: [
          { title: "Live Overview", href: "/bedtracker" },
          { title: "Bed Registry", href: "/bedtracker/registry" },
          { title: "Facilities", href: "/bedtracker/facilities" },
          { title: "Ambulance Dispatch", href: "/bedtracker/dispatch" },
          { title: "Analytics", href: "/bedtracker/analytics" },
          { title: "Design & Strategy", href: "/bedtracker/design" },
        ],
      },
    ],
  },
  {
    title: "Engagement",
    items: [
      { title: "Reviews & Ratings", href: "/reviews", icon: Star, badge: "Fac" },
      { title: "Map", href: "/map", icon: Map, badge: "Fac" },
    ],
  },
  {
    title: "Growth",
    items: [
      {
        title: "Marketing",
        href: "/marketing",
        icon: Megaphone,
        badge: "2",
        children: [
          { title: "Campaigns", href: "/marketing" },
          { title: "Subscriptions", href: "/marketing/subscriptions" },
          { title: "Discounts", href: "/marketing/discounts" },
        ],
      },
      {
        title: "Chats",
        href: "/chats/groups",
        icon: MessageSquare,
        badge: "5",
        children: [
          { title: "Groups", href: "/chats/groups" },
          { title: "Support", href: "/chats/support" },
        ],
      },
      {
        title: "FacilityScout",
        href: "/facilityscout",
        icon: Search,
        badge: "14",
        children: [
          { title: "All", href: "/facilityscout" },
          { title: "Pending Review", href: "/facilityscout/pending" },
          { title: "Rewards Queue", href: "/facilityscout/rewards" },
          { title: "Leaderboard", href: "/facilityscout/leaderboard" },
          { title: "Settings", href: "/facilityscout/settings" },
        ],
      },
      { title: "FAQ", href: "/faq", icon: BookOpen },
      { title: "Notifications", href: "/notifications", icon: Bell, badge: "3" },
    ],
  },
  {
    title: "AI Intelligence",
    items: [
      {
        title: "AI Hub",
        href: "/ai-hub",
        icon: Bot,
        children: [
          { title: "AI Models", href: "/ai-hub/models" },
          { title: "AI Moderation", href: "/ai-hub/moderation" },
          { title: "Recommendations", href: "/ai-hub/recommendations" },
          { title: "AI Analytics", href: "/ai-hub/analytics" },
        ],
      },
    ],
  },
  {
    title: "Platform",
    items: [
      { title: "Security Center", href: "/security-center", icon: Shield },
      { title: "Platform Schematic", href: "/platform-schematic", icon: LayoutGrid },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Delete Account Requests", href: "/delete-account-request", icon: Trash2, badge: "4" },
      { title: "Logout", href: "/logout", icon: Lock },
    ],
  },
];
