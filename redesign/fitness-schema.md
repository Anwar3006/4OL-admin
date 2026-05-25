# 4 Our Life — Fitness Menu Schema

> Extracted from `admin-panel.html` (`id="page-fitness"`)  
> Last updated: May 23, 2026

---

## 1. Overview

The **Fitness** module is a comprehensive health & wellness administration panel nested within the `page-fitness` container. It provides **11 top-level tabs** covering exercise library management, workout plan generation, community challenges, user & trainer administration, AI-assisted content creation, outdoor fitness routing, health platform integrations, and WhatsApp community broadcasting.

### Entry Point
- **Sidebar**: `💪 Fitness` (badge: `3`)
- **Page Container**: `<div id="page-fitness" class="page">`
- **Breadcrumb**: `Dashboard → Health Services → Fitness`

---

## 2. Page Header

```
.ph (page header)
├── .ph-l
│   ├── .ptitle  → "💪 Fitness"
│   └── .psub   → "Exercise library · AI Studio · Challenges · Plans · Outdoor routes · Schedule · WhatsApp community"
└── .ph-r (action buttons)
    ├── "📥 Export"
    ├── "📋 AI Settings"
    └── "📋 Add Exercise"  → onclick="openModal('m-add-exercise')"
```

---

## 3. KPI Stat Cards (page-fitness)

```
.sg.sg4 (4-column stat grid)
├── sc #1: 1,240 Active Plans       → icon: 📋 (blue)
├── sc #2: 3,840 Users              → icon: 👥 (green)
├── sc #3: 284 Challenges            → icon: 🏆 (gold)
└── sc #4: 96% Uptime               → icon: ✅ (green)
```

---

## 4. Tab Navigation

```
.tabs#fit-tabs (role="tablist")
├── tc-fit-dash      → 📊 Dashboard
├── tc-fit-ex        → 🏋️ Exercises
├── tc-fit-plans     → 📋 Plans
├── tc-fit-ch        → 🏆 Challenges
├── tc-fit-usr       → 👥 Fitness Users
├── tc-fit-tr        → 👨‍🏫 Trainers
├── tc-fit-sched     → 📅 Schedule
├── tc-fit-ai        → 🤖 AI Studio
├── tc-fit-log       → 📞 AI Log
├── tc-fit-outdoor   → 🌳 Outdoor
├── tc-fit-health    → ❤️ Health Integrations
└── tc-fit-whatsapp  → 💬 WhatsApp Community
```

---

## 5. Tab Schemas

### 5.1 Dashboard (`tc-fit-dash`)

```
Dashboard Tab
├── Alert (.alert.al-b)
│   └── "Platform-Wide Fitness Dashboard" description
├── KPI Grid (.sg.sg6)
│   ├── Active Plans        → 1,240  (blue)
│   ├── Total Users          → 3,840  (green)
│   ├── Total Challenges     → 284    (gold)
│   ├── Platform Uptime      → 96%    (green)
│   ├── Exercises Added (7d) → 18     (purple)
│   └── WhatsApp Members     → 842    (teal)
├── Content Grid (.g2)
│   ├── Card: "📊 Weekly Active Users"
│   │   └── Bar chart (Mon–Sun, inline divs)
│   └── Card: "📈 Plan Completion Rate"
│       └── Progress bars by plan type (7 categories)
├── Card: "🏆 Top Performing Plans"
│   └── Table: Plan | Type | Users | Completion | Revenue | Actions
└── Card: "⚡ Super Admin Commands — Fitness"
    └── Grid of 6 QA buttons
        ├── 📋 AI Studio
        ├── 📋 Schedule Broadcast
        ├── 📋 Export Analytics
        ├── 📋 Manage Trainers
        ├── 📋 Review Challenges
        └── 📋 Health Integrations
```

---

### 5.2 Exercises (`tc-fit-ex`)

