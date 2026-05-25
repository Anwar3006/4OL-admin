# 4 Our Life — Admin Panel v2.0 Schema

> Generated from `admin-panel.html`  
> Last updated: May 23, 2026

---

## 1. Global Architecture

```
┌─────────────────────────────────────────────┐
│  LAYOUT                                      │
│  ┌────────┐  ┌──────────────────────────┐  │
│  │SIDEBAR │  │  MAIN                     │  │
│  │(fixed) │  │  ┌────────────────────┐  │  │
│  │ 218px  │  │  │  TOPBAR (sticky)   │  │  │
│  │        │  │  └────────────────────┘  │  │
│  │        │  │  ┌────────────────────┐  │  │
│  │        │  │  │  CONTENT            │  │  │
│  │        │  │  │  (page-* divs)      │  │  │
│  │        │  │  └────────────────────┘  │  │
│  └────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Z-Index Stack
| Layer | Z-Index | Element |
|-------|---------|---------|
| Sidebar | 50 | `.sb` |
| Topbar | 40 | `.topbar` |
| Mobile Bottom Nav | 200 | `.ts-bottom-nav` |
| Modal Backdrop | 200 | `.modal-bg` |
| Right Panel | 190 | `.rp-panel` |
| Toast | 9999 | `.ek-toast` |

---

## 2. Design System (CSS)

### Color Tokens
| Token | Hex | Usage |
|-------|-----|-------|
| `--g` | #059669 | Primary green (buttons, success) |
| `--gd` | #064E3B | Dark green (sidebar bg) |
| `--gl` | #ECFDF5 | Light green (alerts, badges) |
| `--gm` | #D1FAE5 | Green mid (borders, hover) |
| `--blue` | #2563EB | Info, links, secondary |
| `--red` | #DC2626 | Danger, errors, critical |
| `--gold` | #D97706 | Warnings, badges, stars |
| `--purp` | #7C3AED | Purple accent (AI, Pro tier) |
| `--teal` | #0D9488 | Teal accent (facilities) |
| `--orng` | #EA580C | Orange accent |
| `--indigo` | #4338CA | Indigo (AI hub) |
| `--pink` | #DB2777 | Pink (Period Tracker) |
| `--bg` | #F9FAFB | Page background |
| `--bd` | #E5E7EB | Borders |
| `--mu` | #6B7280 | Muted text |
| `--tx` | #111827 | Primary text |
| `--tx2` | #374151 | Secondary text |

### Typography
| Role | Font | Fallback |
|------|------|----------|
| Body | Source Sans 3 | Inter, Segoe UI, sans-serif |
| Headings / UI | Inter | Segoe UI, sans-serif |
| Monospace | JetBrains Mono | IBM Plex Mono, monospace |

### Spacing (8px grid)
- Base unit: 8px
- Card padding: 18px
- Gap (grid): 11–14px
- Section margin-bottom: 14–17px

### Animation Tokens (Emil Kowalski Design Engineering)
| Token | Value | Usage |
|-------|-------|-------|
| `--ek-fast` | 150ms | Micro-interactions |
| `--ek-base` | 250ms | Standard transitions |
| `--ek-slow` | 350ms | Emphasis animations |
| `--ek-ease` | `cubic-bezier(0.16,1,0.3,1)` | Primary ease-out |
| `--ek-spring` | `cubic-bezier(0.34,1.56,0.64,1)` | Button pop / spring |

### Component Primitives
- **Buttons**: `.btn` (primary, secondary, danger, etc.) — 34px height, 6px radius
- **Cards**: `.card` / `.sc` (stat card) — 12px radius, 1px border, shadow
- **Tables**: `.tbl` — rounded 12px, hover row highlight
- **Inputs**: `.finp`, `.fsel`, `.ftxt` — 8px radius, green focus ring
- **Badges**: `.b` — pill shape (9999px radius), 10px font
- **Modals**: `.modal-bg` → `.modal` — 14px radius, blur backdrop
- **Alerts**: `.alert` — 10px radius, left semantic color accent
- **Tabs**: `.tab` — animated underline, 12px font
- **Toggles**: `.toggle` → `.tgl-s` — 36×20px, spring knob
- **Progress Bars**: `.pbar` → `.pbar-f` — 4–5px height, rounded
- **Action Buttons**: `.ra-btn` — 27px square, hover scale 1.14
- **Dropdowns**: `.dd-wrap` → `.dd-menu` — 9px radius, shadow

---

## 3. Sidebar Navigation

### Structure
```
SIDEBAR (.sb)
├── .sb-logo         → Brand mark + version
├── .sb-sec           → Section header (uppercase, muted)
│   └── .sb-item      → Nav item (icon + label + optional badge/caret)
│       └── .sb-sub   → Collapsible sub-menu
│           └── .sb-child → Sub-nav item
├── .sb-div           → Divider line
├── .sb-sa-mod        → SA Module Connections panel (chip grid)
└── .sb-footer        → User avatar + name + role + ID badge
```

### Menu Sections & Items

#### Core
| Item | Icon | Target Page | Badge/Note |
|------|------|-------------|------------|
| Dashboard | 📊 | `page-dashboard` | — |
| Transactions | 💳 | `page-transactions` | 🔗 2 (module connections) |

#### Administration
| Item | Icon | Target | Sub-items |
|------|------|--------|-----------|
| Admins | 👥 | `page-admins` | All Admins, Roles & Permissions, Activity Logs, Security Center, Reports |
| Users | 👤 | `page-users` | All Users, IBP Businesses |
| Task Manager | 📋 | `page-tasks` | SA badge |

#### Health Services
| Item | Icon | Target | Sub-items / Notes |
|------|------|--------|-------------------|
| Facilities | 🏥 | `page-facilities` | All, Pending Approval, Top Rated, Featured; SA module chips (Reviews, Revenue, Map, Marketing, Notifs, IBPs) |
| Diseases & Conditions | 🦠 | `page-diseases` | — |
| Human Anatomy | 🫁 | `page-anatomy` | — |
| Symptoms | 🩺 | `page-symptoms` | — |
| Healthy Living | 🥗 | `page-healthy` | — |
| **Fitness** | 💪 | `page-fitness` | **Badge: 3** |
| Period Tracker | 📅 | `page-period` | — |
| Medication Reminder | 💊 | `page-medication` | Drug Database, Logged Reminders, Interactions |
| Healthcare Professionals | 👨‍⚕️ | `page-hcp` | Badge: 12; All, Pending (12), Group Chats |
| Jobs | 💼 | `page-jobs` | Badge: 24; All Listings, Post a Job, Applicants (24), Digital CVs, Premium Services |
| Medication Enquiry | 🔬 | `page-medenquiry` | Badge: 8; All, Pending (8), Escrow, Delivery |
| BedTracker (PKM) | 🛏️ | `page-bedtracker` | LIVE badge; Live Overview, Bed Registry, Facilities, Ambulance Dispatch, Analytics, Design & Strategy |

#### Engagement
| Item | Icon | Target | Note |
|------|------|--------|------|
| Reviews & Ratings | ⭐ | `page-reviews` | 🔗 Fac |
| Map | 🗺️ | `page-map` | 🔗 Fac |

#### Growth
| Item | Icon | Target | Sub-items |
|------|------|--------|-----------|
| Marketing | 📣 | `page-marketing` | Badge: 2; Campaigns, Subscriptions, Discounts; SA connected chips |
| Chats | 💬 | `page-chats` | Badge: 5; Groups, Support |
| FacilityScout | 🔍 | `page-facilityscout` | Badge: 14; All, Pending Review (6), Rewards Queue (8), Leaderboard, Settings |
| FAQ | ❓ | `page-faq` | — |
| Notifications | 🔔 | `page-notifications` | Badge: 3 |

#### AI Intelligence
| Item | Icon | Target | Sub-items |
|------|------|--------|-----------|
| AI Hub | 🤖 | `page-ai` | AI Models, AI Moderation, Recommendations, AI Analytics |

#### Platform
| Item | Icon | Target |
|------|------|--------|
| Security Center | 🔐 | `page-security` |
| Platform Schematic | 🗂️ | `page-schematic` |
| Settings | ⚙️ | `page-settings` |
| Delete Account Requests | 🗑️ | `page-delete-account` | Badge: 4 |
| Logout | 🚪 | — | Confirmation prompt |

---

## 4. Main Content Pages

### Page Container Pattern
Each page is a `<div id="page-{ID}" class="page">` inside `.content`. Only one `.page.active` is visible at a time via `showPage(id, element, breadcrumb)`.

### Page Inventory

| # | Page ID | Title | Tabs / Sub-pages | Key Components |
|---|---------|-------|------------------|------------------|
| 1 | `page-dashboard` | 📊 Platform Dashboard | — | 8 KPI stat cards, Revenue SVG chart, System Health card, Quick Actions, Revenue Streams donut, Users by Plan breakdown, Feature Usage bars, Live Activity Feed, AI Hub Overview, Regional Coverage, Health Features Status, Pending Tasks, Compliance & GRA |
| 2 | `page-admins` | 👥 Admin Management | All Admins, Roles & Permissions, Activity Logs, Security Center, Reports | 6 KPI cards, Super Admin command bar, Admin table (6 cols + actions), Role permission cards (grid), MFA alerts |
| 3 | `page-users` | 👤 Users | — | User table, search/filter |
| 4 | `page-ibp` | 🏢 IBP Businesses | — | IBP table, search, bulk actions |
| 5 | `page-tasks` | 📋 Task Manager | — | Kanban columns (tk-col / tk-card) |
| 6 | `page-facilities` | 🏥 Facilities | Pending Approval, Top Rated, Featured | Facility table, approval queue, SA commands |
| 7 | `page-diseases` | 🦠 Diseases & Conditions | — | Condition table, ICD-11 codes |
| 8 | `page-anatomy` | 🫁 Human Anatomy | — | SVG body map (male/female), body region cards, gender toggle |
| 9 | `page-symptoms` | 🩺 Symptoms | All Symptoms, High Severity, Drafts, AI Mappings | 6 KPI cards, symptom table, AI confidence scores |
| 10 | `page-healthy` | 🥗 Healthy Living | All Articles, Nutrition, Sleep, Mental Wellness, Drafts | 6 KPI cards, article table, category filters |
| 11 | `page-fitness` | 💪 Fitness | **11 tabs** — see Fitness Schema below | 6 KPI cards, exercise library, plans, challenges, users, trainers, schedule, AI studio, outdoor, health integrations, WhatsApp |
| 12 | `page-period` | 📅 Period Tracker | Overview, User Data, Calendar Notes, Marketing, Content, AI Model | 6 KPI cards, cycle data table, symptom trends, calendar notes aggregated view, marketing campaigns |
| 13 | `page-medication` | 💊 Medication Reminder | Drug Database, Logged Reminders, Interactions | Drug table, reminder logs, interaction checker |
| 14 | `page-hcp` | 👨‍⚕️ Healthcare Professionals | All, Pending Approval, Group Chats | HCP table, license verification, group chat assignments |
| 15 | `page-jobs` | 💼 Jobs | All Listings, Post a Job, Applicants, Digital CVs, Premium Services | Job listings table, applicant pipeline, CV viewer |
| 16 | `page-medenquiry` | 🔬 Medication Enquiry | All, Pending, Escrow, Delivery | Enquiry cards, pharmacy response table, escrow badges |
| 17 | `page-bedtracker` | 🛏️ BedTracker (PKM) | Live Overview, Bed Registry, Facilities, Ambulance Dispatch, Analytics, Design & Strategy | Ward grid, bed status badges, map footprint, ambulance routes, strategy cards |
| 18 | `page-reviews` | ⭐ Reviews & Ratings | — | Review table, moderation queue |
| 19 | `page-map` | 🗺️ Map | — | Interactive map, facility dots, footprint toggle, collector trails |
| 20 | `page-marketing` | 📣 Marketing | — | Campaign table, performance metrics |
| 21 | `page-subscriptions` | ⭐ Subscriptions | — | Plan breakdown, subscriber table |
| 22 | `page-discounts` | 🏷️ Discounts | — | Promo code table, usage stats |
| 23 | `page-chats` | 💬 Chats | Groups, Support | Group table, support ticket queue |
| 24 | `page-facilityscout` | 🔍 FacilityScout | All, Pending, Rewards, Leaderboard, Settings | Scout submission table, reward tiers, leaderboard grid |
| 25 | `page-faq` | ❓ FAQ | — | FAQ accordion, category filters |
| 26 | `page-notifications` | 🔔 Notifications | — | Notification log, broadcast history |
| 27 | `page-ai` | 🤖 AI Hub | Models, Moderation, Recommendations, Analytics | AI model cards, moderation queue, recommendation stats, cost analytics |
| 28 | `page-security` | 🔐 Security Center | — | Security score, MFA status, session table, IP whitelist |
| 29 | `page-schematic` | 🗂️ Platform Schematic | — | Architecture diagram (arch-layer / arch-node), system dependency map |
| 30 | `page-settings` | ⚙️ Settings | — | Platform config toggles, regional settings, integration keys |
| 31 | `page-delete-account` | 🗑️ Delete Account Requests | — | Request table, status pipeline, GDPR/GH-DPA compliance actions |
| 32 | `page-transactions` | 💳 Transactions | — | Transaction table (dark), KPI cards, revenue charts, VAT breakdown |

---

## 5. Modals

### Modal Pattern
```
.modal-bg.hidden (backdrop, blur, z-200)
└── .modal / .modal-lg / .modal-xl
    ├── .mh (header: title + subtitle + close button)
    ├── .mb (body: scrollable, form fields, cards)
    └── .mft (footer: action buttons, aligned right)
