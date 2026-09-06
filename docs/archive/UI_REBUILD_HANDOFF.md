# Technical Hand-off: 4 Our Life UI Rebuild (Live Verified)

This document provides verified technical context for the UI rebuild of the **4 Our Life** web application, pulled directly from the Supabase database at `rhbbxttxnvcziyqzptqs.supabase.co`.

---

## 1. Core Tech Stack
*   **Framework:** Next.js 15+ (App Router)
*   **Language:** TypeScript 5
*   **Styling:** Tailwind CSS 4
*   **Database & Auth:** Supabase (utilizing `@supabase/ssr`)
*   **Data Fetching:** TanStack Query v5
*   **Components:** Radix UI / shadcn/ui

---

## 2. Database Tables (Public Schema)

### **Identity & Users**
- **`user_profiles`**: Extended profile for `auth.users`.
    - `user_id` (uuid, PK), `first_name`, `last_name`, `phone_number`, `sex`, `dob`, `role`, `user_type`, `status`, `expo_push_token`.
- **`onboarding_requests`**: Intake for signup links.
    - `id` (uuid), `first_name`, `last_name`, `business_name`, `email`, `phone_number`, `request_type`, `status`, `notes`.
- **`account`**: BetterAuth legacy provider mapping.
- **`ibp`**: Business provider specific profiles.
- **`delete_account_requests`**: User-requested account deletions.

### **Healthcare & Facilities**
- **`facility_profile`**: Core business entity.
    - `id` (uuid), `user_id` (owner), `facility_name`, `facility_type`, `contact_number`, `gps_address`, `region`, `status`, `is_featured`, `is_top_rated`.
- **`facility_offerings`**: Services/Packages provided by facilities (Price, Duration, Type).
- **`facility_favorites`**: User-saved facilities.
- **`facility_conversations`**: Mapping between facilities and chat threads.

### **Medical Knowledge Base**
- **`conditions`**: Database of medical conditions (Symptoms, Diagnosis, Treatment).
- **`symptoms`**: Detailed symptom mapping.
- **`body_parts`**: Anatomical mapping using `ltree` for hierarchical traversal.
- **`categories`**: Classification for conditions and symptoms.
- **`condition_body_parts`, `condition_causes`, `condition_types`**: Relational mapping for medical data.

### **Engagement & Features**
- **`conversations`**: Direct and Group chat threads.
- **`conversation_members`**: Participants in chats with `role` and `unread_count`.
- **`messages`**: Chat history with support for `text`, `image`, `voice`, and `file`.
- **`message_reads`**: Read receipt tracking.
- **`chat_support`**: Administrative support tickets.
- **`notifications`**: In-app notification history.

### **Health & Fitness**
- **`medication_reminders`**: Schedule and tracking for medication.
- **`workouts`**: Exercise database with `how_to` HTML content.
- **`workout_reminders`**: User-scheduled fitness alerts.
- **`tracker_logs`**: Period and ovulation tracking data.
- **`fitness_onboarding_selections`**: User fitness profile (Goal, Level, Equipment).
- **`fitness_generated_workouts`**: AI-generated workout plans.
- **`healthy_living_info`**: Hierarchical content for health education.

### **Marketing**
- **`marketing_profile`**: Campaigns, ads, and organization spotlights.
- **`marketing_discounts`**: Promotional codes and BOGO logic.
- **`marketing_subscriptions`**: Platform tiers and billing cycles.

---

## 3. Verified Backend Functions (RPCs)
Use `supabase.rpc()` to invoke these for complex logic:

### **Chat & Communication**
- `get_conversations(p_user_id uuid)`: Full inbox retrieval with unread stats.
- `fn_create_group_conversation(...)`: Transactional group creation.
- `fn_mark_conversation_read(p_conversation_id, p_user_id)`: Bulk update for read states.

### **Facilities & Maps**
- `get_facilities_map(minlng, minlat, maxlng, maxlat, zoom_level, ...)`: High-performance spatial query with server-side filters.
- `register_facility_with_profile(...)`: Atomically creates an auth user and facility profile.
- `admin_change_facility_status(p_admin_id, payload)`: Approved/Reject workflow.

### **Health Logic**
- `get_due_medication_reminders(p_current_time)`: Trigger logic for push notifications.
- `admin_upsert_medication_reminder(...)`: Admin management of patient records.

### **System & Discovery**
- `global_search(search_term)`: Multi-table search across conditions, facilities, and symptoms.
- `get_admin_dashboard_stats()`: Aggregated analytics for the command center.

---

## 4. Design Guidelines & Rules
1.  **UUID Integrity:** Always use `UUID` for foreign keys. Do not cast to `TEXT` in joins.
2.  **Realtime:** Enable subscriptions on `messages` and `notifications`.
3.  **Audit Logs:** All admin actions should be logged via `activity_logs`.
4.  **UI Aesthetic:** Professional, medical-grade minimalism using **Tailwind 4** and **shadcn/ui**.

---

## 5. Rebuild Master Prompt

> **Prompt:** 
> "Rebuild the '4 Our Life' UI from scratch using **Next.js 15 (App Router)** and **Tailwind CSS 4**. 
>
> **Database Blueprints:**
> 1. Use verified live schema from Supabase (`rhbbxttxnvcziyqzptqs.supabase.co`).
> 2. Core tables: `user_profiles`, `facility_profile`, `conversations`, `conditions`, and `medication_reminders`.
> 3. Implement high-performance data fetching with **TanStack Query v5**.
>
> **Key Modules:**
> - **Unified Health Dashboard:** User-centric view for medication, workouts, and tracker logs.
> - **Facility Discovery:** Interactive map using the `get_facilities_map` RPC and `body_parts` hierarchical search.
> - **Admin Control Panel:** Approval workflows for `onboarding_requests` and campaign management.
> - **Real-time Chat:** Messaging suite utilizing Supabase Realtime.
>
> **Technical Constraint:** Strict use of **UUIDs** for all entity relations to maintain database integrity."
