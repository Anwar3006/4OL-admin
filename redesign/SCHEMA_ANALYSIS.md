# 4OurLife Admin Panel - Database Schema Analysis
Generated: 2026-05-17

## Executive Summary

This document compares the legacy database schema (schema.sql) against the new admin panel UI requirements (admin-panel.html) to identify schema gaps, required changes, and backend architecture recommendations.

| Metric | Value |
|--------|-------|
| Legacy public tables | 51 |
| New tables required | 27 |
| Tables needing ALTER | 17 |
| New enums required | 12 |
| Admin panel pages | 30 |
| Admin panel modals | 58 |

---

## 1. Schema Gap Analysis by Admin Panel Module

### 1.1 Dashboard (page: dashboard)
**UI Features:** Platform metrics, user growth charts, revenue stats, facility counts, active sessions

| Feature | Database Status | Action |
|---------|----------------|--------|
| Platform overview metrics | EXISTS: platform_metrics_history | ENHANCE |
| Daily snapshots | MISSING | NEW TABLE: platform_metrics_snapshots |
| Real-time active users | EXISTS: user_profiles.last_active | ADD INDEX |
| Revenue tracking | MISSING | NEW TABLE: transaction_records |
| Top regions analytics | MISSING | ADD COLUMN: platform_metrics_snapshots.top_regions |

**SQL:** See migration Section 3.20

---

### 1.2 User Management (page: users)
**UI Features:** Active users, premium users, flagged users, delete requests, user invites

| Feature | Database Status | Action |
|---------|----------------|--------|
| User list with status | EXISTS: user_profiles | ALTER |
| Admin role management | MISSING | ADD COLUMN: user_profiles.admin_role |
| User status (active/suspended/banned) | MISSING | ADD COLUMN: user_profiles.status |
| MFA status | MISSING | ADD COLUMN: user_profiles.mfa_enabled |
| Login tracking | MISSING | ADD COLUMN: user_profiles.last_login_at |
| IP whitelisting | MISSING | ADD COLUMN: user_profiles.whitelisted_ips |
| Account lockout | MISSING | ADD COLUMN: user_profiles.locked_until |
| Admin notes on users | MISSING | ADD COLUMN: user_profiles.notes |
| Delete account requests | EXISTS: delete_account_requests | ALTER |
| Delete request review | MISSING | ADD COLUMNS: reviewed_by, reviewed_at |
| User invites | EXISTS: user_invites | ALTER |
| Invite tracking | MISSING | ADD COLUMNS: invited_by, used_at, is_revoked |

**SQL:** See migration Section 2.1, 2.16, 2.17

---

### 1.3 Facilities (page: facilities, reviews)
**UI Features:** Facility registry, verification queue, reviews, featured listings

| Feature | Database Status | Action |
|---------|----------------|--------|
| Facility listings | EXISTS: facility_profile | ALTER |
| Verification status | MISSING | ADD COLUMN: facility_profile.approved_by |
| Rejection tracking | MISSING | ADD COLUMN: facility_profile.rejection_reason |
| Featured facilities | MISSING | ADD COLUMN: facility_profile.is_featured |
| Rating aggregation | MISSING | ADD COLUMNS: rating_average, rating_count |
| Subscription tier | MISSING | ADD COLUMN: facility_profile.subscription_tier |
| Verification docs | MISSING | ADD COLUMN: facility_profile.verification_documents |
| Facility reviews | EXISTS: facility_reviews | USE AS-IS |
| Admin notes | MISSING | ADD COLUMN: facility_profile.admin_notes |

**SQL:** See migration Section 2.4

---

### 1.4 IBP Management (page: ibp)
**UI Features:** Pending verification, active IBPs, premium IBPs, campaigns

| Feature | Database Status | Action |
|---------|----------------|--------|
| IBP registry | EXISTS: ibp | ALTER |
| Status tracking | MISSING | ADD COLUMN: ibp.status |
| Verification details | MISSING | ADD COLUMNS: verified_by, verified_at |
| Campaign budget | MISSING | ADD COLUMNS: campaign_budget, total_spend |
| Featured IBPs | MISSING | ADD COLUMN: ibp.is_featured |

