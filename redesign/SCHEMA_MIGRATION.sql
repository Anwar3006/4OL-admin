-- 4OURLIFE ADMIN PANEL SCHEMA MIGRATION
-- Generated: 2026-05-17

-- SECTION 1: NEW ENUMS
CREATE TYPE public.admin_role AS ENUM ('super_admin','admin','moderator','support','viewer');
CREATE TYPE public.admin_action_type AS ENUM ('create','update','delete','verify','approve','reject','suspend','ban','export','login','logout','broadcast','settings_change');
CREATE TYPE public.challenge_status AS ENUM ('draft','upcoming','active','completed','cancelled');
CREATE TYPE public.threat_level AS ENUM ('critical','high','medium','low','info');
CREATE TYPE public.threat_status AS ENUM ('open','mitigated','monitoring','review','resolved','auto_resolved');
CREATE TYPE public.broadcast_type AS ENUM ('all_users','segment','region','facility_type','premium_only','active_users');
CREATE TYPE public.broadcast_status AS ENUM ('draft','scheduled','sending','sent','partial','failed');
CREATE TYPE public.escrow_status AS ENUM ('pending','held','released','refunded','disputed','resolved');
CREATE TYPE public.delivery_status AS ENUM ('pending','processing','shipped','in_transit','delivered','failed','returned');
CREATE TYPE public.moderation_status AS ENUM ('pending_review','approved','rejected','flagged','escalated','auto_moderated');
CREATE TYPE public.campaign_status AS ENUM ('draft','scheduled','live','paused','ended','pending_review');


-- SECTION 2: ALTER EXISTING TABLES

-- user_profiles - add admin fields
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'user', ADD COLUMN IF NOT EXISTS role text DEFAULT 'user', ADD COLUMN IF NOT EXISTS status text DEFAULT 'active', ADD COLUMN IF NOT EXISTS admin_role public.admin_role, ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false, ADD COLUMN IF NOT EXISTS admin_permissions jsonb DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone, ADD COLUMN IF NOT EXISTS login_attempts integer DEFAULT 0, ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone, ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false, ADD COLUMN IF NOT EXISTS mfa_verified_at timestamp with time zone, ADD COLUMN IF NOT EXISTS whitelisted_ips text[] DEFAULT '{}', ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.user_profiles ADD CONSTRAINT IF NOT EXISTS chk_user_type CHECK (user_type IN ('user','admin','facility_owner','ibp','hcp'));
ALTER TABLE public.user_profiles ADD CONSTRAINT IF NOT EXISTS chk_user_status CHECK (status IN ('active','inactive','suspended','banned','pending_verification'));


-- conditions - add admin fields
ALTER TABLE public.conditions ADD COLUMN IF NOT EXISTS status text DEFAULT 'published', ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false, ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0, ADD COLUMN IF NOT EXISTS featured_from timestamp with time zone, ADD COLUMN IF NOT EXISTS featured_until timestamp with time zone, ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone, ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false, ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.conditions ADD CONSTRAINT IF NOT EXISTS chk_condition_status CHECK (status IN ('draft','published','archived','pending_review'));

-- symptoms - add admin fields
ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS status text DEFAULT 'published', ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false, ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone, ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.symptoms ADD CONSTRAINT IF NOT EXISTS chk_symptom_status CHECK (status IN ('draft','published','archived','pending_review'));

-- facility_profile - add admin moderation
ALTER TABLE public.facility_profile ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone, ADD COLUMN IF NOT EXISTS rejection_reason text, ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false, ADD COLUMN IF NOT EXISTS featured_order integer DEFAULT 0, ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS rating_average numeric(2,1) DEFAULT 0, ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS subscription_tier text, ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp with time zone, ADD COLUMN IF NOT EXISTS verification_documents jsonb DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS admin_notes text;


