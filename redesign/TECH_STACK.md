# 4OurLife Admin Panel - Tech Stack Documentation

Generated from source analysis of `package (Mobile).json` and `SUPABASE_SCHEMA.md`

---

## 1. Overview

**4OurLife** is a comprehensive healthcare platform targeting the Ghanaian market. The system consists of:

- **Mobile App**: React Native + Expo (iOS/Android)
- **Admin Panel**: HTML/CSS/JS (standalone, this file)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)

---

## 2. Mobile Application Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.79.6 |
| SDK | Expo | ~53.0.0 |
| Language | TypeScript | ~5.8.3 |
| Node | >= 18 | - |

### 2.1 Navigation

| Library | Version | Purpose |
|---------|---------|---------|
| `@react-navigation/native` | ^7.2.2 | Core navigation |
| `@react-navigation/bottom-tabs` | ^7.15.10 | Bottom tab bar |
| `@react-navigation/material-top-tabs` | ^7.2.13 | Top tabs (pager) |
| `@react-navigation/native-stack` | ^7.14.12 | Native stack navigator |
| `@react-navigation/stack` | ^7.3.2 | JS stack navigator |
| `react-native-pager-view` | 6.7.1 | Tab pager view |
| `react-native-tab-view` | ^4.1.0 | Tab view component |

### 2.2 State Management

| Library | Version | Purpose |
|---------|---------|---------|
| `@reduxjs/toolkit` | ^2.8.1 | Redux state management |
| `react-redux` | ^9.2.0 | React-Redux bindings |
| `zustand` | ^5.0.11 | Lightweight state management |
| `@tanstack/react-query` | ^5.90.21 | Server state / data fetching |

### 2.3 Forms & Validation

| Library | Version | Purpose |
|---------|---------|---------|
| `react-hook-form` | ^7.71.2 | Form management |
| `@hookform/resolvers` | ^5.2.2 | Validation resolvers |
| `zod` | ^4.3.6 | Schema validation |
| `yup` | ^1.6.1 | Schema validation (legacy) |

### 2.4 Authentication

| Library | Version | Purpose |
|---------|---------|---------|
| `better-auth` | ^1.4.20 | Authentication framework |
| `@better-auth/expo` | ^1.4.20 | Expo auth integration |
| `@supabase/supabase-js` | ^2.89.0 | Supabase client |

### 2.5 UI & Styling

| Library | Version | Purpose |
|---------|---------|---------|
| `nativewind` | ~4.1.23 | TailwindCSS for React Native |
| `tailwindcss` | ^3.4.19 | Utility-first CSS |
| `tailwind-merge` | ^3.5.0 | Tailwind class merging |
| `clsx` | ^2.1.1 | Conditional classnames |
| `react-native-paper` | ^5.14.1 | Material Design components |
| `react-native-elements` | ^3.4.3 | Cross-platform UI kit |
| `react-native-reanimated` | ~3.17.4 | Animations |
| `react-native-gesture-handler` | ~2.24.0 | Gesture handling |
| `react-native-safe-area-context` | 5.4.0 | Safe area handling |
| `react-native-screens` | ~4.11.1 | Native screen containers |
| `react-native-svg` | 15.11.2 | SVG support |
| `expo-linear-gradient` | ~14.1.5 | Gradients |
| `expo-blur` | ~14.1.5 | Blur effects |
| `expo-image` | ~2.4.1 | Optimized image loading |
| `expo-font` | ~13.3.2 | Custom fonts |
| `expo-status-bar` | ~2.2.3 | Status bar control |

### 2.6 Data Visualization

| Library | Version | Purpose |
|---------|---------|---------|
| `react-native-gifted-charts` | ^1.4.76 | Charts & graphs |
| `react-native-calendars` | ^1.1312.0 | Calendar components |

### 2.7 Maps & Location

| Library | Version | Purpose |
|---------|---------|---------|
| `react-native-maps` | ^1.20.1 | Map integration |
| `react-native-maps-directions` | ^1.9.0 | Route directions |
| `expo-location` | ~18.1.6 | GPS/location services |

### 2.8 Media & Files

| Library | Version | Purpose |
|---------|---------|---------|
| `expo-camera` | ~16.1.11 | Camera access |
| `expo-image-picker` | ~16.1.4 | Photo library picker |
| `expo-document-picker` | ~13.1.6 | File picker |
| `expo-media-library` | ~17.1.7 | Photo gallery access |
| `expo-video` | ~2.2.2 | Video playback |
| `react-native-compressor` | ^1.13.0 | Media compression |
| `react-native-fs` | ^2.20.0 | File system access |
| `base64-arraybuffer` | ^1.0.2 | Base64 encoding |