```
Exercises Tab
├── Alert (.alert.al-b)
│   └── "Exercise Library" description
├── Filter Bar (.fbar)
│   ├── 🔍 Search by name, muscle, equipment
│   ├── Category dropdown (Strength, Cardio, Yoga, HIIT, Flexibility, Balance)
│   ├── Muscle Group dropdown (Chest, Back, Legs, Shoulders, Arms, Core, Full Body, Cardio)
│   ├── Equipment dropdown (Bodyweight, Dumbbells, Barbell, Bands, Machine, Cardio, Kettlebell)
│   ├── Difficulty dropdown (Beginner, Intermediate, Advanced)
│   └── 📥 Export  +  + Add Exercise
├── Content Grid (.g2)
│   ├── Card: "🏋️ Exercise Library"
│   │   └── Table (8 cols)
│   │       ├── Exercise Name + Type badge
│   │       ├── Category
│   │       ├── Primary Muscle
│   │       ├── Equipment
│   │       ├── Difficulty (color-coded)
│   │       ├── Status (Active/Inactive)
│   │       ├── Created
│   │       └── Actions: 👁️ View  ✏️ Edit  🗑️ Delete
│   └── Card: "📊 Exercise Analytics"
│       └── 4 metric rows with .pbar
│           ├── Total Exercises
│           ├── Strength vs Cardio split
│           ├── Beginner-friendly %
│           └── Equipment-required %
└── Card: "⚡ Super Admin Commands — Exercises"
    └── 6 QA buttons
        ├── 📋 Bulk Import
        ├── 📋 AI Generate Exercise
        ├── 📋 Export Library
        ├── 📋 Review Submissions
        ├── 📋 Equipment Database
        └── 📋 Video CDN Stats
```

#### Modal: Add Exercise (`m-add-exercise`)
| Field | Type | Details |
|-------|------|---------|
| Exercise Name | `input` | Text placeholder |
| Description | `textarea` | Technique & benefits |
| Primary Muscle Group | `select` | Chest, Back, Legs/Glutes, Shoulders, Arms/Biceps, Arms/Triceps, Core, Full Body, Cardio |
| Secondary Muscles | `input` | Free text (e.g. "Core, Hamstrings") |
| Equipment Required | `select` | Bodyweight, Dumbbells, Barbell+Rack, Bands, Gym Machine, Cardio Equipment, Kettlebell |
| Exercise Type | `select` | Strength, Cardio, Flexibility, HIIT, Yoga, Balance |
| Difficulty Level | `select` | Beginner, Intermediate, Advanced |
| Default Sets | `input` | number, default 3 |
| Default Reps / Duration | `input` | Text (e.g. "12 reps or 30 sec") |
| Rest Time (seconds) | `input` | number, default 60 |
| Demonstration Video URL | `input` | URL placeholder |
| **Benefits** | `textarea#ex-benefits` | **Semicolon-separated**; live preview via `updateExercisePreview()` |
| **Muscles Worked** | `textarea#ex-muscles` | **Semicolon-separated**; live preview via `updateExercisePreview()` |
| Live Preview Box | `div` | Shows parsed bullet lists for Benefits & Muscles Worked |
| Status | `select` | Published, Draft |

**JS Functions**: `semicolonToList(raw, title)`, `updateExercisePreview()`

---

### 5.3 Plans (`tc-fit-plans`)

