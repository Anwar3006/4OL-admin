/**
 * The legacy permission vocabulary. `PERMISSION_MAPPINGS` maps a resource name
 * onto the routes, menu items and actions it unlocks.
 *
 * ⚠️ Read `hooks/usePermissions.ts` before building on this. That hook is the
 * only consumer path and it hardcodes an empty permission list, because
 * `user_profiles` has no `permissions` column — access is role-based. So every
 * lookup here currently resolves against an empty array. The RBAC that is
 * actually enforced lives in `lib/permissions.ts` and `requireAdminApiUser()`.
 */

/** One granted permission: a resource plus the level granted on it. */
export type UserPermission = {
  resource: string;
  assignedPermission: string;
};

/** What a resource unlocks. `actions` is keyed by assignedPermission level. */
export type PermissionMapping = {
  routes: string[];
  menuItems: string[];
  actions: Record<string, string[]>;
};

export const PERMISSION_ITEMS: UserPermission[] = [
  { resource: "Manage users", assignedPermission: "View Only" },
  {
    resource: "Analytics Customization (Refresh, Reset)",
    assignedPermission: "Add, Edit",
  },
  {
    resource: "Facilities Management (Add, Edit, Delete, Approve)",
    assignedPermission: "Add, Edit",
  },
  {
    resource: "Diseases Management (Add, Edit, Delete)",
    assignedPermission: "Add, Edit",
  },
  {
    resource: "Health Camp Management (Add, Edit, Delete)",
    assignedPermission: "Add, Edit",
  },
  {
    resource: "Period Tracker Management (Add, Edit, Delete)",
    assignedPermission: "View Only",
  },
  {
    resource: "Medication Reminder (Download, Delete, Archive)",
    assignedPermission: "View Only",
  },
  {
    resource: "Reviews Ratings (Add, Edit, Delete)",
    assignedPermission: "Add, Edit",
  },
  {
    resource: "Map Management (Edit, Delete)",
    assignedPermission: "View Only",
  },
  {
    resource: "User Grouping/ Notification (Create, Edit, Delete, Approve)",
    assignedPermission: "Create, Edit",
  },
  {
    resource: "Marketing (Create, Edit, Delete, Approve)",
    assignedPermission: "Create, Edit",
  },
  {
    resource: "Chats (Give, Reply, Confirm, Reset, Delete)",
    assignedPermission: "View, Reply",
  },
  {
    resource: "FAQS (Create, Edit, Delete, Approve)",
    assignedPermission: "Create, Edit",
  },
];

/**
 * Maps permission resources to actual routes and features in the application
 * Each permission can control multiple routes and have different action levels
 */

export const PERMISSION_MAPPINGS: Record<string, PermissionMapping> = {
  "Manage users": {
    routes: ["/users", "/user-management", "/admin/register-account"],
    menuItems: ["Users"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "add", "edit"],
      "Full Access": ["view", "add", "edit", "delete"],
    },
  },

  "Analytics Customization (Refresh, Reset)": {
    routes: ["/analytics", "/totals"],
    menuItems: ["Dashboard"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "refresh", "reset"],
      "Full Access": ["view", "refresh", "reset", "customize"],
    },
  },

  "Facilities Management (Add, Edit, Delete, Approve)": {
    routes: [
      "/facilities",
      "/facilities/add-facility",
      "/facilities/pending-reviews",
      "/facilities/hospitals",
      "/facilities/herbal-hospitals",
      "/facilities/diagnostic-labs",
      "/facilities/pharmacies",
      "/facilities/dental",
      "/facilities/ambulance",
      "/facilities/homes",
      "/facilities/eye-care",
      "/facilities/osteopathy",
      "/facilities/physiotherapy",
      "/facilities/prosthetics",
      "/facilities/psychiatric",
      "/facility-profile-form",
      "/edit-facility-profile-form",
      "/view-facility-profile",
    ],
    menuItems: ["Facilities"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "add", "edit"],
      "Full Access": ["view", "add", "edit", "delete", "approve"],
    },
  },

  "Diseases Management (Add, Edit, Delete)": {
    routes: [
      "/categories/illness_and_complications/overview",
      "/categories/illness_and_complications/form",
    ],
    menuItems: ["Diseases & Conditions"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "add", "edit"],
      "Full Access": ["view", "add", "edit", "delete"],
    },
  },

  "Health Camp Management (Add, Edit, Delete)": {
    routes: ["/health-camps", "/health-camps/create", "/health-camps/edit"],
    menuItems: ["Health Camps"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "add", "edit"],
      "Full Access": ["view", "add", "edit", "delete"],
    },
  },

  "Period Tracker Management (Add, Edit, Delete)": {
    routes: ["/period-tracker"],
    menuItems: ["Period Tracker"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "add", "edit"],
      "Full Access": ["view", "add", "edit", "delete"],
    },
  },

  "Medication Reminder (Download, Delete, Archive)": {
    routes: ["/medication-reminder", "/view-medication-reminder-details"],
    menuItems: ["Medication Reminder"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "download"],
      "Full Access": ["view", "download", "delete", "archive"],
    },
  },

  "Reviews Ratings (Add, Edit, Delete)": {
    routes: ["/reviews", "/view-reviews"],
    menuItems: ["Reviews"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "add", "edit"],
      "Full Access": ["view", "add", "edit", "delete"],
    },
  },

  "Map Management (Edit, Delete)": {
    routes: ["/map"],
    menuItems: ["Map"],
    actions: {
      "View Only": ["view"],
      "Add, Edit": ["view", "edit"],
      "Full Access": ["view", "edit", "delete"],
    },
  },

  "User Grouping/ Notification (Create, Edit, Delete, Approve)": {
    routes: ["/user-group", "/send-notifications", "/view-notification"],
    menuItems: ["User Groups", "Notifications"],
    actions: {
      "View Only": ["view"],
      "Create, Edit": ["view", "create", "edit"],
      "Full Access": ["view", "create", "edit", "delete", "approve"],
    },
  },

  "Marketing (Create, Edit, Delete, Approve)": {
    routes: ["/marketing"],
    menuItems: ["Marketing"],
    actions: {
      "View Only": ["view"],
      "Create, Edit": ["view", "create", "edit"],
      "Full Access": ["view", "create", "edit", "delete", "approve"],
    },
  },

  "Chats (Give, Reply, Confirm, Reset, Delete)": {
    routes: ["/chats"],
    menuItems: ["Chats"],
    actions: {
      "View Only": ["view"],
      "View, Reply": ["view", "reply"],
      "Full Access": ["view", "give", "reply", "confirm", "reset", "delete"],
    },
  },

  "FAQS (Create, Edit, Delete, Approve)": {
    routes: ["/questions", "/faqs"],
    menuItems: ["FAQs", "Questions"],
    actions: {
      "View Only": ["view"],
      "Create, Edit": ["view", "create", "edit"],
      "Full Access": ["view", "create", "edit", "delete", "approve"],
    },
  },
};
