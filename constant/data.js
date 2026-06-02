import { handleLogout } from "@/components/redesign/auth/store";

export const menuItems = [
  {
    title: "Dashboard",
    isHide: true,
    icon: "mingcute:dashboard-line",
    child: [
      {
        childtitle: "Overview",
        childlink: "dashboard/overview",
      },
      {
        childtitle: "Analytics",
        childlink: "dashboard/analytics",
      },
    ],
  },
  {
    title: "Transactions",
    isHide: false,
    icon: "fluent-mdl2:reading-mode",
    link: "transactions",
  },
  {
    title: "Admins",
    isHide: false,
    icon: "heroicons-outline:lock-closed",
    link: "admins",
  },
  {
    title: "Users",
    isHide: false,
    icon: "ri:empathize-line",
    link: "users",
  },
  {
    title: "Facilities",
    isHide: false,
    icon: "heroicons-outline:user",
    link: "facilities",
    child: [
      {
        childtitle: "All Facilities",
        childlink: "facilities",
      },
      {
        childtitle: "Top Rated",
        childlink: "facilities/top-rated",
      },
      {
        childtitle: "Featured",
        childlink: "facilities/featured",
      },
    ],
  },
  {
    title: "Diseases & Conditions",
    isHide: false,
    icon: "fa6-solid:virus-covid",
    link: "diseases_&_conditions",
  },
  {
    title: "Human Anatomy",
    isHide: false,
    icon: "mdi:human",
    link: "human-anatomy",
  },
  {
    title: "Symptoms",
    isHide: false,
    icon: "mdi:bacteria",
    link: "symptoms",
  },
  {
    title: "Healthy Living",
    isHide: false,
    icon: "ion:book",
    child: [
      {
        childtitle: "Information",
        childlink: "healthy_living/information",
      },
    ],
  },
  {
    title: "Fitness",
    isHide: false,
    icon: "mdi:dumbbell",
    link: "fitness",
  },
  {
    title: "Referrals",
    isHide: false,
    icon: "mdi:account-arrow-right-outline",
    link: "referrals",
  },
  {
    title: "Period Tracker",
    isHide: false,
    icon: "bi:droplet-fill",
    link: "period_tracker",
  },
  {
    title: "Medication Reminder",
    isHide: false,
    icon: "material-symbols:medication-outline",
    link: "medication-reminder",
  },
  {
    title: "Reviews & Ratings",
    isHide: false,
    icon: "material-symbols:rate-review-outline",
    link: "reviews",
  },
  {
    title: "Map",
    isHide: false,
    icon: "uiw:map",
    link: "map",
  },
  {
    title: "Marketing",
    isHide: false,
    icon: "hugeicons:marketing",
    link: "marketing",
    child: [
      // {
      //   childtitle: "Overview",
      //   childlink: "marketing/overview",
      // },
      {
        childtitle: "Campaigns",
        childlink: "marketing",
      },
      {
        childtitle: "Subscriptions",
        childlink: "marketing/subscriptions",
      },
      {
        childtitle: "Discounts",
        childlink: "marketing/discounts",
      },
    ],
  },
  {
    title: "Chats",
    isHide: false,
    icon: "lets-icons:chat",
    child: [
      {
        childtitle: "Groups",
        childlink: "chats/groups",
      },
      {
        childtitle: "Support",
        childlink: "chats/support",
      },
    ],
  },
  {
    title: "FAQ",
    isHide: false,
    icon: "mdi:faq",
    link: "faq",
  },
  {
    title: "Notifications",
    isHide: false,
    icon: "carbon:notification",
    link: "notifications",
  },
  {
    title: "Onboarding Requests",
    icon: "carbon:user-verification",
    isHide: false,
    link: "onboarding-requests",
  },
  {
    title: "Delete Account Request",
    icon: "line-md:account-delete",
    isHide: false,
    link: "delete-account-request",
  },
  {
    title: "Logout",
    isHide: true,
    icon: "ant-design:logout-outlined",
    link: "#",
    onClick: () => handleLogout(),
  },
];

export const topMenu = [];
export const notifications = [];
export const message = [];

export const colors = {
  primary: "#4669FA",
  secondary: "#A0AEC0",
  danger: "#F1595C",
  black: "#111112",
  warning: "#FA916B",
  info: "#0CE7FA",
  light: "#425466",
  success: "#50C793",
  "gray-f7": "#F7F8FC",
  dark: "#1E293B",
  "dark-gray": "#0F172A",
  gray: "#68768A",
  gray2: "#EEF1F9",
  "dark-light": "#CBD5E1",
};

export const hexToRGB = (hex, alpha) => {
  var r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);

  if (alpha) {
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }
  return "rgb(" + r + ", " + g + ", " + b + ")";
};

export const topFilterLists = [];
export const bottomFilterLists = [];
export const meets = [];
export const files = [];