```
Plans Tab
├── Alert (.alert.al-b)
│   └── "Workout Plans" description (archetype vs AI vs manual)
├── KPI Grid (.sg.sg4)
│   ├── Active Plans   → 1,240 (blue)
│   ├── Completed      → 8,420 (green)
│   ├── AI Plans       → 340   (purple)
│   └── Revenue        → ₵124K (gold)
├── Filter Bar (.fbar)
│   ├── 🔍 Search
│   ├── Type (Archetype, AI-Generated, Manual)
│   ├── Difficulty
│   ├── Duration
│   └── 📥 Export  +  + Create Plan  +  🤖 AI Generate
├── Content Grid (.g2)
│   ├── Card: "📋 Active Plans"
│   │   └── Table: Plan | Type | Difficulty | Duration | Users | Revenue | Status | Actions
│   └── Card: "📊 Plan Performance"
│       └── 4 metrics + mini table of top plans by revenue
└── Card: "⚡ Super Admin Commands — Plans"
    └── 6 QA buttons
        ├── 📋 AI Generate Plan  → openModal('m-ai-plan')
        ├── 📋 Bulk Update
        ├── 📋 Export Analytics
        ├── 📋 Review AI Plans
        ├── 📋 Pricing Rules
        └── 📋 Plan Templates
```

#### Modal: Create Plan (`m-add-plan`)
- Plan Name, Type selector, Tier, Level, Days/Week, Weeks, Exercise schedule builder

#### Modal: AI Generate Plan (`m-ai-plan`)
- Profile hash input, AI cost estimator, generate button

---

### 5.4 Challenges (`tc-fit-ch`)

```
Challenges Tab
├── Alert (.alert.al-b)
│   └── "Fitness Challenges" description
├── KPI Grid (.sg.sg4)
│   ├── Active Challenges → 48  (blue)
│   ├── Participants    → 3,240 (green)
│   ├── Completion Rate → 62%   (gold)
│   └── FitCoins Awarded → 284K (purple)
├── Filter Bar (.fbar)
│   ├── 🔍 Search
│   ├── Status (Active, Upcoming, Draft, Ended)
│   ├── Type (Distance, Streak, Reps, Time, Group, AI-Generated)
│   └── 📥 Export  +  + New Challenge  +  🤖 AI Generate
├── Content Grid (.g2)
│   ├── Card: "🏆 Active Challenges"
│   │   └── Table: Challenge | Type | Participants | Progress | Reward | Dates | Status | Actions
│   └── Card: "📊 Challenge Performance"
│       └── 4 metrics + leaderboard preview
└── Card: "⚡ Super Admin Commands — Challenges"
    └── 6 QA buttons
        ├── 📋 AI Generate Challenge → openModal('m-ai-challenge')
        ├── 📋 Leaderboards
        ├── 📋 FitCoins Audit
        ├── 📋 Export Analytics
        ├── 📋 Review Submissions
        └── 📋 Challenge Templates
```

#### Modal: New Challenge (`m-add-challenge`)
- Name, type, goal, dates, reward, tier eligibility

#### Modal: AI Generate Challenge (`m-ai-challenge`)
- Context input, platform insights auto-populate, 3 AI concept options

---

### 5.5 Fitness Users (`tc-fit-usr`)

```
Fitness Users Tab
├── Alert (.alert.al-b)
│   └── "Fitness Users" description
├── KPI Grid (.sg.sg4)
│   ├── Total Users   → 3,840 (blue)
│   ├── Active (7d)   → 2,140 (green)
│   ├── Premium       → 840   (gold)
│   └── Churn Risk    → 124   (red)
├── Filter Bar (.fbar)
│   ├── 🔍 Search by name, email, ID
│   ├── Plan tier
│   ├── Activity level
│   ├── Subscription status
│   └── 📥 Export  +  + Invite User
├── Content Grid (.g2)
│   ├── Card: "👥 Fitness Users"
│   │   └── Table: User | Plan | Activity | Streak | Last Workout | Status | Actions
│   │       └── Action: 👁️ View → openSidePanel('fitness-user-john-mensah')
│   └── Card: "📊 User Analytics"
│       └── 4 metrics + cohort breakdown
└── Card: "⚡ Super Admin Commands — Users"
    └── 6 QA buttons (Bulk Actions, Segments, Export, etc.)
```

**Side Panel Mockup**: `fitness-user-john-mensah` — User profile detail panel

---

### 5.6 Trainers (`tc-fit-tr`)