-- ibp - enhance with admin fields
ALTER TABLE public.ibp ADD COLUMN IF NOT EXISTS status public.ibp_status DEFAULT 'pending', ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone, ADD COLUMN IF NOT EXISTS rejection_reason text, ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false, ADD COLUMN IF NOT EXISTS featured_until timestamp with time zone, ADD COLUMN IF NOT EXISTS campaign_budget numeric(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS total_spend numeric(10,2) DEFAULT 0, ADD COLUMN IF NOT EXISTS admin_notes text;

-- conversations - add admin moderation
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false, ADD COLUMN IF NOT EXISTS group_name text, ADD COLUMN IF NOT EXISTS group_description text, ADD COLUMN IF NOT EXISTS group_category text, ADD COLUMN IF NOT EXISTS is_verified_only boolean DEFAULT false, ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 500, ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false, ADD COLUMN IF NOT EXISTS flagged_reason text, ADD COLUMN IF NOT EXISTS flagged_at timestamp with time zone, ADD COLUMN IF NOT EXISTS flagged_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;

-- messages - add moderation
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false, ADD COLUMN IF NOT EXISTS flag_reason text, ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS moderated_at timestamp with time zone, ADD COLUMN IF NOT EXISTS moderation_action text, ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false, ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- workouts - add fitness admin
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS status text DEFAULT 'published', ADD COLUMN IF NOT EXISTS difficulty_level text, ADD COLUMN IF NOT EXISTS duration_minutes integer, ADD COLUMN IF NOT EXISTS calories_burned integer, ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}', ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false, ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS completion_count integer DEFAULT 0;
ALTER TABLE public.workouts ADD CONSTRAINT IF NOT EXISTS chk_workout_status CHECK (status IN ('draft','published','archived'));


-- chat_support - enhance for admin
ALTER TABLE public.chat_support ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone, ADD COLUMN IF NOT EXISTS escalated_at timestamp with time zone, ADD COLUMN IF NOT EXISTS escalated_to uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS resolution_notes text, ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone, ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS category text, ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}', ADD COLUMN IF NOT EXISTS response_time_minutes integer, ADD COLUMN IF NOT EXISTS satisfaction_rating integer;

-- notifications - add campaign/template
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS template_id uuid, ADD COLUMN IF NOT EXISTS campaign_id uuid, ADD COLUMN IF NOT EXISTS is_broadcast boolean DEFAULT false, ADD COLUMN IF NOT EXISTS segment_filter jsonb, ADD COLUMN IF NOT EXISTS delivery_stats jsonb DEFAULT '{}'::jsonb, ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone, ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone, ADD COLUMN IF NOT EXISTS failed_at timestamp with time zone, ADD COLUMN IF NOT EXISTS failure_reason text;

-- healthy_living_info - add admin
ALTER TABLE public.healthy_living_info ADD COLUMN IF NOT EXISTS status text DEFAULT 'published', ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false, ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS content_type text DEFAULT 'article', ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}', ADD COLUMN IF NOT EXISTS reading_time_minutes integer;
ALTER TABLE public.healthy_living_info ADD CONSTRAINT IF NOT EXISTS chk_hli_status CHECK (status IN ('draft','published','archived','pending_review'));

-- faq_categories + faqs
ALTER TABLE public.faq_categories ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0, ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false, ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS helpful_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS not_helpful_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS status text DEFAULT 'published';
ALTER TABLE public.faqs ADD CONSTRAINT IF NOT EXISTS chk_faq_status CHECK (status IN ('draft','published','archived'));


-- delete_account_requests + user_invites
ALTER TABLE public.delete_account_requests ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone, ADD COLUMN IF NOT EXISTS rejection_reason text, ADD COLUMN IF NOT EXISTS data_export_url text, ADD COLUMN IF NOT EXISTS data_export_requested_at timestamp with time zone;
ALTER TABLE public.user_invites ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS invite_type text DEFAULT 'user', ADD COLUMN IF NOT EXISTS used_at timestamp with time zone, ADD COLUMN IF NOT EXISTS used_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS is_revoked boolean DEFAULT false, ADD COLUMN IF NOT EXISTS revoked_at timestamp with time zone, ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;