**SQL:** See migration Section 2.5

---

### 1.5 Health Content (pages: diseases, symptoms, healthy, faq)
**UI Features:** Conditions, symptoms, body parts, healthy living articles, FAQs

| Feature | Database Status | Action |
|---------|----------------|--------|
| Conditions database | EXISTS: conditions | ALTER |
| Content status | MISSING | ADD COLUMN: conditions.status |
| Featured content | MISSING | ADD COLUMNS: is_featured, featured_order |
| Author tracking | MISSING | ADD COLUMN: conditions.author_id |
| Review workflow | MISSING | ADD COLUMNS: reviewed_by, reviewed_at |
| View counts | MISSING | ADD COLUMN: conditions.view_count |
| Symptoms database | EXISTS: symptoms | ALTER (same as conditions) |
| Healthy living articles | EXISTS: healthy_living_info | ALTER |
| FAQ system | EXISTS: faqs, faq_categories | ALTER |
| FAQ ordering | MISSING | ADD COLUMN: faq_categories.display_order |
| FAQ helpful ratings | MISSING | ADD COLUMNS: helpful_count, not_helpful_count |

**SQL:** See migration Section 2.2, 2.3, 2.14, 2.15

---

### 1.6 Fitness (page: fitness)
**UI Features:** Challenges, trainers, workout plans, exercises

| Feature | Database Status | Action |
|---------|----------------|--------|
| Challenges | MISSING | NEW TABLE: fitness_challenges |
| Challenge status | MISSING | NEW ENUM: challenge_status |
| Trainers | MISSING | NEW TABLE: fitness_trainers |
| Trainer verification | MISSING | NEW TABLE columns: verified_by, status |
| Workout plans | MISSING | NEW TABLE: workout_plans |
| Plan exercises | MISSING | NEW TABLE: workout_plan_exercises |
| Exercise library | EXISTS: workouts | ALTER |
| Exercise status | MISSING | ADD COLUMN: workouts.status |
| Exercise metadata | MISSING | ADD COLUMNS: difficulty_level, duration_minutes, tags |

**SQL:** See migration Section 3.6, 3.7, 3.8, 3.9, 2.10

---

### 1.7 Marketing (pages: discounts, subscriptions, marketing)
**UI Features:** Discounts, subscription plans, campaigns, promo codes

| Feature | Database Status | Action |
|---------|----------------|--------|
| Discounts | EXISTS: marketing_discounts | ALTER |
| Usage tracking | MISSING | ADD COLUMNS: usage_count, usage_limit |
| Approval workflow | MISSING | ADD COLUMNS: approved_by, approved_at |
| Subscriptions | EXISTS: marketing_subscriptions | ALTER |
| Subscription status | MISSING | ADD COLUMNS: is_active, auto_renew, cancelled_at |
| Subscription plans | MISSING | NEW TABLE: subscription_plans |
| User subscriptions | MISSING | NEW TABLE: user_subscriptions |
| Subscription privileges | MISSING | NEW ENUM: subscription_privilege |

**SQL:** See migration Section 2.6, 2.7, 3.23, 3.24

---

### 1.8 Messaging (pages: chats, notifications)
**UI Features:** Group chats, chat support, notifications, templates

| Feature | Database Status | Action |
|---------|----------------|--------|
| Conversations | EXISTS: conversations | ALTER |
| Group chats | MISSING | ADD COLUMNS: is_group, group_name, max_members |
| Verified-only groups | MISSING | ADD COLUMN: is_verified_only |
| Content moderation | MISSING | ADD COLUMNS: is_flagged, flagged_reason |
| Messages | EXISTS: messages | ALTER |
| Message moderation | MISSING | ADD COLUMNS: is_flagged, moderated_by |
| Chat support tickets | EXISTS: chat_support | ALTER |
| Ticket assignment | MISSING | ADD COLUMNS: assigned_to, escalated_to |
| Ticket resolution | MISSING | ADD COLUMNS: resolved_at, resolved_by |
| Notifications | EXISTS: notifications | ALTER |
| Broadcast notifications | MISSING | ADD COLUMNS: is_broadcast, segment_filter |
| Notification templates | MISSING | NEW TABLE: notification_templates |
| Automation rules | MISSING | NEW TABLE: notification_automation_rules |
| Platform broadcasts | MISSING | NEW TABLE: platform_broadcasts |
| Broadcast types | MISSING | NEW ENUMS: broadcast_type, broadcast_status |