```
Trainers Tab
├── Alert (.alert.al-b)
│   └── "Trainer Directory" description
├── KPI Grid (.sg.sg4)
│   ├── Total Trainers   → 48  (blue)
│   ├── Verified         → 36  (green)
│   ├── Pending Review   → 8   (gold)
│   └── Top Rated        → 12  (purple)
├── Filter Bar (.fbar)
│   ├── 🔍 Search
│   ├── Specialisation
│   ├── Location
│   ├── Verification status
│   └── 📥 Export  +  + Add Trainer
├── Content Grid (.g2)
│   ├── Card: "👨‍🏫 Trainers"
│   │   └── Table: Trainer | Title | Specialisations | Location | Experience | Rating | Status | Actions
│   │       └── Action: 👁️ View → openSidePanel('trainer-ama-owusu')
│   └── Card: "📊 Trainer Performance"
│       └── 4 metrics + top rated list
└── Card: "⚡ Super Admin Commands — Trainers"
    └── 6 QA buttons
```

#### Modal: Add Trainer (`m-add-trainer`)
- Name, title, credentials, specialisations, location, experience years, bio, photo

**Side Panel Mockup**: `trainer-ama-owusu` — Trainer profile detail panel

---

### 5.7 Schedule (`tc-fit-sched`)

```
Schedule Tab
├── Alert (.alert.al-b)
│   └── "Content Schedule" description
├── KPI Grid (.sg.sg4)
│   ├── Scheduled Today  → 12  (blue)
│   ├── This Week        → 84  (green)
│   ├── Pending Approval → 4   (gold)
│   └── Missed           → 2   (red)
├── Filter Bar (.fbar)
│   ├── 🔍 Search
│   ├── Content type
│   ├── Status
│   ├── Date range
│   └── 📥 Export  +  + Schedule Content
├── Content Grid (.g2)
│   ├── Card: "📅 Content Calendar"
│   │   └── Table: Content | Type | Target | Date/Time | Status | Actions
│   └── Card: "📊 Schedule Analytics"
│       └── Engagement metrics
└── Card: "⚡ Super Admin Commands — Schedule"
    └── 6 QA buttons
        ├── 📋 Edit Templates → openModal('m-schedule-templates')
        ├── 📋 Bulk Reminder → openModal('m-schedule-bulk')
        ├── 📋 Export Calendar
        ├── 📋 Review Queue
        ├── 📋 Auto-Schedule Rules
        └── 📋 Notification Settings
```

#### Modal: Edit Notification Templates (`m-schedule-templates`)
- Template editor for workout reminders, streak alerts, challenge updates

#### Modal: Send Bulk Reminder (`m-schedule-bulk`)
- Target segment, message, scheduling

**Side Panel Mockup**: `schedule-admin` — Schedule admin commands detail

---

### 5.8 AI Studio (`tc-fit-ai`)

```
AI Studio Tab
├── Alert (.alert.al-b)
│   └── "AI Content Generation" description
├── KPI Grid (.sg.sg4)
│   ├── AI Models Active  → 4   (blue)
│   ├── Tokens Used (7d)  → 2.4M (green)
│   ├── Cost Estimate     → ₵4,200 (gold)
│   └── Avg Latency       → 1.2s (purple)
├── Filter Bar (.fbar)
│   ├── 🔍 Search campaigns
│   ├── Model type
│   ├── Status
│   └── 📥 Export  +  + New AI Campaign
├── Content Grid (.g2)
│   ├── Card: "🤖 AI Campaigns"
│   │   └── Table: Campaign | Model | Type | Status | Created | Actions
│   │       └── Action: 👁️ View → openSidePanel('ai-studio-streak')
│   └── Card: "📊 AI Performance"
│       └── Token usage chart, cost breakdown, latency trends
└── Card: "⚡ Super Admin Commands — AI Studio"
    └── 6 QA buttons
        ├── 📋 AI Settings
        ├── 📋 Model Config
        ├── 📋 Export Logs
        ├── 📋 Cost Alerts
        ├── 📋 Prompt Library
        └── 📋 API Keys
```

