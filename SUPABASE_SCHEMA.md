# Supabase Database Schema

Project: rhbbxttxnvcziyqzptqs.supabase.co

## Tables

### account
- `id` (text, NOT NULL)
- `account_id` (text, NOT NULL)
- `provider_id` (text, NOT NULL)
- `user_id` (text, NOT NULL)
- `access_token` (text, NULLABLE)
- `refresh_token` (text, NULLABLE)
- `id_token` (text, NULLABLE)
- `access_token_expires_at` (timestamp without time zone, NULLABLE)
- `refresh_token_expires_at` (timestamp without time zone, NULLABLE)
- `scope` (text, NULLABLE)
- `password` (text, NULLABLE)
- `created_at` (timestamp without time zone, NOT NULL)
- `updated_at` (timestamp without time zone, NOT NULL)

### activity_logs
- `id` (uuid, NOT NULL)
- `actor_id` (text, NULLABLE)
- `actor_name` (text, NULLABLE)
- `action_type` (text, NOT NULL)
- `target_table` (text, NOT NULL)
- `record_id` (text, NULLABLE)
- `old_data` (jsonb, NULLABLE)
- `new_data` (jsonb, NULLABLE)
- `created_at` (timestamp with time zone, NULLABLE)

### body_parts
- `id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `parent_id` (uuid, NULLABLE)
- `mesh_id` (text, NULLABLE)
- `path` (ltree, NOT NULL)
- `level` (integer, NULLABLE)

### categories
- `id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `slug` (text, NOT NULL)
- `description` (text, NULLABLE)
- `parent_id` (uuid, NULLABLE)
- `path` (ltree, NOT NULL)
- `level` (integer, NULLABLE)
- `type` (category_type, NOT NULL)

### chat_support
- `id` (bigint, NOT NULL)
- `requested_by` (uuid, NULLABLE)
- `user_name` (text, NULLABLE)
- `subject` (text, NULLABLE)
- `message` (text, NULLABLE)
- `priority` (text, NULLABLE)
- `status` (text, NULLABLE)
- `is_deleted` (boolean, NULLABLE)
- `created_at` (timestamp with time zone, NULLABLE)
- `updated_at` (timestamp with time zone, NULLABLE)

### conditions
- `id` (uuid, NOT NULL)
- `name` (text, NULLABLE)
- `slug` (text, NULLABLE)
- `nhs_link` (text, NULLABLE)
- `image_url` (text, NULLABLE)
- `about` (jsonb, NULLABLE)
- `diagnosis` (jsonb, NULLABLE)
- `treatment` (jsonb, NULLABLE)
- `complications` (jsonb, NULLABLE)
- `symptoms` (jsonb, NULLABLE)
- `prevention` (jsonb, NULLABLE)
- `contact_your_doctor` (jsonb, NULLABLE)
- `more_information` (jsonb, NULLABLE)
- `attribution` (jsonb, NULLABLE)
- `is_systemic` (boolean, NULLABLE)
- `search_vector` (tsvector, NULLABLE)
- `specialist` (text, NULLABLE)
- `created_at` (timestamp without time zone, NOT NULL)
- `updated_at` (timestamp without time zone, NOT NULL)

### facility_profile
- `id` (uuid, NOT NULL)
- `user_id` (uuid, NOT NULL)
- `facility_name` (text, NOT NULL)
- `facility_type` (text, NOT NULL)
- `contact_number` (text, NOT NULL)
- `whatsapp_number` (text, NULLABLE)
- `email` (text, NOT NULL)
- `gps_address` (text, NOT NULL)
- `street` (text, NOT NULL)
- `post_code` (text, NULLABLE)
- `area` (text, NOT NULL)
- `district` (text, NOT NULL)
- `region` (text, NOT NULL)
- `country` (text, NOT NULL)
- `first_name` (text, NOT NULL)
- `last_name` (text, NOT NULL)
- `owner_email` (text, NOT NULL)
- `person_contact_number` (text, NOT NULL)
- `position` (text, NOT NULL)
- `featured_image_url` (text, NULLABLE)
- `media_urls` (ARRAY, NULLABLE)
- `services` (ARRAY, NULLABLE)
- `amenities` (ARRAY, NULLABLE)
- `business_hours` (jsonb, NULLABLE)
- `keywords` (text, NULLABLE)
- `ownership` (text, NULLABLE)
- `accepts_nhis` (boolean, NULLABLE)
- `wellness_subtype` (text, NULLABLE)
- `latitude` (double precision, NULLABLE)
- `longitude` (double precision, NULLABLE)
- `status` (facility_status_enum, NULLABLE)
- `is_deleted` (boolean, NULLABLE)
- `created_at` (timestamp with time zone, NULLABLE)
- `updated_at` (timestamp with time zone, NULLABLE)
- `approved_at` (timestamp with time zone, NULLABLE)

### user_profiles
- `user_id` (uuid, NOT NULL)
- `first_name` (text, NOT NULL)
- `last_name` (text, NOT NULL)
- `created_at` (timestamp without time zone, NOT NULL)
- `updated_at` (timestamp without time zone, NOT NULL)
- `sex` (text, NULLABLE)
- `dob` (text, NULLABLE)
- `user_type` (text, NOT NULL)
- `role` (text, NOT NULL)
- `status` (text, NOT NULL)
- `phone_number` (text, NOT NULL)
- `deleted_at` (timestamp without time zone, NULLABLE)
- `expo_push_token` (text, NULLABLE)
- `last_active` (timestamp with time zone, NULLABLE)
- `requires_password_change` (boolean, NULLABLE)
- `has_completed_fitness_onboarding` (boolean, NOT NULL)
- `avatar_url` (text, NULLABLE)

