# 4 Our Life — Admin Panel: Chats Menu Schema

> Generated from `admin-panel.html` (Chats section)  
> Module: Chats — Group Chats & Support Tickets Management  
> Last updated: May 23, 2026

---

## 1. File Metadata

| Property | Value |
|----------|-------|
| **File** | `admin-panel.html` |
| **Module** | Chats — Admin Management |
| **Page ID** | `page-chats` |
| **Sidebar Entry** | 💬 Chats (direct page) |
| **Related Sidebar** | HCP → 💬 Group Chats (sub-item) |
| **Design System** | 4OL Admin Panel (PKM Theme derivative) |
| **Tables Referenced** | `chat_groups`, `chat_group_members`, `chat_messages`, `support_tickets`, `support_ticket_messages`, `users` |

---

## 2. Global Architecture

```
┌─────────────────────────────────────────────┐
│  Admin Panel Layout                         │
│  ┌────────┬─────────────────────────────┐  │
│  │Sidebar │  Main Content Area          │  │
│  │        │  ┌───────────────────────┐  │  │
│  │ 💬     │  │ Page Header           │  │  │
│  │ Chats  │  │   Title + Actions     │  │  │
│  │        │  ├───────────────────────┤  │  │
│  │        │  │ Module Connections    │  │  │
│  │        │  ├───────────────────────┤  │  │
│  │        │  │ 5 KPI Stat Cards      │  │  │
│  │        │  ├───────────────────────┤  │  │
│  │        │  │ Tab Bar (2 tabs)      │  │  │
│  │        │  ├───────────────────────┤  │  │
│  │        │  │ Tab Content           │  │  │
│  │        │  │   ├─ Groups Table     │  │  │
│  │        │  │   └─ Support Table    │  │  │
│  │        │  └───────────────────────┘  │  │
│  │        │                           │  │
│  │        │  Modals (overlay)         │  │
│  │        │   ├─ Create Group         │  │
│  │        │   └─ View/Edit Group      │  │
│  └────────┴─────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 3. Sidebar Navigation

| Path | Element | onclick | Label |
|------|---------|---------|-------|
| Direct | `.sb-item` | `showPage('chats',this,'Chats')` | 💬 Chats |
| HCP Sub | `.sb-child` | `showPageTab('hcp','tc-hcp-chats',this,'HCP – Group Chats')` | 💬 Group Chats |

---

## 4. Page Header

| Element | Class / ID | Content |
|---------|-----------|---------|
| Title | `.ptitle` | 💬 Chats |
| Subtitle | `.psub` | Group chats management · User support tickets · Platform-wide communication |
| Left Actions | `.ph-l` | Title + Subtitle |
| Right Actions | `.ph-r` | 📥 Export (btn-s) · + New Group (btn-p) → `openModal('m-create-group')` |

---

## 5. Module Connections Alert

| Property | Value |
|----------|-------|
| Alert Type | `.alert.al-g` (green info) |
| Icon | 🔗 |
| Label | **SA: Module Connections** |
| Linked Modules | 💬 HCP Group Chats → `showPage('hcp',...)` |
| | 👤 Users → `showPage('users',...)` |
| | 🏥 Facilities → `showPage('facilities',...)` |
| | 🔔 Notifications → `showPage('notifications',...)` |

---

## 6. KPI Stat Cards

| # | Value | Color | Label | Trend | Icon BG |
|---|-------|-------|-------|-------|---------|
| 1 | 48 | `--blue` | Total Groups | — | `--bluel` 📊 |
| 2 | 12,840 | `--g` | Group Members | Across all groups | `--gl` ✅ |
| 3 | 5 | `--red` | Unread Support | Needs response | `--redl` 🚩 |
| 4 | 2m 14s | `--g` | Avg Response | Below 5m target | `--gl` ✅ |
| 5 | 94% | `--gold` | Satisfaction | ↑ +2% this week | `--goldl` ⏳ |

Grid: `grid-template-columns: repeat(5, 1fr)`

---

## 7. Tab Navigation

| Tab | ID | Badge | Aria |
|-----|----|-------|------|
| 💬 Groups (48) | `tc-chats-groups-tab` | — | `role="tab"`, `aria-selected="true"` |
| 🎟️ Support | `tc-chats-support-tab` | 5 unread (red `.sb-badge`) | `role="tab"`, `aria-selected="false"` |

Tab container: `.tabs#chats-tabs`  
Switcher: `switchTab(this, 'tc-chats-{id}', 'chats-tabs')`

---

## 8. Groups Tab (`#tc-chats-groups`)