### 2.9 Notifications

| Library | Version | Purpose |
|---------|---------|---------|
| `expo-notifications` | ~0.31.5 | Push notifications |
| `expo-haptics` | ~14.1.4 | Haptic feedback |

### 2.10 Storage & Offline

| Library | Version | Purpose |
|---------|---------|---------|
| `react-native-mmkv` | ^4.2.0 | Fast key-value storage |
| `@react-native-async-storage/async-storage` | 2.1.2 | Persistent storage |
| `expo-secure-store` | ~14.2.4 | Encrypted storage |

### 2.11 Utilities

| Library | Version | Purpose |
|---------|---------|---------|
| `axios` | ^1.9.0 | HTTP client |
| `crypto-js` | ^4.2.0 | Cryptographic functions |
| `expo-linking` | ~7.1.7 | Deep linking |
| `expo-web-browser` | ~14.2.0 | In-app browser |
| `expo-constants` | ~17.1.8 | Environment constants |
| `expo-device` | ~7.1.4 | Device info |
| `expo-network` | ~7.1.5 | Network status |
| `expo-localization` | ~16.1.6 | i18n/locale |
| `expo-local-authentication` | ~16.0.5 | Biometric auth |
| `expo-tracking-transparency` | ~5.2.4 | App tracking permission |
| `react-native-url-polyfill` | ^2.0.0 | URL polyfill |
| `react-native-international-phone-number` | 0.11.7 | Phone input |
| `react-native-phone-number-input` | ^2.1.0 | Phone input alt |
| `@react-native-clipboard/clipboard` | ^1.16.2 | Clipboard |
| `@react-native-community/datetimepicker` | 8.4.1 | Date/time picker |
| `@react-native-picker/picker` | 2.11.1 | Native picker |
| `@quidone/react-native-wheel-picker` | ^1.4.0 | Wheel picker |
| `react-native-modal` | ^14.0.0-rc.1 | Modal overlay |
| `react-native-modal-datetime-picker` | ^18.0.0 | Modal date/time picker |
| `react-native-raw-bottom-sheet` | ^3.0.0 | Bottom sheet |
| `react-native-element-dropdown` | ^2.12.4 | Dropdown |
| `react-native-select-dropdown` | ^4.0.1 | Select dropdown |
| `react-native-segmented-control-tab` | ^4.0.0 | Segmented control |
| `react-native-bouncy-checkbox` | ^4.1.2 | Checkbox |
| `react-native-ratings` | ^8.1.0 | Star ratings |
| `react-native-popup-menu` | ^0.18.0 | Popup menu |
| `react-native-toast-notifications` | ^3.4.0 | Toast notifications |
| `react-native-render-html` | ^6.3.4 | HTML renderer |
| `react-native-webview` | 13.13.5 | WebView |
| `react-native-app-intro-slider` | ^4.0.4 | Onboarding slider |
| `react-native-reanimated-carousel` | ^4.0.2 | Carousel |
| `reanimated-color-picker` | ^4.1.1 | Color picker |
| `@shopify/flash-list` | 1.7.6 | Virtualized list |
| `react-native-permissions` | ^5.5.0 | Runtime permissions |
| `react-native-navigation-mode` | ^1.2.9 | Navigation mode |
| `react-native-nitro-modules` | ^0.35.6 | Nitro modules |
| `prettier` | ^3.8.1 | Code formatting |
| `prettier-plugin-tailwindcss` | ^0.5.14 | Tailwind Prettier plugin |

### 2.12 DevOps & Monitoring

| Library | Version | Purpose |
|---------|---------|---------|
| `@sentry/react-native` | ~6.14.0 | Error tracking |
| `expo-updates` | ~0.28.18 | OTA updates |
| `expo-dev-client` | ~5.2.4 | Development client |
| `expo-build-properties` | ~0.14.8 | Build configuration |
| `expo-splash-screen` | ~0.30.10 | Splash screen |
| `expo-system-ui` | ~5.0.11 | System UI control |
| `expo-asset` | ~11.1.7 | Asset management |
| `patch-package` | ^8.0.1 | Patch npm packages |

### 2.13 Testing

| Library | Version | Purpose |
|---------|---------|---------|
| `jest` | ^29.6.3 | Unit testing |
| `jest-expo` | ~53.0.0 | Expo Jest preset |
| `@types/jest` | ^29.5.13 | Jest types |

---

## 3. Backend & Database (Supabase)

### 3.1 Platform

| Component | Technology |
|-----------|-----------|
| Database | PostgreSQL 17 |
| Auth | Supabase Auth (built-in) |
| Realtime | Supabase Realtime |
| Storage | Supabase Storage |
| Edge Functions | Supabase Edge Functions (Deno) |
| API | Auto-generated REST/GraphQL |