**Side Panel Mockup**: `ai-studio-streak` — AI campaign detail panel

---

### 5.9 AI Log (`tc-fit-log`)

```
AI Log Tab
├── Alert (.alert.al-b)
│   └── "AI Call Logging" description
├── KPI Grid (.sg.sg4)
│   ├── Total Calls (24h) → 1,240 (blue)
│   ├── Success Rate      → 96%   (green)
│   ├── Avg Response Time → 1.2s  (gold)
│   └── Errors            → 48    (red)
├── Filter Bar (.fbar)
│   ├── 🔍 Search by ID, prompt, user
│   ├── Model
│   ├── Status (Success, Error, Timeout)
│   ├── Date range
│   └── 📥 Export
├── Content Grid (.g2)
│   ├── Card: "📞 AI Call Log"
│   │   └── Table: Call ID | Model | Prompt Snippet | User | Status | Response Time | Timestamp | Actions
│   │       └── Action: 👁️ View → openSidePanel('ai-log-fit-ai-0882')
│   └── Card: "📊 AI Analytics"
│       └── Error breakdown, model comparison, latency distribution
└── Card: "⚡ Super Admin Commands — AI Log"
    └── 6 QA buttons
```

**Side Panel Mockup**: `ai-log-fit-ai-0882` — AI call detail panel

---

### 5.10 Outdoor (`tc-fit-outdoor`)

```
Outdoor Tab
├── Alert (.alert.al-b)
│   └── "Outdoor Fitness" description
├── KPI Grid (.sg.sg4)
│   ├── Outdoor Users   → 1,420 (green)
│   ├── Verified Routes → 48   (blue)
│   ├── Pending Routes  → 12   (orange)
│   └── Group Events    → 5    (purple)
├── Outdoor Sub-Tabs (#outdoor-tabs)
│   ├── tc-out-routes      → 🗺️ Routes
│   ├── tc-out-events      → 📅 Group Events
│   ├── tc-out-challenges  → 🏆 Outdoor Challenges
│   ├── tc-out-incentives  → 💰 Incentives
│   └── tc-out-reviews     → ⭐ Reviews
│
├── Sub-Tab: Routes
│   ├── Filter Bar: search, category, verification, difficulty, surface, status
│   ├── Card: "🗺️ Pending Verification Queue" (table)
│   │   └── Action: 👁️ View → openSidePanel('achimota-forest-trail')
│   ├── Card: "📊 Route Analytics"
│   └── Card: "🗺️ All Routes" (table)
│       └── Action: 👁️ View → openSidePanel('oxford-street-loop') / openSidePanel('aburi-hills-hike')
│
├── Sub-Tab: Group Events
│   ├── Filter Bar + Add Event button
│   ├── Card: "📅 Upcoming Group Events" (table)
│   │   └── Action: 👁️ View → openSidePanel('aburi-hills-hike')
│   └── Card: "📊 Event Performance"
│
├── Sub-Tab: Outdoor Challenges
│   ├── Filter Bar + New Challenge button
│   ├── Card: "🏆 Outdoor Challenges" (table)
│   │   └── Action: 👁️ View → openSidePanel('group-run-saturdays')
│   └── Card: "📊 Challenge Analytics"
│
├── Sub-Tab: Incentives
│   └── FitCoins & reward management
│
└── Sub-Tab: Reviews
    ├── Filter Bar
    ├── Card: "⭐ Recent Reviews" (table)
    │   └── Action: 👁️ View → openSidePanel('oxford-street-reviews')
    └── Card: "📊 Review Analytics"
```

#### Modals
- `m-add-route` — Add Route
- `m-verify-route` — Verify Route
- `m-add-group-event` — Add Group Event
- `m-view-participants` — View Participants
- `m-add-outdoor-challenge` — New Outdoor Challenge
- `m-manage-leaderboard` — Leaderboards