**SQL:** See migration Section 2.8, 2.9, 2.11, 2.12, 3.18, 3.19

---

### 1.9 Medication & Pharmacy (pages: medication, medenquiry)
**UI Features:** Medication reminders, enquiries, escrow, delivery tracking

| Feature | Database Status | Action |
|---------|----------------|--------|
| Medication reminders | EXISTS: medication_reminders | USE AS-IS |
| Medication enquiries | MISSING | NEW TABLE: medication_enquiries |
| Delivery tracking | MISSING | NEW ENUM: delivery_status |
| Escrow payments | MISSING | NEW TABLE: escrow_transactions |
| Escrow status | MISSING | NEW ENUM: escrow_status |
| Pharmacy campaigns | MISSING | NEW TABLE: pharmacy_campaigns |
| Campaign status | MISSING | NEW ENUM: campaign_status |

**SQL:** See migration Section 3.10, 3.11, 3.12

---

### 1.10 BedTracker (page: bedtracker)
**UI Features:** Hospital bed availability, critical alerts

| Feature | Database Status | Action |
|---------|----------------|--------|
| Bed registry | MISSING | NEW TABLE: bed_tracker_facilities |
| Bed counts by type | MISSING | NEW TABLE columns: icu_beds, general_ward_beds |
| Critical alerts | MISSING | NEW TABLE: bed_tracker_alerts |
| Alert thresholds | MISSING | NEW TABLE columns: alert_threshold |

**SQL:** See migration Section 3.13, 3.14

---

### 1.11 Ambulance Dispatch (page: ambulance/integrated in bedtracker)
**UI Features:** Emergency dispatches, GPS tracking, hospital routing

| Feature | Database Status | Action |
|---------|----------------|--------|
| Dispatch records | MISSING | NEW TABLE: ambulance_dispatches |
| Dispatch status | MISSING | NEW ENUM: dispatch_status |
| Driver assignment | MISSING | NEW TABLE columns: driver_id, vehicle_id |
| Hospital routing | MISSING | NEW TABLE column: destination_facility_id |

**SQL:** See migration Section 3.15

---

### 1.12 Data Collectors (page: facilityscout)
**UI Features:** Field collectors, submissions, GPS tracking, approvals

| Feature | Database Status | Action |
|---------|----------------|--------|
| Collector profiles | MISSING | NEW TABLE: data_collectors |
| Work submissions | MISSING | NEW TABLE: collector_submissions |
| Submission review | MISSING | NEW TABLE columns: reviewed_by, review_notes |

**SQL:** See migration Section 3.16, 3.17

---

### 1.13 Security Center (page: security)
**UI Features:** Threat monitor, audit logs, admin sessions, access control

| Feature | Database Status | Action |
|---------|----------------|--------|
| Threat monitoring | MISSING | NEW TABLE: security_threats |
| Threat severity | MISSING | NEW ENUM: threat_level |
| Threat status | MISSING | NEW ENUM: threat_status |
| Admin activity logs | MISSING | NEW TABLE: admin_activity_logs |
| Admin action types | MISSING | NEW ENUM: admin_action_type |
| Admin sessions | MISSING | NEW TABLE: admin_sessions |
| Admin roles | MISSING | NEW ENUM: admin_role |

**SQL:** See migration Section 3.1, 3.2, 3.3

---

### 1.14 HCP Management (page: hcp)
**UI Features:** Healthcare professional onboarding, verification, license tracking

| Feature | Database Status | Action |
|---------|----------------|--------|
| HCP verification | MISSING | NEW TABLE: hcp_verifications |
| License tracking | MISSING | NEW TABLE columns: license_number, license_expiry |
| Verification status | MISSING | NEW TABLE column: verification_status |

**SQL:** See migration Section 3.22

---

### 1.15 Jobs (page: jobs)
**UI Features:** Job postings, applications, hiring workflow