### 3.2 PostgreSQL Extensions

| Extension | Purpose |
|-----------|---------|
| `pgcrypto` | Cryptographic functions |
| `pg_stat_statements` | Query performance tracking |
| `supabase_vault` | Secrets management |
| `pg_net` | Async HTTP requests |
| `ltree` | Hierarchical tree data (body parts, categories) |
| `uuid-ossp` | UUID generation |
| `pg_trgm` | Text similarity / fuzzy search |
| `postgis` | Geospatial data (facility locations) |
| `pg_cron` | Scheduled jobs |

### 3.3 Database Schema (52+ Tables)

#### Core Platform
- `user_profiles` - User accounts & profiles
- `account` - Auth accounts (Better Auth)
- `session` - Active sessions
- `verification` - OTP/email verification
- `user_invites` - Platform invitations
- `user_notes` - Admin notes on users
- `delete_account_requests` - GDPR/account deletion
- `onboarding_requests` - Facility onboarding queue

#### Health Content
- `conditions` - Medical conditions (NHS-linked)
- `symptoms` - Symptom database
- `body_parts` - Anatomical body parts (ltree hierarchy)
- `categories` - Content categorization (ltree hierarchy)
- `symptom_types`, `symptom_causes`, `symptom_body_parts`, `symptom_categories` - Symptom relationships
- `condition_types`, `condition_causes`, `condition_body_parts`, `condition_categories` - Condition relationships
- `healthy_living_info` - Health articles (self-referencing hierarchy)
- `faqs`, `faq_categories` - FAQ system

#### Facilities
- `facility_profile` - Healthcare facility listings
- `facility_offerings` - Services/offers
- `facility_reviews` - User reviews
- `facility_favorites` - Bookmarked facilities
- `facility_conversations` - Facility messaging

#### Messaging
- `conversations` - Chat rooms/groups
- `conversation_members` - Group members
- `messages` - Chat messages
- `message_reads` - Read receipts
- `chat_support` - Customer support tickets

#### Fitness
- `workouts` - Exercise library
- `workout_reminders` - Scheduled reminders
- `fitness_generated_workouts` - AI-generated plans
- `fitness_onboarding_selections` - User preferences

#### Marketing & Business
- `ibp` - Independent Business Partners
- `marketing_profile` - Business profiles
- `marketing_discounts` - Promo codes
- `marketing_subscriptions` - Subscription tiers

#### Health Tracking
- `medication_reminders` - Pill reminders
- `tracker_logs` - Period/fertility tracking
- `notifications` - Push/email notifications
- `activity_logs` - User activity audit
- `platform_metrics_history` - Analytics snapshots
- `download_stats` - Content analytics
- `storage_cleanup_queue` - File cleanup

#### Operations
- `otp_verifications` - OTP storage
- `twilio_whatsapp_handshakes` - WhatsApp integration
- `registrar_locations` - Location registry
- `storage_cleanup_queue` - Cleanup jobs

### 3.4 Custom Enums

| Enum | Values |
|------|--------|
| `category_type` | condition, symptom |
| `facility_status_enum` | pending, active, rejected, inactive |
| `facility_type_enum` | hospitals_&_clinics, herbal_centers, diagnostic_labs, pharmacies, dental_clinics, homes, eye_clinics, osteopathy_centers, physiotherapy_centers, prosthetics_centers, psychiatric_centers, ibps, health_schools |
| `ibp_status` | pending, approved, suspended, rejected |
| `marketing_status_enum` | draft, scheduled, live, paused, ended |
| `marketing_type_enum` | ads, events, news, health, other |
| `offering_type` | subscription, walk-in, package, onetime_fee |
| `region_enum` | ahafo, ashanti, bono, bono east, central, eastern, greater accra, north east, northern, oti, savannah, upper east, upper west, volta, western, western north |
| `subscription_privilege` | business_analytics, performance_analytics, popup_notification, top_rated_placement, featured_placement, ad_discount_10, ad_discount_25, ad_discount_30, ad_discount_40, ad_discount_50, ad_flyer_discount_10, advanced_analytics, priority_support |

### 3.5 Database Functions (Sample)