### tracker_logs
- `id` (uuid, NOT NULL)
- `user_id` (uuid, NULLABLE)
- `period_start_date` (date, NOT NULL)
- `period_end_date` (date, NULLABLE)
- `cycle_length` (integer, NULLABLE)
- `period_length` (integer, NULLABLE)
- `goal` (text, NULLABLE)
- `is_consistent` (text, NULLABLE)
- `ovulation_date` (date, NULLABLE)
- `fertile_window_dates` (ARRAY, NULLABLE)
- `next_reminder` (timestamp with time zone, NULLABLE)
- `flow_types` (jsonb, NULLABLE)
- `symptoms` (jsonb, NULLABLE)
- `moods` (jsonb, NULLABLE)
- `created_at` (timestamp with time zone, NULLABLE)
- `updated_at` (timestamp with time zone, NULLABLE)

*(Note: 52 tables exist in total, the above are highlights. Full list includes: activity_logs, facility_offerings, onboarding_requests, storage_cleanup_queue, twilio_whatsapp_handshakes, ibp, marketing_profile, download_stats, user_invites, verification, platform_metrics_history, user, account, body_parts, faq_categories, faqs, session, symptoms, symptom_causes, symptom_body_parts, symptom_categories, symptom_types, fitness_generated_workouts, facility_conversations, workouts, otp_verifications, registrar_locations, conditions, categories, condition_types, condition_causes, condition_body_parts, condition_categories, medication_reminders, notifications, user_notes, workout_reminders, fitness_onboarding_selections, tracker_logs, facility_favorites, facility_reviews, conversation_members, message_reads, delete_account_requests, messages, conversations, chat_support, facility_profile, marketing_discounts, marketing_subscriptions)*

## Enums

### category_type
- `condition`
- `symptom`

### facility_status_enum
- `pending`
- `active`
- `rejected`
- `inactive`

### facility_type_enum
- `hospitals_&_clinics`
- `herbal_centers`
- `diagnostic_labs`
- `pharmacies`
- `dental_clinics`
- `homes`
- `eye_clinics`
- `osteopathy_centers`
- `physiotherapy_centers`
- `prosthetics_centers`
- `psychiatric_centers`
- `ibps`
- `health_schools`

### ibp_status
- `pending`
- `approved`
- `suspended`
- `rejected`

### marketing_status_enum
- `draft`
- `scheduled`
- `live`
- `paused`
- `ended`

### marketing_type_enum
- `ads`
- `events`
- `news`
- `health`
- `other`

### offering_type
- `subscription`
- `walk-in`
- `package`
- `onetime_fee`

### region_enum
- `ahafo`, `ashanti`, `bono`, `bono east`, `central`, `eastern`, `greater accra`, `north east`, `northern`, `oti`, `savannah`, `upper east`, `upper west`, `volta`, `western`, `western north`

### subscription_privilege
- `business_analytics`, `performance_analytics`, `popup_notification`, `top_rated_placement`, `featured_placement`, `ad_discount_10`, `ad_discount_25`, `ad_discount_30`, `ad_discount_40`, `ad_discount_50`, `ad_flyer_discount_10`, `advanced_analytics`, `priority_support`

## Extensions
- `pgcrypto`: cryptographic functions
- `pg_stat_statements`: track planning and execution statistics
- `supabase_vault`: Supabase Vault Extension
- `pg_net`: Async HTTP
- `ltree`: hierarchical tree-like structures
- `uuid-ossp`: generate universally unique identifiers (UUIDs)
- `pg_trgm`: text similarity measurement
- `postgis`: geometry and geography spatial types
- `pg_cron`: Job scheduler

## Functions

- `delete_old_notifications()`: void
- `update_updated_at_column()`: trigger
- `request_user_id()`: text
- `is_app_admin()`: boolean
- `get_registrar_trails(days_back integer)`: TABLE(registrar_id text, trail jsonb)
- `set_marketing_discount_created_by()`: trigger
- `cleanup_expired_otps()`: void
- `update_workouts_updated_at()`: trigger
- `get_dashboard_metrics()`: json
- `admin_delete_medication_reminder(p_admin_id text, p_reminder_id uuid)`: void
- `get_platform_overview_metrics(time_filter text)`: json
- `create_ibp_profile(...)`: jsonb
- `sync_profile_role_to_user()`: trigger
- `fn_log_admin_activity()`: trigger
- `admin_change_facility_status(p_admin_id text, payload jsonb)`: void
- `get_user_app_role()`: text
- `get_conversations(p_user_id uuid, p_limit integer)`: jsonb
- `fn_create_group_conversation(...)`: uuid
- `fn_make_group_leader(p_conversation_id uuid, p_user_id uuid, p_facility_id uuid)`: void
- `trigger_delete_read_reminder_notifications()`: trigger
- `auto_cleanup_old_notifications()`: void
- `register_facility_with_profile(...)`: jsonb
- `insert_condition(...)`: text
- `update_condition(...)`: text
- `get_body_part_stats()`: TABLE(...)
- `register_symptom_complex(...)`: uuid
- `update_symptom_complex(...)`: text
- `capture_daily_metrics()`: void
- `queue_facility_files_for_deletion()`: trigger