### Filter Bar (`.fbar`)
| Control | Type | Options / Placeholder |
|---------|------|----------------------|
| Search | Text input | 🔍 Search groups by name, category, admin... |
| Category | Select | All Categories · Health Conditions · HCP Professional · Fitness & Wellness · Medication · Community Support · Facility |
| Status | Select | All Status · Active · Inactive · Archived |
| Sort | Select | Most Members · Newest · Most Active · A–Z |
| Action | Button | + Create Group → `openModal('m-create-group')` |

### Groups Table

**Columns (10):**
1. Checkbox (`<input type="checkbox">`)
2. **Group Name** — bold title + description subtext
3. **Category** — colored badge
4. **Members** — bold number
5. **Group Admin(s)** — name + ID subtext
6. **Permissions** — small muted text (e.g., "Verified only · No media")
7. **Messages (7d)** — bold colored number
8. **Status** — colored badge (Active/Inactive/Archived)
9. **Created** — date string
10. **Actions** — Row action buttons

**Demo Data (6 rows):**

| # | Group Name | Category | Members | Admin | Permissions | Messages (7d) | Status | Created |
|---|------------|----------|---------|-------|-------------|---------------|--------|---------|
| 1 | General Practitioners Ghana | HCP Professional (`.b.bg`) | 620 | Dr. Abena Mensah (4OL-200001) | Verified only · No media | 1,840 (green) | Active | Jan 12, 2025 |
| 2 | Pharmacists & Dispensers | HCP Professional | 312 | Mr. Kofi Acheampong (4OL-200004) | Verified only · Media allowed | 940 (green) | Active | Jan 20, 2025 |
| 3 | Hypertension Support Circle | Health Conditions (`.b.bo`) | 2,140 | Abena Osei (ADM-0042) | All users · Moderated | 3,210 (green) | Active | Feb 4, 2025 |
| 4 | Fit Ghana Challenge 2026 | Fitness & Wellness (`.b.bpu`) | 4,820 | Coach Mensah Kwabena (HCP-TRN-01) | Premium only · Media allowed | 6,480 (green) | Active | Jan 1, 2026 |
| 5 | Mental Wellness Ghana | Community Support | 1,080 | Dr. Adwoa Owusu (4OL-200005) | All users · Strict moderation | 820 (blue) | Active | Mar 8, 2025 |
| 6 | Malaria Awareness Network | Medication (`.b.bbl`) | 3,420 | Kofi Mensah (ADM-0031) | All users · Open | 480 (gold) | Inactive | May 1, 2025 |

**Row Actions:**
- 📋 View → `openModal('m-view-group')`
- ✏️ Edit
- ● Delete (`background: var(--redl)`)
- ▶️ Activate (for inactive groups only)

**Pagination:**
- Text: "Showing 1–6 of 48 groups"
- Pages: 1 (active) · 2 · … · …

**Bulk Actions (below table):**
- 📋 Export Selected (`.btn.btn-s.btn-sm`)
- 📋 Archive Selected (gold style)
- 📋 Delete Selected (`.btn.btn-r.btn-sm`)

---

## 9. Support Tab (`#tc-chats-support`)

### Alert Banner
| Property | Value |
|----------|-------|
| Type | `.alert.al-r` (red warning) |
| Icon | ⚠️ |
| Message | **5 unread support tickets** — 2 unassigned and waiting over 30 minutes. Assign to available agents immediately. |

### Filter Bar (`.fbar`)
| Control | Type | Options / Placeholder |
|---------|------|----------------------|
| Search | Text input | 🔍 Search tickets by user, topic, ID, agent... |
| Type | Select | All · Billing · Technical · Health Consultation · Account · BedTracker · Other |
| Priority | Select | All · 📋 High · 📋 Normal · 📋 Low |
| Agent | Select | All · Unassigned · Kofi Mensah · Abena Osei · Janet Ama |
| Status | Select | All · Open · Unread · Pending · Resolved · Escalated |
| Action | Button | 📥 Export (`.btn.btn-s.btn-sm`) |

### Support Tickets Table

**Columns (11):**
1. Checkbox
2. **Ticket ID** — `.id-badge` (e.g., TKT-0841)
3. **User** — masked name + user# + region subtext
4. **Topic / Summary** — bold, max-width 160px
5. **Type** — colored badge
6. **Last Message** — 11px, max-width 130px, truncated
7. **Agent** — name or "Unassigned" (red)
8. **Wait Time** — bold, color-coded
9. **Priority** — colored badge
10. **Status** — colored badge
11. **Actions** — Row action buttons

**Demo Data (5 rows):**