-- marketing_discounts + subscriptions
ALTER TABLE public.marketing_discounts ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0, ADD COLUMN IF NOT EXISTS usage_limit integer, ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true, ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL, ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;
ALTER TABLE public.marketing_subscriptions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true, ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT true, ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone, ADD COLUMN IF NOT EXISTS cancellation_reason text, ADD COLUMN IF NOT EXISTS payment_method text, ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending', ADD COLUMN IF NOT EXISTS invoice_url text;


-- ============================================================================
-- SECTION 3: NEW TABLES
-- ============================================================================

-- admin_activity_logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    admin_email text,
    action_type public.admin_action_type NOT NULL,
    target_table text,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    description text,
    ip_address text,
    user_agent text,
    session_id text,
    severity text DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_table ON public.admin_activity_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_activity_logs(created_at DESC);

-- admin_sessions
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    session_token text NOT NULL UNIQUE,
    ip_address text,
    user_agent text,
    device_info text,
    location text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_active_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    ended_reason text CHECK (ended_reason IN ('logout','timeout','forced','password_change','security_alert')),
    is_active boolean DEFAULT true,
    mfa_verified boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_admin_sess_admin ON public.admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sess_active ON public.admin_sessions(is_active) WHERE is_active = true;


-- security_threats
CREATE TABLE IF NOT EXISTS public.security_threats (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    threat_level public.threat_level NOT NULL,
    threat_type text NOT NULL,
    title text NOT NULL,
    description text,
    affected_users integer DEFAULT 0,
    affected_records text,
    source_ip text,
    source_module text,
    status public.threat_status DEFAULT 'open',
    mitigation_action text,
    mitigated_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    mitigated_at timestamp with time zone,
    auto_detected boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    resolution_notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_threats_level ON public.security_threats(threat_level);
CREATE INDEX IF NOT EXISTS idx_threats_status ON public.security_threats(status);

-- platform_broadcasts
CREATE TABLE IF NOT EXISTS public.platform_broadcasts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    message text NOT NULL,
    broadcast_type public.broadcast_type NOT NULL,
    segment_filter jsonb DEFAULT '{}'::jsonb,
    target_regions text[] DEFAULT '{}',
    target_facility_types text[] DEFAULT '{}',
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    completed_at timestamp with time zone,
    status public.broadcast_status DEFAULT 'draft',
    total_recipients integer DEFAULT 0,
    sent_count integer DEFAULT 0,
    failed_count integer DEFAULT 0,
    read_count integer DEFAULT 0,
    created_by uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    approved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    approved_at timestamp with time zone,
    delivery_stats jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON public.platform_broadcasts(status);

-- content_moderation_flags
CREATE TABLE IF NOT EXISTS public.content_moderation_flags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    content_type text NOT NULL CHECK (content_type IN ('message','facility_review','forum_post','profile','comment')),
    content_id text NOT NULL,
    reported_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    report_reason text NOT NULL,
    report_detail text,
    ai_detected boolean DEFAULT false,
    ai_confidence numeric(3,2),
    ai_reason text,
    status public.moderation_status DEFAULT 'pending_review',
    reviewed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    action_taken text,
    action_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_moderation_content ON public.content_moderation_flags(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_moderation_status ON public.content_moderation_flags(status);


-- fitness_challenges
CREATE TABLE IF NOT EXISTS public.fitness_challenges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    challenge_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    goal_metric text,
    goal_value numeric,
    reward_description text,
    reward_image_url text,
    status public.challenge_status DEFAULT 'draft',
    is_public boolean DEFAULT true,
    max_participants integer,
    current_participants integer DEFAULT 0,
    completion_count integer DEFAULT 0,
    featured_image_url text,
    tags text[] DEFAULT '{}',
    created_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.fitness_challenges(status);

-- fitness_trainers
CREATE TABLE IF NOT EXISTS public.fitness_trainers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    bio text,
    certifications text[] DEFAULT '{}',
    specialties text[] DEFAULT '{}',
    years_experience integer,
    rating_average numeric(2,1) DEFAULT 0,
    rating_count integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    verified_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    verified_at timestamp with time zone,
    status text DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected')),
    total_sessions integer DEFAULT 0,
    total_clients integer DEFAULT 0,
    profile_video_url text,
    social_links jsonb DEFAULT '{}'::jsonb,
    availability_schedule jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- workout_plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    difficulty_level text NOT NULL,
    duration_weeks integer NOT NULL,
    workouts_per_week integer NOT NULL,
    target_body_parts text[] DEFAULT '{}',
    goals text[] DEFAULT '{}',
    is_premium boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    status text DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
    author_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    author_type text DEFAULT 'trainer' CHECK (author_type IN ('trainer','admin','ai')),
    total_completions integer DEFAULT 0,
    average_rating numeric(2,1) DEFAULT 0,
    rating_count integer DEFAULT 0,
    tags text[] DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- workout_plan_exercises
CREATE TABLE IF NOT EXISTS public.workout_plan_exercises (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_id uuid NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
    workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
    week_number integer NOT NULL,
    day_number integer NOT NULL,
    order_index integer NOT NULL,
    sets integer,
    reps text,
    duration_seconds integer,
    rest_seconds integer,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wpe_plan ON public.workout_plan_exercises(plan_id);


-- escrow_transactions
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_reference text NOT NULL UNIQUE,
    enquiry_id uuid NOT NULL,
    buyer_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    seller_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'GHS',
    status public.escrow_status DEFAULT 'pending',
    held_at timestamp with time zone,
    released_at timestamp with time zone,
    refunded_at timestamp with time zone,
    released_to text CHECK (released_to IN ('seller','buyer')),
    platform_fee numeric(10,2) DEFAULT 0,
    payment_provider text,
    payment_provider_reference text,
    dispute_reason text,
    dispute_raised_at timestamp with time zone,
    dispute_resolved_at timestamp with time zone,
    dispute_resolved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    dispute_resolution text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_escrow_buyer ON public.escrow_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller ON public.escrow_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status ON public.escrow_transactions(status);

-- medication_enquiries
CREATE TABLE IF NOT EXISTS public.medication_enquiries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    prescription_id uuid,
    medication_name text NOT NULL,
    medication_description text,
    dosage text,
    quantity integer NOT NULL,
    urgency text DEFAULT 'normal' CHECK (urgency IN ('normal','urgent','emergency')),
    status text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','rejected')),
    pharmacy_id uuid REFERENCES public.facility_profile(id) ON DELETE SET NULL,
    pharmacist_notes text,
    delivery_address text,
    delivery_gps text,
    delivery_status public.delivery_status,
    tracking_number text,
    courier_name text,
    estimated_delivery date,
    actual_delivery timestamp with time zone,
    delivery_proof_url text,
    payment_status text DEFAULT 'pending',
    payment_amount numeric(10,2),
    escrow_id uuid REFERENCES public.escrow_transactions(id) ON DELETE SET NULL,
    is_insured boolean DEFAULT false,
    insurance_provider text,
    insurance_policy_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_med_enq_user ON public.medication_enquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_med_enq_status ON public.medication_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_med_enq_pharmacy ON public.medication_enquiries(pharmacy_id);

-- pharmacy_campaigns
CREATE TABLE IF NOT EXISTS public.pharmacy_campaigns (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id uuid NOT NULL REFERENCES public.facility_profile(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    campaign_type text NOT NULL,
    target_regions text[] DEFAULT '{}',
    target_medications text[] DEFAULT '{}',
    target_user_segments text[] DEFAULT '{}',
    budget numeric(10,2) DEFAULT 0,
    spend numeric(10,2) DEFAULT 0,
    impressions integer DEFAULT 0,
    clicks integer DEFAULT 0,
    conversions integer DEFAULT 0,
    start_date date NOT NULL,
    end_date date,
    status public.campaign_status DEFAULT 'draft',
    created_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    approved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_phar_cmp_pharm ON public.pharmacy_campaigns(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_phar_cmp_status ON public.pharmacy_campaigns(status);


-- bed_tracker_facilities
CREATE TABLE IF NOT EXISTS public.bed_tracker_facilities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid NOT NULL UNIQUE REFERENCES public.facility_profile(id) ON DELETE CASCADE,
    total_beds integer NOT NULL DEFAULT 0,
    available_beds integer NOT NULL DEFAULT 0,
    occupied_beds integer NOT NULL DEFAULT 0,
    emergency_beds integer DEFAULT 0,
    icu_beds integer DEFAULT 0,
    icu_available integer DEFAULT 0,
    general_ward_beds integer DEFAULT 0,
    general_ward_available integer DEFAULT 0,
    maternity_beds integer DEFAULT 0,
    maternity_available integer DEFAULT 0,
    pediatric_beds integer DEFAULT 0,
    pediatric_available integer DEFAULT 0,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    is_tracking_enabled boolean DEFAULT true,
    alert_threshold integer DEFAULT 5,
    auto_alert_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- bed_tracker_alerts
CREATE TABLE IF NOT EXISTS public.bed_tracker_alerts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid NOT NULL REFERENCES public.bed_tracker_facilities(id) ON DELETE CASCADE,
    alert_type text NOT NULL,
    severity text NOT NULL CHECK (severity IN ('critical','warning','info')),
    message text NOT NULL,
    bed_type text,
    beds_available integer,
    beds_total integer,
    is_resolved boolean DEFAULT false,
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    notification_sent boolean DEFAULT false,
    notification_sent_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bed_alert_facility ON public.bed_tracker_alerts(facility_id);
CREATE INDEX IF NOT EXISTS idx_bed_alert_unresolved ON public.bed_tracker_alerts(is_resolved) WHERE is_resolved = false;

-- ambulance_dispatches
CREATE TABLE IF NOT EXISTS public.ambulance_dispatches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dispatch_reference text NOT NULL UNIQUE,
    emergency_type text NOT NULL,
    patient_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    caller_name text,
    caller_phone text,
    pickup_address text NOT NULL,
    pickup_gps text,
    pickup_region text,
    pickup_area text,
    destination_facility_id uuid REFERENCES public.facility_profile(id) ON DELETE SET NULL,
    destination_address text,
    destination_gps text,
    dispatcher_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    driver_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    vehicle_id text,
    status public.dispatch_status DEFAULT 'pending',
    eta_minutes integer,
    actual_arrival timestamp with time zone,
    actual_completion timestamp with time zone,
    notes text,
    priority text DEFAULT 'normal' CHECK (priority IN ('normal','urgent','critical')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_amb_status ON public.ambulance_dispatches(status);


-- data_collectors
CREATE TABLE IF NOT EXISTS public.data_collectors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    employee_id text NOT NULL UNIQUE,
    region text[] DEFAULT '{}',
    assigned_areas text[] DEFAULT '{}',
    total_submissions integer DEFAULT 0,
    approved_submissions integer DEFAULT 0,
    rejected_submissions integer DEFAULT 0,
    pending_submissions integer DEFAULT 0,
    last_active_at timestamp with time zone,
    is_active boolean DEFAULT true,
    supervisor_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    vehicle_assigned text,
    device_info jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- collector_submissions
CREATE TABLE IF NOT EXISTS public.collector_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    collector_id uuid NOT NULL REFERENCES public.data_collectors(id) ON DELETE CASCADE,
    submission_type text NOT NULL CHECK (submission_type IN ('facility','update','photo','report')),
    facility_id uuid REFERENCES public.facility_profile(id) ON DELETE SET NULL,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    photos text[] DEFAULT '{}',
    gps_location text,
    status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_review')),
    reviewed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_col_sub_collector ON public.collector_submissions(collector_id);
CREATE INDEX IF NOT EXISTS idx_col_sub_status ON public.collector_submissions(status);

-- notification_templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    template_type text NOT NULL CHECK (template_type IN ('sms','push','email','whatsapp')),
    subject text,
    body text NOT NULL,
    source_module text NOT NULL,
    variables jsonb DEFAULT '[]'::jsonb,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- notification_automation_rules
CREATE TABLE IF NOT EXISTS public.notification_automation_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    trigger_event text NOT NULL,
    source_module text NOT NULL,
    channel text[] DEFAULT '{}',
    target_audience text,
    condition_json jsonb DEFAULT '{}'::jsonb,
    template_id uuid REFERENCES public.notification_templates(id) ON DELETE SET NULL,
    is_active boolean DEFAULT true,
    last_fired_at timestamp with time zone,
    fire_count integer DEFAULT 0,
    created_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


-- platform_metrics_snapshots
CREATE TABLE IF NOT EXISTS public.platform_metrics_snapshots (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    snapshot_date date NOT NULL UNIQUE,
    total_users integer DEFAULT 0,
    active_users integer DEFAULT 0,
    new_users integer DEFAULT 0,
    total_facilities integer DEFAULT 0,
    active_facilities integer DEFAULT 0,
    total_ibps integer DEFAULT 0,
    active_ibps integer DEFAULT 0,
    total_workouts integer DEFAULT 0,
    total_challenges integer DEFAULT 0,
    total_messages integer DEFAULT 0,
    total_enquiries integer DEFAULT 0,
    revenue numeric(12,2) DEFAULT 0,
    subscription_revenue numeric(12,2) DEFAULT 0,
    ad_revenue numeric(12,2) DEFAULT 0,
    avg_session_duration_minutes numeric(5,1) DEFAULT 0,
    retention_rate numeric(5,2) DEFAULT 0,
    top_regions jsonb DEFAULT '{}'::jsonb,
    top_facility_types jsonb DEFAULT '{}'::jsonb,
    engagement_metrics jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- facility_scout_referrals
CREATE TABLE IF NOT EXISTS public.facility_scout_referrals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    referrer_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    referred_facility_id uuid REFERENCES public.facility_profile(id) ON DELETE SET NULL,
    referred_user_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    referral_type text NOT NULL,
    status text DEFAULT 'pending' CHECK (status IN ('pending','completed','rewarded','expired')),
    reward_amount numeric(10,2) DEFAULT 0,
    reward_paid boolean DEFAULT false,
    reward_paid_at timestamp with time zone,
    expiry_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- hcp_verifications
CREATE TABLE IF NOT EXISTS public.hcp_verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    license_number text NOT NULL,
    license_type text NOT NULL,
    issuing_body text NOT NULL,
    license_expiry date NOT NULL,
    specialty text,
    years_of_practice integer,
    documents jsonb DEFAULT '[]'::jsonb,
    verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending','under_review','verified','rejected','expired')),
    verified_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    verified_at timestamp with time zone,
    rejection_reason text,
    next_verification_due date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- subscription_plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    tier text NOT NULL CHECK (tier IN ('free','standard','premium','featured')),
    price_monthly numeric(10,2) DEFAULT 0,
    price_yearly numeric(10,2) DEFAULT 0,
    currency text DEFAULT 'GHS',
    features jsonb DEFAULT '[]'::jsonb,
    privileges public.subscription_privilege[] DEFAULT '{}',
    max_listings integer,
    max_ad_campaigns integer,
    max_storage_gb integer,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- user_subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
    status text DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','suspended','pending')),
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    auto_renew boolean DEFAULT true,
    payment_method text,
    last_payment_at timestamp with time zone,
    next_payment_due timestamp with time zone,
    total_payments integer DEFAULT 0,
    total_paid numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_subs_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON public.user_subscriptions(status);


-- transaction_records
CREATE TABLE IF NOT EXISTS public.transaction_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_reference text NOT NULL UNIQUE,
    user_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    facility_id uuid REFERENCES public.facility_profile(id) ON DELETE SET NULL,
    transaction_type text NOT NULL CHECK (transaction_type IN ('payment','refund','subscription','ad_spend','withdrawal','deposit','platform_fee','commission')),
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'GHS',
    status text DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','cancelled','disputed')),
    payment_provider text,
    provider_reference text,
    metadata jsonb DEFAULT '{}'::jsonb,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_trans_user ON public.transaction_records(user_id);
CREATE INDEX IF NOT EXISTS idx_trans_facility ON public.transaction_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_trans_type ON public.transaction_records(transaction_type);

-- job_postings
CREATE TABLE IF NOT EXISTS public.job_postings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id uuid NOT NULL REFERENCES public.facility_profile(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    requirements text[] DEFAULT '{}',
    job_type text NOT NULL CHECK (job_type IN ('full_time','part_time','contract','temporary','internship')),
    specialty text,
    experience_level text,
    salary_min numeric(10,2),
    salary_max numeric(10,2),
    salary_currency text DEFAULT 'GHS',
    location text,
    region text,
    application_url text,
    contact_email text,
    status text DEFAULT 'draft' CHECK (status IN ('draft','published','closed','filled','expired')),
    published_at timestamp with time zone,
    expires_at timestamp with time zone,
    view_count integer DEFAULT 0,
    application_count integer DEFAULT 0,
    created_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- job_applications
CREATE TABLE IF NOT EXISTS public.job_applications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    applicant_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
    cover_letter text,
    resume_url text,
    portfolio_url text,
    status text DEFAULT 'pending' CHECK (status IN ('pending','reviewed','shortlisted','rejected','hired')),
    reviewed_by uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================================
-- SECTION 4: TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS 
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
 LANGUAGE plpgsql;


-- Apply updated_at triggers to new tables
DO 
DECLARE t text;
    tables text[] := ARRAY['fitness_challenges','fitness_trainers','workout_plans','escrow_transactions','medication_enquiries','pharmacy_campaigns','bed_tracker_facilities','bed_tracker_alerts','ambulance_dispatches','data_collectors','collector_submissions','notification_templates','notification_automation_rules','platform_metrics_snapshots','facility_scout_referrals','hcp_verifications','subscription_plans','user_subscriptions','transaction_records','job_postings','job_applications','content_moderation_flags','platform_broadcasts','security_threats','admin_sessions','admin_activity_logs'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('CREATE TRIGGER IF NOT EXISTS trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
    END LOOP;
END;
;

-- ============================================================================
-- SECTION 5: RLS POLICIES
-- ============================================================================
DO 
DECLARE t text;
    tables text[] := ARRAY['admin_activity_logs','admin_sessions','security_threats','platform_broadcasts','content_moderation_flags','fitness_challenges','fitness_trainers','workout_plans','workout_plan_exercises','escrow_transactions','medication_enquiries','pharmacy_campaigns','bed_tracker_facilities','bed_tracker_alerts','ambulance_dispatches','data_collectors','collector_submissions','notification_templates','notification_automation_rules','platform_metrics_snapshots','facility_scout_referrals','hcp_verifications','subscription_plans','user_subscriptions','transaction_records','job_postings','job_applications'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END;
;

-- Admin-only policies
CREATE POLICY IF NOT EXISTS admin_full_access_logs ON public.admin_activity_logs FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);
CREATE POLICY IF NOT EXISTS admin_full_access_sessions ON public.admin_sessions FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);
CREATE POLICY IF NOT EXISTS admin_full_access_threats ON public.security_threats FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);
CREATE POLICY IF NOT EXISTS admin_full_access_broadcasts ON public.platform_broadcasts FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);
CREATE POLICY IF NOT EXISTS admin_full_access_moderation ON public.content_moderation_flags FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);
CREATE POLICY IF NOT EXISTS admin_full_access_metrics ON public.platform_metrics_snapshots FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);
CREATE POLICY IF NOT EXISTS admin_full_access_templates ON public.notification_templates FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);
CREATE POLICY IF NOT EXISTS admin_full_access_rules ON public.notification_automation_rules FOR ALL USING (public.is_app_admin() = true) WITH CHECK (public.is_app_admin() = true);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