| Function | Purpose |
|----------|---------|
| `delete_old_notifications()` | Cleanup old notifications |
| `cleanup_expired_otps()` | Remove expired OTPs |
| `auto_cleanup_old_notifications()` | Automated cleanup |
| `update_updated_at_column()` | Trigger for timestamp updates |
| `request_user_id()` | Get current user ID |
| `is_app_admin()` | Check admin status |
| `get_dashboard_metrics()` | Aggregate metrics JSON |
| `get_platform_overview_metrics(time_filter)` | Platform analytics |
| `create_ibp_profile(...)` | IBP onboarding |
| `register_facility_with_profile(...)` | Facility registration |
| `insert_condition(...)` / `update_condition(...)` | Content management |
| `register_symptom_complex(...)` / `update_symptom_complex(...)` | Symptom CRUD |
| `get_conversations(p_user_id, p_limit)` | Chat listing |
| `fn_create_group_conversation(...)` | Group chat creation |
| `fn_make_group_leader(...)` | Promote group admin |
| `admin_change_facility_status(...)` | Admin facility moderation |
| `admin_delete_medication_reminder(...)` | Admin medication management |
| `sync_profile_role_to_user()` | Role synchronization trigger |
| `fn_log_admin_activity()` | Audit logging trigger |
| `capture_daily_metrics()` | Metrics snapshot |
| `queue_facility_files_for_deletion()` | Cleanup trigger |
| `trigger_delete_read_reminder_notifications()` | Notification cleanup trigger |
| `set_marketing_discount_created_by()` | Auto-set creator trigger |
| `get_registrar_trails(days_back)` | Location audit |
| `get_user_app_role()` | Get user role |

### 3.6 RLS Policies

- **164 Row-Level Security policies** across tables
- Policies enforce tenant isolation and role-based access
- Key patterns: `request_user_id()`, `is_app_admin()`, `get_user_app_role()`

---

## 4. Admin Panel (This File)

| Aspect | Implementation |
|--------|---------------|
| **Format** | Single-file HTML application |
| **Markup** | HTML5 |
| **Styling** | CSS3 (custom properties/variables) |
| **Interactivity** | Vanilla JavaScript |
| **Dependencies** | None (zero external libraries) |
| **Accessibility** | ARIA labels, roles, focus-visible |
| **Architecture** | Client-side only, no build step |

### Admin Panel Features

- Super Admin Command Center
- User Management (Active, Premium, Flagged, Delete Requests)
- IBP Management (Pending, Active, Premium, Campaigns)
- Facility Management & Verification
- Content Management (Conditions, Symptoms, FAQs)
- Health Content (Articles, Body Parts, Categories)
- Fitness (Challenges, Trainers, Workout Plans)
- Marketing (Discounts, Subscriptions, Campaigns)
- Messaging (Chat Support, Group Management)
- Medication Reminders & Tracker
- Notifications & Templates
- Analytics & Metrics
- Security Center (Threat Monitor, Audit Logs)
- BedTracker (Hospital bed management)
- Ambulance Dispatch
- Pharmacy Campaigns
- Escrow & Delivery Management
- Data Collectors & GPS Tracking

### Admin Panel Data Source

Currently operates as a **static HTML mockup** with sample data. Future integration:
- Supabase JS client (`@supabase/supabase-js`)
- REST API calls to Supabase edge functions
- Realtime subscriptions for live data

---

## 5. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
├─────────────────────┬─────────────────────────────────────────┤
│   Mobile App        │   Admin Panel                          │
│   (React Native)    │   (HTML/CSS/JS)                        │
│   - iOS/Android     │   - Browser-based                      │
│   - Expo SDK 53     │   - Static file                        │
└────────┬────────────┴──────────────────┬──────────────────────┘
         │                             │
         │    Supabase Client SDK      │ (planned)
         │    (@supabase/supabase-js)  │
         └─────────────┬───────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   SUPABASE PLATFORM                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Auth       │   Database   │   Realtime   │   Storage      │
│   (OAuth,    │   (PostgreSQL│   (WebSocket │   (S3-compatible│
│   MFA, OTP)  │    17 + PostGIS│   pub/sub)  │    buckets)    │
└──────────────┴──────────────┴──────────────┴────────────────┘
                       │
              ┌────────┴────────┐
              │  Edge Functions   │
              │  (Deno runtime)   │
              └─────────────────┘
```

---

## 6. Key Integrations

| Service | Purpose |
|---------|---------|
| **Twilio** | WhatsApp handshakes, SMS |
| **Expo Push Notifications** | Cross-platform push |
| **Sentry** | Error tracking & monitoring |
| **Supabase Realtime** | Live chat, live bed tracker updates |
| **PostGIS** | Facility geolocation, ambulance routing |
| **pg_cron** | Scheduled jobs (daily metrics, cleanup) |

---

## 7. Development Environment

```
Node.js >= 18
Expo SDK 53
TypeScript 5.8
PostgreSQL 17 (via Supabase)
```

---

*Last updated: 2026-05-17*