**Side Panel Mockups**: `achimota-forest-trail`, `oxford-street-loop`, `aburi-hills-hike`, `group-run-saturdays`, `oxford-street-reviews`

---

### 5.11 Health Integrations (`tc-fit-health`)

```
Health Integrations Tab
├── Alert (.alert.al-b)
│   └── "Wearable & Health Platform Sync" description
├── KPI Grid (.sg.sg4)
│   ├── Active Syncs     → 2,840 (green)
│   ├── iOS Users        → 1,240 (blue)
│   ├── Android Users    → 980   (purple)
│   └── Wearable-only    → 620   (gold)
├── Content Grid (.g2)
│   ├── Card: "🔗 Connected Platforms"
│   │   └── Platform list with toggle/status
│   │       ├── 🍎 Apple HealthKit
│   │       ├── 🤖 Google Health Connect
│   │       ├── ⌚ Fitbit
│   │       ├── 💍 Oura Ring
│   │       └── 🏃 Strava
│   └── Card: "📊 Sync Stats"
│       └── Platform breakdown bars
│           ├── iOS Users (HealthKit) — 1,240 / 4,200
│           ├── Android Users (Health Connect) — 980 / 4,047
│           ├── Wearable-only Users — 620 / 2,840
│           └── Permission Denied / Revoked — 340
│       └── Platform Settings section
│           ├── Auto-sync frequency (select)
│           ├── Enable HealthKit (toggle)
│           ├── Enable Health Connect (toggle)
│           └── Sync historical data (toggle)
├── Card: "🔴 Recent Sync Failures"
│   └── Table: User | Platform | Error | Failed At | Retries | Actions
└── Card: "⚡ Super Admin Commands — Health Integrations"
    └── 6 QA buttons
        ├── 📋 Add Platform → openModal('m-add-health-platform')
        ├── 📋 Sync Now
        ├── 📋 Export Logs
        ├── 📋 API Settings
        ├── 📋 Webhook Config
        └── 📋 Data Retention
```

#### Modal: Add Health Platform (`m-add-health-platform`)
- Platform name, API credentials, data type mapping

---

### 5.12 WhatsApp Community (`tc-fit-whatsapp`)

```
WhatsApp Community Tab
├── Alert (.alert.al-b)
│   └── "WhatsApp Community" description
├── KPI Grid (.sg.sg4)
│   ├── Community Members → 842   (green)
│   ├── Active Groups     → 5     (blue)
│   ├── Messages Sent     → 12.4K (purple)
│   └── Avg Open Rate     → 68%   (gold)
├── Content Grid (.g2)
│   ├── Card: "💬 Fitness Groups"
│   │   └── Table: Group | Members | Type | Last Message | Status | Actions
│   │       └── Action: 👁️ View  📢 Broadcast  ⚙️ Settings
│   └── Card: "📢 Quick Broadcast"
│       └── Form: Target Group, Broadcast Type, Message textarea
│           └── Buttons: Send Now, Schedule, Preview, Attach Media
├── Card: "📨 Recent Broadcasts"
│   └── Table: Sent | Group | Type | Preview | Sent To | Open Rate | Status | Actions
└── Card: "⚡ Super Admin Commands — WhatsApp Community"
    └── 6 QA buttons
        ├── 📋 Bulk Broadcast → openModal('m-whatsapp-broadcast')
        ├── 📋 Manage Groups → openModal('m-whatsapp-groups')
        ├── 📋 Engagement Report
        ├── 📋 Connect WhatsApp API
        ├── 📋 Export Members
        └── 📋 Auto-Reply Rules
```

#### Modals
- `m-whatsapp-broadcast` — Bulk Broadcast composer
- `m-whatsapp-groups` — Group management CRUD

---

## 6. Component Primitives Used in Fitness

