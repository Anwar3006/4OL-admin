/**
 * The shapes the Facility Scout feature reads and renders.
 *
 * Two things moved in here, and both were previously owned by a module that
 * had no business owning them:
 *
 *  - `ScoutSubmission`, `ScoutConfig` and `FacilityScoutOverview` came from
 *    the react-query hook, which meant the API handlers could not reference
 *    the shapes they themselves return without importing a client hook.
 *
 *  - `FacilityScoutTabProps` came from the **page component**. All five tabs
 *    imported it from `../page`, so every tab depended on the page module
 *    just to know its own props — and the import broke the moment the page
 *    was renamed. Same class of problem as anatomy's BODY_SYSTEMS living in
 *    a dialog: a shared contract parked in whichever file happened to
 *    declare it first.
 *
 * Hand-written, describing what the endpoints return today. Not generated —
 * that is E5.2.
 */

export type ScoutSubmission = {
  id: string;
  submission_ref: string;
  submitted_by: string;
  facility_name: string;
  facility_type: string;
  gps_location: string | null;
  photos: string[] | null;
  region: string | null;
  match_status: "new" | "duplicate";
  matched_facility_id: string | null;
  status: "pending" | "field_review" | "registered" | "rewarded" | "rejected";
  assigned_collector_id: string | null;
  priority: "normal" | "high" | "urgent";
  sla_due_at: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  user_profiles: { user_id: string; masked_name: string } | null;
  registrars: { employee_id: string } | null;
  matched_facility: { facility_name: string } | null;
};

export type ScoutConfig = {
  reward_hospital_mb: number;
  reward_pharmacy_mb: number;
  reward_clinic_mb: number;
  reward_lab_mb: number;
  reward_chps_mb: number;
  max_pending_per_user: number;
  gps_match_radius_m: number;
  photo_required: boolean;
  duplicate_detection: "gps_name" | "gps_only" | "manual";
  collector_auto_assign: boolean;
  reward_disbursement: "auto" | "manual";
  updated_at: string | null;
};

export type FacilityScoutOverview = {
  submissions: any[];
  collectors: any[];
  referrals: any[];
  scout_submissions: ScoutSubmission[];
  leaderboard: Array<{
    user_id: string;
    full_name: string;
    region: string | null;
    submissions: number;
    registered: number;
    duplicates: number;
    data_earned_mb: number;
  }>;
  config: ScoutConfig | null;
  metrics: {
    submissions: number;
    pendingReview: number;
    activeCollectors: number;
    rewardsDue: number;
    rewardLiability: number;
    totalSubmissions: number;
    scoutPending: number;
    facilitiesAdded: number;
    duplicates: number;
    rewardsQueue: number;
    dataRewardedMb: number;
  };
};

/**
 * Props every tab under `ui/` receives from the page shell.
 */
export type FacilityScoutTabProps = {
  data: FacilityScoutOverview | undefined;
  loading: boolean;
};