| Feature | Database Status | Action |
|---------|----------------|--------|
| Job postings | MISSING | NEW TABLE: job_postings |
| Job applications | MISSING | NEW TABLE: job_applications |
| Application status | MISSING | NEW TABLE column: status |
| Hiring workflow | MISSING | NEW TABLE columns: reviewed_by, review_notes |

**SQL:** See migration Section 3.26, 3.27

---

### 1.16 Referrals (page: facilityscout)
**UI Features:** Referral tracking, rewards

| Feature | Database Status | Action |
|---------|----------------|--------|
| Referral records | MISSING | NEW TABLE: facility_scout_referrals |
| Reward tracking | MISSING | NEW TABLE columns: reward_amount, reward_paid |

**SQL:** See migration Section 3.21

---

### 1.17 Content Moderation (page: ai, users-flagged)
**UI Features:** AI moderation, flagged content, review workflow

| Feature | Database Status | Action |
|---------|----------------|--------|
| Moderation flags | MISSING | NEW TABLE: content_moderation_flags |
| AI detection | MISSING | NEW TABLE columns: ai_detected, ai_confidence |
| Moderation status | MISSING | NEW ENUM: moderation_status |

**SQL:** See migration Section 3.5

---

### 1.18 Transactions (page: transactions)
**UI Features:** Payment records, refunds, subscription billing

| Feature | Database Status | Action |
|---------|----------------|--------|
| Transaction records | MISSING | NEW TABLE: transaction_records |
| Payment provider tracking | MISSING | NEW TABLE columns: payment_provider, provider_reference |

**SQL:** See migration Section 3.25

---

## 2. Supabase SDK vs Custom Node.js Backend Analysis

### 2.1 Features Fully Achievable with Supabase SDK

| Feature | Supabase Capability | Implementation |
|---------|---------------------|----------------|
| **CRUD Operations** | Auto REST/GraphQL API | Direct SDK calls |
| **Real-time Updates** | Supabase Realtime | Subscribe to table changes |
| **Auth & Sessions** | Supabase Auth | Built-in OAuth, MFA, OTP |
| **File Storage** | Supabase Storage | Upload/download with policies |
| **Row-Level Security** | PostgreSQL RLS | Policy-based access control |
| **User Profiles** | Standard SELECT/INSERT/UPDATE | Direct queries |
| **Facility Listings** | Standard CRUD + PostGIS | Geospatial queries |
| **Content Management** | Standard CRUD | Direct queries |
| **Message History** | Standard SELECT with filters | Direct queries |
| **Notifications** | INSERT + Realtime | Direct queries |
| **Basic Analytics** | PostgreSQL aggregates | SQL via RPC |
| **IBP Management** | Standard CRUD | Direct queries |
| **Marketing Discounts** | Standard CRUD | Direct queries |
| **FAQ Management** | Standard CRUD | Direct queries |
| **Job Listings** | Standard CRUD | Direct queries |
| **Workout Library** | Standard CRUD | Direct queries |

### 2.2 Features Requiring Custom Node.js Backend

| Feature | Why Custom Backend Needed | Proposed Solution |
|---------|--------------------------|-------------------|
| **Payment Processing** | Requires payment gateway integration (Paystack/Flutterwave) | Node.js + payment SDK |
| **Escrow Logic** | Complex state machine, payment holds/releases | Node.js + payment webhooks |
| **Push Notifications** | Expo Push API requires server key | Node.js + expo-server-sdk |
| **SMS/WhatsApp** | Twilio API integration | Node.js + twilio SDK |
| **Email Campaigns** | Bulk email via SendGrid/AWS SES | Node.js + email service |
| **AI Moderation** | External AI API (OpenAI/AWS Rekognition) | Node.js + AI API client |
| **Scheduled Jobs** | pg_cron limited for complex workflows | Node.js + node-cron/bull |
| **Data Export** | Complex CSV/Excel/PDF generation | Node.js + reporting library |
| **Image Processing** | Thumbnails, compression, OCR | Node.js + sharp/tesseract |
| **Analytics Pipeline** | Complex aggregations, caching | Node.js + Redis + scheduled jobs |
| **Webhooks** | External service integrations | Node.js + webhook handlers |
| **Rate Limiting** | API abuse prevention | Node.js + Redis |
| **Multi-step Workflows** | Approval chains, notifications | Node.js + state machine |
| **Data Migration** | Complex ETL operations | Node.js + batch processing |
| **Search Indexing** | Full-text search, Elasticsearch | Node.js + search service |
| **Caching Layer** | Redis for performance | Node.js + Redis |
| **Background Jobs** | Queue-based processing | Node.js + Bull/BullMQ |
| **External API Proxy** | CORS, rate limiting, caching | Node.js + axios + cache |
| **Report Generation** | PDF/Excel generation | Node.js + puppeteer/xlsx |
| **Multi-tenant Isolation** | Complex tenant logic beyond RLS | Node.js middleware |