| # | Ticket ID | User | Topic | Type | Last Message | Agent | Wait | Priority | Status |
|---|-----------|------|-------|------|--------------|-------|------|----------|--------|
| 1 | TKT-0841 | Kwame O**** (user#8821, Greater Accra) | Payment failure — MoMo keeps declining | Billing (`.b.bo`) | "My MoMo keeps failing..." | **Unassigned** (red) | **42 min** (red) | 🟠 High (`.b.br`) | Unread (`.b.br`) |
| 2 | TKT-0840 | Ama A**** (user#4412, Ashanti) | Symptom checker crashes on load | Technical (`.b.bbl`) | "App crashes when I open symptoms..." | Kofi Mensah | 18 min (gold) | Normal | Unread |
| 3 | TKT-0839 | John M**** (user#1201, Eastern) | General health consultation — persistent headaches | Health (`.b.bg`) | "Persistent headaches for 3 days..." | Abena Osei | 3 min (green) | Low | Active (`.b.bbl`) |
| 4 | TKT-0838 | Efua M**** (user#6612, Central) | How to cancel / downgrade subscription | Billing | "I want to downgrade my plan..." | Kofi Mensah | 1 min (green) | Low | Active |
| 5 | TKT-0837 | Yaw O**** (user#3310, Northern) | Facility search map not loading | Technical | "Map shows blank after update..." | Abena Osei | — | Low | ✅ Resolved (`.b.bg`) |

**Unread rows** (1–2): `background: #FFF5F5` (light red)

**Row Actions:**
- 📋 Open
- 📋 Assign (green style, for unassigned)
- 📋 Note
- ? Escalate
- 📋 View (for resolved)

**Pagination:**
- Text: "Showing 1–5 of 23 active tickets"
- Pages: 1 (active) · 2 · …

**Bulk Actions (below table):**
- 📋 Bulk Assign
- ? Escalate Selected (gold style)
- ? Mark Resolved (green style)
- 📥 Export

---

## 10. Modals

### Modal 1: Create Chat Group (`#m-create-group`)

| Property | Value |
|----------|-------|
| Trigger | "+ New Group" button / "+ Create Group" filter bar button |
| Size | `modal-lg` (680px) |
| Title | 📋 Create Chat Group |
| Subtitle | Set up a new platform group chat — configure category, access, and admin |

**Form Fields:**

| Field | Type | Placeholder / Default |
|-------|------|----------------------|
| Group Name | Text | e.g. Hypertension Support Circle — Greater Accra |
| Description | Textarea (2 rows) | Brief description of the group's purpose... |
| Category | Select | Health Conditions · HCP Professional · Fitness & Wellness · Medication · Community Support · Facility · BedTracker Emergency |
| Group Type | Select | Open (All Users) · Verified Users Only · HCP Verified Only · Premium Users · Admin Only |
| Max Members | Number | e.g. 5000 (0 = unlimited) |
| Region Restriction | Select | All Regions · Greater Accra · Ashanti · Central · Western · Northern · Eastern |
| Assign Group Admin | Text | e.g. 4OL-200001 or Dr. Abena Mensah |
| Group Permissions | Checkbox grid (6 items) | Members can send messages ✓ · Members can share media (images) ✓ · Members can share links · Admin approval for new members ✓ · Admin-only announcements ✓ · Moderation alerts to admin |
| Group Rules | Textarea (3 rows) | e.g. 1. Be respectful. 2. No medical advice... |

**Footer Actions:**
- Cancel (`.btn.btn-s`) → `closeModal('m-create-group')`
- 📋 Create Group (`.btn.btn-p`) → `alert('Group created successfully!'); closeModal(...)`

---

### Modal 2: View/Edit Group Details (`#m-view-group`)

| Property | Value |
|----------|-------|
| Trigger | "📋 View" row action button |
| Size | `modal-lg` (680px) |
| Title | 📋 Group Details |
| Subtitle | 📋 General Practitioners Ghana · HCP Professional · Verified Only |

**Stats Row (4 cards):**

| Value | Color | Label |
|-------|-------|-------|
| 620 | `--g` | Members |
| 1,840 | `--blue` | Messages (7d) |
| 3 | `--gold` | Admins |
| 2 | `--teal` | Flagged |

**Editable Fields:**

| Field | Type | Value |
|-------|------|-------|
| Group Name | Text | 🧑‍⚕️ General Practitioners Ghana |
| Category | Select | HCP Professional (selected) |
| Description | Textarea (2 rows) | Verified MDC-licensed GPs only... |
| Group Type | Select | HCP Verified Only (selected) |
| Status | Select | Active · Inactive · Archived |

**Group Admins Section:**
- Dr. Abena Mensah — 4OL-200001 — Super Admin — ? Remove
- Dr. Kweku Asante — 4OL-200002 — Moderator — ? Remove
- + Add Admin button

**Action Buttons:**
- ? Suspend Group (`.btn.btn-r.btn-sm`)
- 📋 Export Members
- 📋 Send Announcement (gold style)

**Footer Actions:**
- Close (`.btn.btn-s`) → `closeModal('m-view-group')`
- 📋 Save Changes (`.btn.btn-p`) → `alert('Group updated!'); closeModal(...)`

---

## 11. JavaScript Functions

| Function | Trigger | Behavior |
|----------|---------|----------|
| `switchTab(tabEl, panelId, groupId)` | Tab click | Switches active tab + panel |
| `openModal('m-create-group')` | "New Group" / "Create Group" buttons | Opens create group modal |
| `openModal('m-view-group')` | "📋 View" row action | Opens group details modal |
| `closeModal('m-create-group')` | Modal backdrop / Cancel | Closes create modal |
| `closeModal('m-view-group')` | Modal backdrop / Close | Closes view modal |
| `alert('Group created successfully!')` | Create submit | Demo confirmation |
| `alert('Group updated!')` | Save Changes | Demo confirmation |

---

## 12. Permissions Matrix

From the admin permissions table (line 1407):

| Role | Chats Permission |
|------|-----------------|
| Super Admin (SA) | ✓ Full access |
| Deputy Super Admin | R/O Read-only |
| Health Content Manager | — No access |
| Facility Manager | — No access |
| User Support Manager | ✓ Full access |
| Marketing Manager | — No access |
| Finance Manager | — No access |
| AI & Security Lead | R/O Read-only |
| System Engineer | — No access |

---

## 13. Data Model Mapping

| UI Element | Likely Backend Table | Field |
|------------|---------------------|-------|
| Total Groups (48) | `chat_groups` | count |
| Group Members (12,840) | `chat_group_members` | sum across groups |
| Unread Support (5) | `support_tickets` | `status = 'unread'` count |
| Avg Response (2m 14s) | `support_tickets` | avg(`first_response_time`) |
| Satisfaction (94%) | `support_tickets` | avg(`satisfaction_rating`) |
| Group Name / Category | `chat_groups` | `name`, `category` |
| Members count | `chat_group_members` | count by `group_id` |
| Messages (7d) | `chat_messages` | count by `group_id` WHERE `created_at > now() - 7d` |
| Group Admin | `chat_group_admins` / `users` | `user_id`, `role` |
| Permissions | `chat_groups` | JSON/serialized permissions |
| Ticket ID | `support_tickets` | `id` (TKT-XXXX) |
| User (masked) | `users` | `name`, `user_number`, `region` |
| Wait Time | `support_tickets` | `wait_time` or calculated |
| Priority | `support_tickets` | `priority` |
| Status | `support_tickets` | `status` |
| Agent | `users` / `admins` | `assigned_agent_id` |

---

## 14. Related Files

| File | Relationship |
|------|-------------|
| `chat-mockup.html` | User-facing mobile chat UI (Groups & Support tabs) |
| `notifications-mockup.html` | Related notification system |
| `admin-panel.html` (HCP page) | HCP → Group Chats sub-menu |
| `admin-panel.html` (Users page) | User management linked from module connections |
| `admin-panel.html` (Facilities page) | Facility management linked from module connections |
| `admin-panel.html` (Notifications page) | Notification system linked from module connections |

---

## 15. Design Notes

### Table Row Highlighting
- **Unread support tickets** get `background: #FFF5F5` (light red) for immediate visual priority
- **Inactive groups** have a yellow `.by` badge and may show an "▶️ Activate" action instead of Delete

### Color-Coded Badges
Groups and tickets use the admin panel's standard badge system:
- `.b.bg` — Green (Active, Health, HCP Professional)
- `.b.bo` — Orange (Health Conditions, Billing, Normal priority)
- `.b.bpu` — Purple (Fitness & Wellness)
- `.b.bbl` — Blue (Medication, Technical, Active status)
- `.b.by` — Yellow (Inactive)
- `.b.br` — Red (Critical, Unread, High priority, Delete)

### Action Buttons
Row action buttons (`.ra-btn`) use compact styling with emoji icons. The delete action uses a bullet (●) on red background for visual distinction.

### Bulk Operations
Both tabs support multi-select via checkboxes with contextual bulk actions:
- **Groups**: Export, Archive, Delete
- **Support**: Bulk Assign, Escalate, Mark Resolved, Export

### Modal Pattern
Both modals follow the standard 4OL admin modal pattern:
- `.modal-bg` backdrop with click-to-close
- `.modal.modal-lg` content area
- `.mh` header with title, subtitle, close button
- `.mb` body with form fields
- `.mft` footer with cancel + primary actions
