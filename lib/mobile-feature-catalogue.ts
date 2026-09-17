export type MobileFeatureState = "live" | "limited" | "planned";

export type MobileFeature = {
  name: string;
  description: string;
  workingWhen: string;
  state: MobileFeatureState;
};

export type MobileFeatureArea = {
  id: string;
  name: string;
  icon: string;
  summary: string;
  adminHref?: string;
  features: MobileFeature[];
  future: MobileFeature[];
};

/**
 * Plain-English register of what people can use in the mobile app.
 *
 * Keep this file focused on user outcomes, not tables, APIs or implementation
 * details. When a mobile feature changes, update its promise and the simple
 * "working when" check here in the same pull request.
 */
export const mobileFeatureCatalogue: MobileFeatureArea[] = [
  {
    id: "home",
    name: "Home & discovery",
    icon: "🏠",
    summary:
      "Helps people find health information, services and useful updates from one starting point.",
    adminHref: "/dashboard",
    features: [
      {
        name: "Home feed",
        description:
          "Shows current campaigns, featured health content and recommended places to start.",
        workingWhen:
          "A signed-in user can open Home and see published items without blank or broken cards.",
        state: "live",
      },
      {
        name: "All-in-one search",
        description:
          "Lets people search conditions, symptoms, healthy-living articles and healthcare facilities together.",
        workingWhen:
          "Entering a clear search term returns matching results and each result opens the right page.",
        state: "live",
      },
      {
        name: "Featured and top-rated content",
        description:
          "Highlights editor-selected health information and highly rated facilities.",
        workingWhen:
          "Published featured items appear on Home and open their full details.",
        state: "live",
      },
      {
        name: "Home favourites",
        description:
          "Brings a person’s saved facilities and health information back to the Home screen.",
        workingWhen:
          "Saving or removing an item is reflected on Home after refresh or the next visit.",
        state: "live",
      },
    ],
    future: [
      {
        name: "More personal recommendations",
        description:
          "Could adjust the Home feed using a person’s interests and chosen health goals.",
        workingWhen:
          "People can understand and control why an item was recommended.",
        state: "planned",
      },
    ],
  },
  {
    id: "health-library",
    name: "Health information library",
    icon: "📚",
    summary:
      "Provides easy-to-read information about conditions, symptoms and healthy living.",
    adminHref: "/diseases",
    features: [
      {
        name: "Conditions and diseases",
        description:
          "Lets people browse and read published information about illnesses and health conditions.",
        workingWhen:
          "A published condition appears in the app with its description and related information.",
        state: "live",
      },
      {
        name: "Symptom guide",
        description:
          "Explains common symptoms and helps people find related health information.",
        workingWhen:
          "A published symptom can be found and its detail page opens completely.",
        state: "live",
      },
      {
        name: "Healthy-living articles",
        description:
          "Offers practical articles on wellbeing, food, exercise and everyday health.",
        workingWhen:
          "Published articles appear in the correct category and their text and images load.",
        state: "live",
      },
      {
        name: "Browse by category",
        description:
          "Groups health content so people can explore a topic without knowing what to search for.",
        workingWhen:
          "Choosing a category shows the relevant published content and no unrelated records.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Offline reading",
        description:
          "Could let people keep selected health articles available when their connection is poor.",
        workingWhen:
          "Downloaded articles remain readable without internet access and clearly show their update date.",
        state: "planned",
      },
      {
        name: "More local languages",
        description:
          "Could make core health guidance available in additional Ghanaian languages.",
        workingWhen:
          "People can choose a language and see clinically reviewed translations consistently.",
        state: "planned",
      },
    ],
  },
  {
    id: "anatomy",
    name: "Human anatomy",
    icon: "🫁",
    summary:
      "Helps people explore body areas and understand related health information.",
    adminHref: "/anatomy",
    features: [
      {
        name: "Interactive body map",
        description:
          "Lets people select a body area to learn what it is and what may affect it.",
        workingWhen:
          "Selecting a visible body area opens the correct explanation without dead zones.",
        state: "live",
      },
      {
        name: "Connected health guidance",
        description:
          "Links body areas to relevant symptoms, conditions, medicines, exercises and healthy tips where available.",
        workingWhen:
          "Each published link opens the correct information and unavailable sections stay out of view.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Richer 3D exploration",
        description:
          "Could add more detailed layers and guided journeys through body systems.",
        workingWhen:
          "People can move between layers smoothly and the guidance remains understandable on ordinary phones.",
        state: "planned",
      },
    ],
  },
  {
    id: "facilities",
    name: "Facilities, map & reviews",
    icon: "🏥",
    summary:
      "Helps people find suitable healthcare facilities and understand the services they offer.",
    adminHref: "/facilities",
    features: [
      {
        name: "Healthcare map",
        description:
          "Shows nearby healthcare facilities and lets people explore them by location.",
        workingWhen:
          "The map loads, location permission is handled clearly and facility markers open the right profile.",
        state: "live",
      },
      {
        name: "Facility profiles",
        description:
          "Shows a facility’s services, contact details, location, opening hours and other published information.",
        workingWhen:
          "The profile matches the approved admin record and contact or direction actions work.",
        state: "live",
      },
      {
        name: "Favourites",
        description:
          "Lets people save facilities they may want to contact or visit again.",
        workingWhen:
          "A saved facility appears in Saved Items and can be removed from either location.",
        state: "live",
      },
      {
        name: "Ratings and reviews",
        description:
          "Lets people read community feedback and share an experience with a facility.",
        workingWhen:
          "Approved reviews appear on the correct facility and new submissions enter the review process.",
        state: "live",
      },
      {
        name: "Report a missing facility",
        description:
          "Lets people submit a facility that is missing and follow the submission while it is checked.",
        workingWhen:
          "A complete submission reaches the admin review queue and its status is visible to the sender.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Appointments and live availability",
        description:
          "Could show available services or appointment slots and allow a person to request a visit.",
        workingWhen:
          "Availability is current, a request reaches the facility and the person receives confirmation.",
        state: "planned",
      },
    ],
  },
  {
    id: "chat",
    name: "Chats & support",
    icon: "💬",
    summary:
      "Gives people a place to join health conversations and ask for help.",
    adminHref: "/chats",
    features: [
      {
        name: "Community conversations",
        description:
          "Lets people discover and join available health discussion groups.",
        workingWhen:
          "A person can open a group, read current messages and send a message when allowed.",
        state: "live",
      },
      {
        name: "Facility conversations",
        description:
          "Lets people continue a conversation connected to a healthcare facility.",
        workingWhen:
          "Messages remain attached to the right facility and both sides see new replies.",
        state: "live",
      },
      {
        name: "Support tickets",
        description:
          "Lets people contact support and follow their open and previous requests.",
        workingWhen:
          "A submitted request appears in My Tickets and admin replies reach the same conversation.",
        state: "live",
      },
      {
        name: "Message reporting and moderation",
        description:
          "Provides a path for unsafe or inappropriate conversation content to be reviewed.",
        workingWhen:
          "A report reaches the moderation queue without exposing the reporter to other members.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Verified expert sessions",
        description:
          "Could support scheduled question-and-answer sessions with approved health professionals.",
        workingWhen:
          "The expert is clearly verified, the session time is visible and safety guidance is shown.",
        state: "planned",
      },
    ],
  },
  {
    id: "reminders",
    name: "Medication & workout reminders",
    icon: "⏰",
    summary:
      "Helps people remember medicines and planned exercise.",
    adminHref: "/medication-reminder",
    features: [
      {
        name: "Medication reminders",
        description:
          "Lets people add a medicine, choose a schedule and receive reminders.",
        workingWhen:
          "The saved medicine appears in the list and its reminder arrives at the chosen time when notifications are allowed.",
        state: "live",
      },
      {
        name: "Workout reminders",
        description:
          "Lets people schedule a workout and receive a prompt to complete it.",
        workingWhen:
          "The workout appears on the chosen day and the reminder opens the correct details.",
        state: "live",
      },
      {
        name: "Reminder calendar",
        description:
          "Shows scheduled medicines and workouts together by date.",
        workingWhen:
          "Changing the date shows the correct items and edits are reflected without duplication.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Refill reminders",
        description:
          "Could warn a person before their medicine is expected to run out.",
        workingWhen:
          "The warning uses the recorded supply and schedule and can be adjusted or dismissed.",
        state: "planned",
      },
      {
        name: "Trusted-person sharing",
        description:
          "Could let a person choose someone who may help them keep up with important reminders.",
        workingWhen:
          "Sharing requires clear consent and can be stopped immediately by the account owner.",
        state: "planned",
      },
    ],
  },
  {
    id: "medication-enquiry",
    name: "Medication enquiries",
    icon: "💊",
    summary:
      "Helps people ask participating pharmacies about a medicine and follow the response.",
    adminHref: "/medenquiry",
    features: [
      {
        name: "Send a medication enquiry",
        description:
          "Lets a person describe the medicine they need and send the request for pharmacy responses.",
        workingWhen:
          "A valid request is visible in the person’s enquiry history and reaches the admin workflow.",
        state: "live",
      },
      {
        name: "Track enquiries and responses",
        description:
          "Shows progress and available pharmacy responses for requests already sent.",
        workingWhen:
          "Status changes and pharmacy responses appear on the matching enquiry without delay or mix-ups.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Clearer delivery tracking",
        description:
          "Could show each step from an accepted pharmacy response through fulfilment and delivery.",
        workingWhen:
          "The person and pharmacy see the same current stage and receive useful delay updates.",
        state: "planned",
      },
    ],
  },
  {
    id: "jobs",
    name: "Healthcare jobs",
    icon: "💼",
    summary:
      "Connects people to healthcare job opportunities and keeps their applications together.",
    adminHref: "/jobs",
    features: [
      {
        name: "Browse job listings",
        description:
          "Lets people find current healthcare roles and read the full requirements.",
        workingWhen:
          "Only active listings appear and every listing opens with its location, employer and requirements.",
        state: "live",
      },
      {
        name: "Apply for a role",
        description:
          "Lets a signed-in person complete and send an application from the app.",
        workingWhen:
          "A completed application reaches the employer workflow and appears in My Applications.",
        state: "live",
      },
      {
        name: "Job alerts and application history",
        description:
          "Keeps a person’s alerts and submitted applications easy to find.",
        workingWhen:
          "Saved alert choices persist and each submitted application shows its current state.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Interview scheduling",
        description:
          "Could let approved employers suggest interview times and applicants respond in the app.",
        workingWhen:
          "Both sides see the confirmed time and changes produce a clear notification.",
        state: "planned",
      },
    ],
  },
  {
    id: "fitness",
    name: "Fitness",
    icon: "💪",
    summary:
      "Supports exercise planning, guided workouts, activity tracking, challenges and rewards.",
    adminHref: "/fitness",
    features: [
      {
        name: "Fitness onboarding",
        description:
          "Collects a person’s goals, experience, available equipment and preferences to set up Fitness.",
        workingWhen:
          "A new user can finish every step and reaches a fitness experience that reflects their choices.",
        state: "live",
      },
      {
        name: "Fitness overview and today’s plan",
        description:
          "Shows today’s activity, progress, current plan, challenges, streak and FitCoins in one place.",
        workingWhen:
          "The overview loads current values and every action opens the expected fitness screen.",
        state: "live",
      },
      {
        name: "Exercise library",
        description:
          "Lets people browse exercises and view instructions before starting.",
        workingWhen:
          "Published exercises can be found and show complete, usable instructions and media.",
        state: "live",
      },
      {
        name: "Guided workouts",
        description:
          "Takes people through exercises and records a completed workout.",
        workingWhen:
          "A workout starts, advances through its exercises and records completion once.",
        state: "live",
      },
      {
        name: "Workout plans",
        description:
          "Lets people view structured plans and the exercises assigned to each day.",
        workingWhen:
          "A plan shows the correct days and exercises and progress is retained between visits.",
        state: "live",
      },
      {
        name: "Personalised plan generation",
        description:
          "Creates a workout plan from the person’s fitness profile and preferences.",
        workingWhen:
          "A request produces a safe, readable plan that matches the selected goal and available equipment.",
        state: "live",
      },
      {
        name: "Activity logging and history",
        description:
          "Lets people record exercise and review previous activity.",
        workingWhen:
          "A new activity appears once in history with the correct date and progress values.",
        state: "live",
      },
      {
        name: "Fitness streaks and health metrics",
        description:
          "Shows consistency over time and personal fitness measurements entered or collected by the app.",
        workingWhen:
          "New qualifying activity updates the streak and displayed metrics use the latest available information.",
        state: "live",
      },
      {
        name: "Challenges",
        description:
          "Lets people discover, join and follow individual or team fitness challenges.",
        workingWhen:
          "Joining a challenge adds it to the person’s active list and eligible activity updates progress.",
        state: "live",
      },
      {
        name: "FitCoins and rewards",
        description:
          "Awards FitCoins for eligible fitness activity and lets people request available rewards.",
        workingWhen:
          "Eligible activity changes the balance once and a valid redemption reaches the approval queue.",
        state: "live",
      },
      {
        name: "Outdoor routes and events",
        description:
          "Lets people discover approved outdoor routes and events, plan a visit, invite a friend, mark it completed, like it and leave a rating.",
        workingWhen:
          "Active routes and events show usable details and every visit, completion, like, share and rating appears once in the matching admin table.",
        state: "live",
      },
      {
        name: "Workout schedules and reminders",
        description:
          "Helps people plan when to exercise and remember upcoming sessions.",
        workingWhen:
          "A scheduled session appears on the right day and its reminder opens the correct workout.",
        state: "live",
      },
      {
        name: "Premium fitness access",
        description:
          "Shows paid fitness benefits and limits premium-only experiences to eligible accounts.",
        workingWhen:
          "Eligible users can open premium content and other users see a clear explanation of the requirement.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Wearable and health-app connection",
        description:
          "Could bring verified activity from supported watches and phone health services into progress tracking.",
        workingWhen:
          "People choose what to share, imported activity is labelled clearly and duplicates are prevented.",
        state: "planned",
      },
      {
        name: "Live trainer sessions",
        description:
          "Could let people book or join guided sessions with approved trainers.",
        workingWhen:
          "Trainer credentials, session time, price and attendance status are clear to everyone involved.",
        state: "planned",
      },
    ],
  },
  {
    id: "period",
    name: "Period Tracker (Plasence)",
    icon: "🌸",
    summary:
      "Supports period logging, cycle understanding, reproductive-health learning and pregnancy planning.",
    adminHref: "/period",
    features: [
      {
        name: "Cycle calendar and forecasts",
        description:
          "Shows logged periods, estimated cycle phases and upcoming period dates.",
        workingWhen:
          "A confirmed period updates the calendar and future estimates without changing the original log.",
        state: "live",
      },
      {
        name: "Daily health log",
        description:
          "Lets people record flow, symptoms, mood and other daily cycle information.",
        workingWhen:
          "A saved entry reopens on the correct date with every selected item intact.",
        state: "live",
      },
      {
        name: "Period history and backfill",
        description:
          "Lets people add an earlier period or correct their cycle history.",
        workingWhen:
          "A valid earlier date appears in history and forecasts refresh without creating duplicate periods.",
        state: "live",
      },
      {
        name: "Cycle insights",
        description:
          "Summarises recent patterns and explains changes using the information a person has logged.",
        workingWhen:
          "Insights use the latest logs, explain limited data honestly and never present a diagnosis.",
        state: "live",
      },
      {
        name: "Period reminders",
        description:
          "Provides optional alerts for expected periods and daily logging.",
        workingWhen:
          "An enabled reminder arrives at the selected time and turns off immediately when disabled.",
        state: "live",
      },
      {
        name: "Reproductive-health library",
        description:
          "Offers reviewed articles and practical guidance inside Plasence.",
        workingWhen:
          "Published articles appear in the right topic and their complete content opens.",
        state: "live",
      },
      {
        name: "Friday Trivia",
        description:
          "Runs timed learning quizzes with questions, scores, winners and eligible rewards.",
        workingWhen:
          "A scheduled quiz unlocks at the published time, accepts one valid attempt and records the score correctly.",
        state: "live",
      },
      {
        name: "Trying to conceive",
        description:
          "Adds fertility-window and ovulation guidance for people who choose the Get Pregnant goal.",
        workingWhen:
          "An eligible user can select the goal and sees guidance based on their own cycle history with clear estimate wording.",
        state: "limited",
      },
      {
        name: "Pregnancy mode",
        description:
          "Changes cycle predictions into pregnancy-week and estimated due-date tracking after confirmation.",
        workingWhen:
          "Confirming pregnancy shows the estimated week and due date and stops presenting ordinary cycle forecasts.",
        state: "live",
      },
      {
        name: "Pregnancy planning tools",
        description:
          "Provides checklists, appointment notes and pregnancy-test records.",
        workingWhen:
          "New checklist, appointment and test entries save to the correct account and can be reviewed later.",
        state: "live",
      },
      {
        name: "Clinician report",
        description:
          "Creates a shareable summary of cycle information selected for a healthcare conversation.",
        workingWhen:
          "The report contains the chosen date range, avoids hidden private notes and can be shared from the phone.",
        state: "live",
      },
      {
        name: "Privacy and data controls",
        description:
          "Explains how sensitive tracking data is used and gives the person relevant controls.",
        workingWhen:
          "The page opens from Settings and saved privacy choices continue to apply on the next visit.",
        state: "live",
      },
    ],
    future: [
      {
        name: "PCOS support",
        description:
          "Could provide flexible tracking and education designed for people managing PCOS.",
        workingWhen:
          "The experience handles irregular cycles without making diagnostic claims and has appropriate clinical review.",
        state: "planned",
      },
      {
        name: "Optional trusted-person sharing",
        description:
          "Could let a person share selected cycle or pregnancy information with someone they trust.",
        workingWhen:
          "The person chooses exactly what is shared and can withdraw access at any time.",
        state: "planned",
      },
    ],
  },
  {
    id: "notifications",
    name: "Notifications",
    icon: "🔔",
    summary:
      "Keeps people informed about reminders, replies, updates and account activity.",
    adminHref: "/notifications",
    features: [
      {
        name: "Notification inbox",
        description:
          "Keeps important app messages together so people can return to them later.",
        workingWhen:
          "New messages appear once, open the correct destination and can be marked as read.",
        state: "live",
      },
      {
        name: "Push notifications",
        description:
          "Delivers allowed reminders and updates when the app is not open.",
        workingWhen:
          "An opted-in device receives the right message and tapping it opens the intended screen.",
        state: "live",
      },
      {
        name: "Notification preferences",
        description:
          "Lets people choose which types of non-essential messages they want to receive.",
        workingWhen:
          "Turning a category off stops that category while essential account messages remain clear.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Quiet hours",
        description:
          "Could let people pause non-urgent messages during chosen hours.",
        workingWhen:
          "Non-urgent messages wait until quiet hours end and urgent safety messages follow the stated policy.",
        state: "planned",
      },
    ],
  },
  {
    id: "account",
    name: "Account, privacy & saved items",
    icon: "👤",
    summary:
      "Lets people manage their profile, security, privacy, subscription and saved content.",
    adminHref: "/users",
    features: [
      {
        name: "Profile management",
        description:
          "Lets people review and update their personal account information.",
        workingWhen:
          "Saved changes remain after signing out and back in and appear anywhere that information is used.",
        state: "live",
      },
      {
        name: "Saved items",
        description:
          "Keeps favourited facilities and health content together for quick return visits.",
        workingWhen:
          "Saved items appear once, open correctly and disappear everywhere when removed.",
        state: "live",
      },
      {
        name: "Password, device and biometric security",
        description:
          "Provides password controls, recognised-device information and optional biometric access.",
        workingWhen:
          "Security changes require the right checks and take effect on the next relevant sign-in.",
        state: "live",
      },
      {
        name: "Privacy and data",
        description:
          "Gives people access to privacy information and available controls for their account data.",
        workingWhen:
          "Privacy pages load, requests are recorded and the user receives a clear confirmation.",
        state: "live",
      },
      {
        name: "Account deletion request",
        description:
          "Lets a person request deletion and understand what will happen next.",
        workingWhen:
          "The request enters the admin process once and its confirmation explains the grace period or next step.",
        state: "live",
      },
      {
        name: "Subscription and payment options",
        description:
          "Shows a person’s subscription and available payment-management choices.",
        workingWhen:
          "The displayed plan matches the account and payment actions return a clear success or failure result.",
        state: "live",
      },
      {
        name: "Help, about and legal information",
        description:
          "Provides FAQs, support routes, app information, privacy terms and other legal notices.",
        workingWhen:
          "Published FAQs and legal pages open completely and support contact actions work.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Self-service data download",
        description:
          "Could let a person request and securely download a copy of their account information.",
        workingWhen:
          "The request is identity-checked, time-limited and contains only that person’s information.",
        state: "planned",
      },
    ],
  },
  {
    id: "business",
    name: "Business partner app",
    icon: "🏢",
    summary:
      "Gives approved healthcare businesses tools to manage their presence and activity from mobile.",
    adminHref: "/ibp",
    features: [
      {
        name: "Business dashboard and analytics",
        description:
          "Shows an approved business a summary of activity and performance.",
        workingWhen:
          "The dashboard loads information for the signed-in business only and uses the selected period.",
        state: "live",
      },
      {
        name: "Facility management",
        description:
          "Lets a business review its linked facility information and operations.",
        workingWhen:
          "Only authorised facilities appear and approved profile changes reach the public listing.",
        state: "live",
      },
      {
        name: "Business conversations",
        description:
          "Lets staff respond to conversations associated with their business.",
        workingWhen:
          "A reply reaches the correct person and staff cannot open another business’s conversations.",
        state: "live",
      },
      {
        name: "Finance and marketing",
        description:
          "Shows available financial information and tools for approved business campaigns.",
        workingWhen:
          "Amounts match the business account and submitted marketing activity follows its approval process.",
        state: "live",
      },
      {
        name: "Business profile, billing and security",
        description:
          "Lets approved staff manage company details, billing choices and account security.",
        workingWhen:
          "Changes are limited to authorised staff and produce a clear confirmation or review state.",
        state: "live",
      },
    ],
    future: [
      {
        name: "Team roles and approvals",
        description:
          "Could give business owners finer control over what each staff member may view or change.",
        workingWhen:
          "Each role has understandable permissions and sensitive changes keep an approval record.",
        state: "planned",
      },
    ],
  },
];

export const mobileFeatureAreasById = new Map(
  mobileFeatureCatalogue.map((area) => [area.id, area]),
);