All standard admin-panel primitives apply:
- `.card` / `.card-h` / `.card-b` / `.card-t` — Card containers
- `.sg` / `.sg4` / `.sg6` — Stat grids
- `.sc` — Stat cards with icon, value, label, delta
- `.fbar` — Filter / command bars
- `.tbl` / `table` — Data tables with `thead`/`tbody`, row actions `.ra` / `.ra-btn`
- `.alert` / `.al-b` / `.al-ic` — Info banners
- `.btn` / `.btn-p` / `.btn-s` / `.btn-sm` — Buttons
- `.fg` / `.fg2` — Form groups
- `.finp` / `.fsel` / `.ftxt` — Form inputs
- `.b` — Status badges
- `.pbar` / `.pbar-f` — Progress bars
- `.qa-btn` — Quick action grid buttons
- `.tabs` / `.tab` / `.tc` — Tab system
- `.pag` / `.pb` — Pagination

---

## 7. JavaScript Functions (Fitness-Specific)

| Function | File Location | Purpose |
|----------|---------------|---------|
| `updateExercisePreview()` | admin-panel.html:10073 | Reads `#ex-benefits` and `#ex-muscles`, renders live preview into `#preview-benefits` / `#preview-muscles` |
| `semicolonToList(raw, title)` | admin-panel.html:10061 | Splits `;`-separated string, trims, filters empty, returns `<ul>` HTML or placeholder `<em>` |
| `openSidePanel(title, key)` | admin-panel.html (global) | Opens right panel with `RP_CONTENTS[key]` |
| `closeSidePanel()` | admin-panel.html (global) | Closes right panel |
| `openModal(id)` | admin-panel.html (global) | Opens modal by ID |
| `closeModal(id)` | admin-panel.html (global) | Closes modal by ID |
| `switchTab(el, tabId, groupId)` | admin-panel.html (global) | Switches tabs within fitness or outdoor sub-tabs |
| `showPage('fitness', ...)` | admin-panel.html (global) | Entry point to fitness page |

---

## 8. Right-Side Panel Content Keys (Fitness)

| Key | Trigger Source | Content Summary |
|-----|----------------|-----------------|
| `achimota-forest-trail` | Outdoor → Routes → View | Route detail mockup (map, stats, photos, safety info) |
| `oxford-street-loop` | Outdoor → Routes → View | Route detail mockup |
| `aburi-hills-hike` | Outdoor → Routes / Events → View | Route + event detail mockup |
| `group-run-saturdays` | Outdoor → Challenges / Events → View | Challenge + event detail mockup |
| `oxford-street-reviews` | Outdoor → Reviews → View | Reviews moderation detail mockup |
| `ai-log-fit-ai-0882` | AI Log → View | AI call log detail mockup |
| `ai-studio-streak` | AI Studio → View | AI campaign detail mockup |
| `schedule-admin` | Schedule → Admin commands | Schedule admin commands detail |
| `trainer-ama-owusu` | Trainers → View | Trainer profile detail mockup |
| `fitness-user-john-mensah` | Fitness Users → View | Fitness user profile detail mockup |

---

## 9. Data Flow Summary

```
Fitness Page
├── Exercises → CRUD via table + m-add-exercise modal (with Benefits/Muscles live preview)
├── Plans → Table + m-add-plan / m-ai-plan modals
├── Challenges → Table + m-add-challenge / m-ai-challenge modals
├── Users → Table + invite flow + side panel detail view
├── Trainers → Table + m-add-trainer + side panel detail view
├── Schedule → Calendar table + template/bulk modals
├── AI Studio → Campaign table + AI generation + side panel detail
├── AI Log → Call log table + side panel detail view
├── Outdoor → Sub-tab system: routes/events/challenges/incentives/reviews + route/event modals + side panels
├── Health → Platform toggles + sync stats + failure table + m-add-health-platform
└── WhatsApp → Group table + broadcast composer + recent broadcasts + m-whatsapp-broadcast / m-whatsapp-groups
```