### 2.3 Hybrid Features (Supabase + Custom Backend)

| Feature | Supabase Role | Custom Backend Role |
|---------|-------------|---------------------|
| **User Registration** | Auth, profile storage | Validation, welcome email, push |
| **Facility Onboarding** | Data storage, RLS | Document verification, approval workflow |
| **Medication Orders** | Order storage, RLS | Payment, escrow, delivery integration |
| **Chat System** | Messages, conversations | Push notifications, moderation queue |
| **Fitness Challenges** | Challenge data, participation | Leaderboard calculation, rewards |
| **BedTracker** | Bed data, alerts | SMS alerts, emergency routing |
| **Ambulance Dispatch** | Dispatch records | GPS routing, ETA calculation |
| **Admin Broadcasts** | Broadcast storage | Segmentation, delivery tracking |
| **Subscription Billing** | Plan storage, status | Payment processing, invoicing |
| **Security Monitoring** | Threat logs | Analysis, auto-mitigation |
| **Content Publishing** | Content storage | Review workflow, scheduling |
| **Referral System** | Referral records | Reward calculation, payout |

---

## 3. Recommended Architecture

``nMobile App (React Native)
    |
    |---> Supabase SDK (Auth, Database, Realtime, Storage)
    |       |---> PostgreSQL (Data, RLS, Functions)
    |       |---> Realtime (Live updates)
    |       |---> Storage (Files, Images)
    |
    |---> Custom Node.js API (REST/GraphQL)
            |---> Payment Gateway (Paystack/Flutterwave)
            |---> Expo Push Notifications
            |---> Twilio (SMS/WhatsApp)
            |---> SendGrid/SES (Email)
            |---> AI APIs (Moderation)
            |---> Redis (Cache, Sessions, Rate Limit)
            |---> Bull/BullMQ (Background Jobs)
            |---> S3/CloudFront (CDN)
            |---> Elasticsearch (Search)
``n
---

## 4. Migration Order

1. **Phase 1 - Foundation:**
   - Create new enums
   - ALTER existing tables (add columns)
   - Update RLS policies on existing tables

2. **Phase 2 - Core Admin:**
   - Create admin_activity_logs
   - Create admin_sessions
   - Create security_threats
   - Create platform_broadcasts
   - Create content_moderation_flags

3. **Phase 3 - Business Logic:**
   - Create fitness_challenges, fitness_trainers, workout_plans
   - Create subscription_plans, user_subscriptions
   - Create transaction_records
   - Create job_postings, job_applications
   - Create hcp_verifications

4. **Phase 4 - Operations:**
   - Create escrow_transactions, medication_enquiries
   - Create pharmacy_campaigns
   - Create bed_tracker_facilities, bed_tracker_alerts
   - Create ambulance_dispatches
   - Create data_collectors, collector_submissions

5. **Phase 5 - Analytics:**
   - Create platform_metrics_snapshots
   - Create notification_templates, notification_automation_rules
   - Create facility_scout_referrals
   - Apply all triggers
   - Enable RLS on all new tables

---

## 5. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Data migration from old schema | Create mapping scripts, test with staging data |
| RLS policy complexity | Test all policies with multiple user roles |
| Performance with 164+ policies | Monitor query execution, add indexes |
| Enum changes require downtime | Use text columns initially, migrate to enums |
| Realtime subscription load | Implement channel filtering, limit subscriptions |

---

*End of Document*