```

### Modal Inventory

| ID | Title | Size | Key Fields |
|----|-------|------|------------|
| `m-search` | Search | — | Global search input |
| `m-notifications` | Notifications | — | Notification list, unread counter |
| `m-messages` | Messages | — | Message threads |
| `m-profile` | Admin Profile | — | User profile view/edit |
| `m-broadcast` | Send Broadcast | — | Broadcast message composer |
| `m-sa-cmds` | Super Admin Commands | — | SA-only action grid |
| `m-roles` | Manage Roles | — | Role CRUD, permission matrix |
| `m-invite` | Invite Admin | — | Email, role selector |
| `m-view-admin` | View Admin | — | Read-only admin detail |
| `m-edit-admin` | Edit Admin | — | Admin edit form |
| `m-sessions` | Sessions | — | Active session list, kill session |
| `m-add-condition` | Add New Condition | `modal-lg` | Name, ICD-11, category, severity, description, symptoms, specialist, NHIS coverage, status, carousel flag |
| `m-feature-carousel` | Feature on Carousel | — | Condition selector, position, dates, banner URL |
| `m-add-facility` | Register New Facility | `modal-lg` (860px) | Facility type, name, ownership, NHIS, contact, GPS, location, amenities, services, keywords, owner details, operating hours, field collector info |
| `m-approve-facility` | Review Pending Facility | `modal-lg` (900px) | SA-only; dual-column review layout, SLA alert, approve/reject actions |
| `m-invite-user` | Invite User | — | First/last name, phone, email, default plan, region, invitation note |
| `m-register-ibp` | Register IBP Business | `modal-lg` (680px) | Business identity, owner/contact, location, registration documents, platform settings, IBP type validation warning |
| `m-create-campaign` | Create Campaign | — (920px max) | Two-column layout: left form (type, org, headline, content, dates, media drag-drop, CTA), right live preview |
| `m-create-task` | Create New Task | — | Title, description, assignee, priority, category, due date, status |
| `m-review-biz-campaign` | Review Business Campaign | `modal-lg` | Campaign details card, ad creative preview, review notes, approved dates |
| `m-create-discount` | Create Promo Code | — | Code, discount type/value, eligible plans/users, usage limits, dates, linked campaign |
| `m-add-exercise` | **Add Exercise** | `modal-lg` | **Exercise Name, Description, Primary Muscle Group, Secondary Muscles, Equipment, Exercise Type, Difficulty, Default Sets, Default Reps/Duration, Rest Time, Video URL, Benefits (semicolon-separated textarea), Muscles Worked (semicolon-separated textarea), Live Preview box, Status** |
| `m-hcp-onboard` | Onboard HCP | `modal-lg` | Full name, profession, specialty, regulatory body, license number, year licensed, affiliated facility, region, phone, email, group chat assignment, document uploads, medication enquiry permission |
| `m-create-group` | Create Chat Group | `modal-lg` (680px) | Group name, description, category, type, max members, region restriction, admin assignment, permissions grid, group rules |
| `m-view-group` | Group Details | `modal-lg` (680px) | 4 stat cards, name/category edit, type/status, admin list with remove actions, permissions read-only |
| `m-add-route` | Add Route | — | Route name, category, distance, difficulty, surface, GPS trace upload |
| `m-add-plan` | Create Plan | — | Plan name, type (archetype/AI/manual), tier, level, days/week, weeks, exercise schedule builder |
| `m-ai-plan` | AI Generate Plan | — | Profile hash input, AI cost estimator, generate button |
| `m-add-challenge` | New Challenge | — | Name, type, goal, dates, reward, tier eligibility |
| `m-ai-challenge` | AI Generate Challenge | — | Context input, platform insights auto-populate, 3 AI concept options |
| `m-add-trainer` | Add Trainer | — | Name, title, credentials, specialisations, location, experience, bio, photo |
| `m-schedule-templates` | Edit Notification Templates | — | Template editor for workout reminders, streak alerts, challenge updates |
| `m-schedule-bulk` | Send Bulk Reminder | — | Target segment, message, scheduling |
| `m-add-health-platform` | Add Health Platform | — | Platform name, API credentials, data type mapping |
| `m-whatsapp-broadcast` | Bulk Broadcast | — | Group selector, message, scheduling |
| `m-whatsapp-groups` | Manage Groups | — | CRUD for WhatsApp community groups |
| `m-verify-route` | Verify Route | — | Route review, approve/reject |
| `m-add-group-event` | Add Group Event | — | Event name, route, date/time, host, capacity |
| `m-view-participants` | View Participants | — | Participant list, check-in status |
| `m-add-outdoor-challenge` | New Outdoor Challenge | — | Name, type, route requirement, reward |
| `m-manage-leaderboard` | Leaderboards | — | Challenge leaderboard editor |
| `m-period-campaign` | Send Campaign | — | Target segment by cycle phase, message composer |

---

## 6. Right-Side Detail Panel (RP)

### Structure
```
.rp-overlay (backdrop, z-180)
.rp-panel (fixed right, 520px, z-190, slide-in transform)
├── .rp-header (title + close)
└── .rp-body (scrollable content)
```

### RP_CONTENTS Keys (Mockup Side Panels)
| Key | Content Type | Trigger Location |
|-----|--------------|------------------|
| `achimota-forest-trail` | Route detail mockup | Outdoor → Routes table |
| `oxford-street-loop` | Route detail mockup | Outdoor → Routes table |
| `aburi-hills-hike` | Route / event detail mockup | Outdoor → Routes / Events table |
| `group-run-saturdays` | Challenge / event detail mockup | Outdoor → Challenges / Events table |
| `oxford-street-reviews` | Reviews detail mockup | Outdoor → Reviews table |
| `ai-log-fit-ai-0882` | AI call log detail mockup | AI Log → View action |
| `ai-studio-streak` | AI campaign detail mockup | AI Studio → View campaign |
| `schedule-admin` | Schedule commands detail mockup | Schedule → Admin commands |
| `trainer-ama-owusu` | Trainer profile mockup | Trainers → View action |
| `fitness-user-john-mensah` | Fitness user profile mockup | Fitness Users → View action |

---

## 7. JavaScript Functions

### Navigation
| Function | Purpose |
|----------|---------|
| `showPage(id, el, bc)` | Switches `.page.active`, updates sidebar active state, sets breadcrumb |
| `showPageTab(pageId, tabId, el, bc)` | Shows a specific page + activates a specific tab |
| `switchTab(el, tabId, groupId)` | Tab switching within a page |
| `toggleSub(subId, caretId)` | Sidebar accordion open/close |

### Modals
| Function | Purpose |
|----------|---------|
| `openModal(id)` | Removes `.hidden`, adds `.ek-open` for animation |
| `closeModal(id)` | Adds `.hidden`, removes `.ek-open` |

### Side Panel
| Function | Purpose |
|----------|---------|
| `openSidePanel(title, contentKey)` | Opens RP panel, injects title + RP_CONTENTS[contentKey] |
| `closeSidePanel()` | Closes RP panel |

### Fitness-Specific JS
| Function | Purpose |
|----------|---------|
| `semicolonToList(raw, title)` | Parses `;`-separated string into HTML `<ul>` list |
| `updateExercisePreview()` | Live preview for Benefits & Muscles Worked fields in `m-add-exercise` |

### Campaign
| Function | Purpose |
|----------|---------|
| `updateCampaignPreview()` | Real-time campaign preview sync |
| `handleCampaignMediaDrop(e)` | Drag-and-drop media upload |
| `handleCampaignMediaSelect(input)` | File input media upload |
| `applyCampaignMedia(file)` | Render preview image/video |
| `saveCampaignDraft()` | Draft save + toast |
| `scheduleCampaign()` | Validation + schedule + toast |

### IBP
| Function | Purpose |
|----------|---------|
| `ibpSearch(val)` | Client-side IBP table search |
| `ibpFilter(type, val)` | IBP table filter by attribute |
| `ibpSort(by)` | IBP table sort (alpha, newest, oldest, premium) |
| `ibpBulk(action)` | Bulk action confirmation + alert |
| `validateIBPType(val)` | Real-time IBP type restriction validation |

### Task Manager
| Function | Purpose |
|----------|---------|
| `createTask()` | Task creation validation + toast |

### Design Engineering (Emil Kowalski)
| Function | Purpose |
|----------|---------|
| `ekCountUp(el)` | Animated number count-up |
| `ekAnimatePage(pageEl)` | Trigger count-ups on page show |
| `ekStaggerRows(pageEl)` | Table row stagger entrance |
| `ekToast(msg, type)` | Toast notification (success, error, info, warn) |

### Density & Sidebar
| Function | Purpose |
|----------|---------|
| `tsDensityToggle()` | Toggle compact/comfortable table density |
| `tsSidebarToggle()` | Collapse/expand sidebar (58px ↔ 218px) |

---

## 8. Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `max-width: 1400px` | `.sg6` → 3 columns; `.roles-g` → 2 columns; `.ts-g` → 2 columns |
| `max-width: 1100px` | `.g75`, `.g2` → 1 column; `.g3` → 2 columns |
| `max-width: 1024px` (tablet) | `.sg6` → 3 col; `.sg4` → 2 col; `.g3` → 2 col; `.roles-g` → 2 col; tables scroll-x |
| `max-width: 767px` (mobile) | Sidebar hidden off-canvas (transform); `.main` margin-left 0; bottom nav visible; `.sg6/.sg4` → 2 col; all grids → 1 col; content padding 14px; density toggle hidden |

---

## 9. Accessibility

- **Focus indicators**: `outline: 2px solid var(--g)` on all interactive elements
- **ARIA roles**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on modals; `role="tablist"`, `role="tab"`, `role="tabpanel"` on tabs; `role="toolbar"` on filter bars; `role="group"` on row action buttons
- **Reduced motion**: `@media(prefers-reduced-motion:reduce)` disables all animations, sets transitions to 0.01ms
- **Keyboard**: Tab navigation through sidebar, tabs, tables, modals
