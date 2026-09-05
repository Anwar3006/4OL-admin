/**
 * The shapes the Bed Tracker feature reads and renders.
 *
 * `BedTrackerTabProps` came from the **page component** — all five tabs
 * imported it from `../page`, so each tab depended on the page module just to
 * know its own props.
 *
 * That is now three features in a row with the same defect: anatomy parked
 * `BODY_SYSTEMS` in a dialog, facility-scout parked `FacilityScoutTabProps`
 * in its page, and bed-tracker did the same. It is not carelessness — with no
 * `schema/` slot there is nowhere neutral to put a shape two modules share, so
 * it lands in whichever file declares it first and everything else reaches
 * across to grab it.
 *
 * Hand-written, describing what the endpoints return today. Not generated —
 * that is E5.2.
 */

export type BedTrackerWard = {
  id: string;
  bed_tracker_facility_id: string;
  ward_type: string;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  last_updated_at: string | null;
  update_source: string | null;
  bed_tracker_facilities: {
    facility_id: string | null;
    facility_profile: { facility_name: string | null; region: string | null } | null;
  } | null;
};

export type BedTrackerOverview = {
  facilities: any[];
  wards: BedTrackerWard[];
  fleet: any[];
  alerts: any[];
  dispatches: any[];
  metrics: {
    trackedFacilities: number;
    facilitiesOnline: number;
    totalBeds: number;
    availableBeds: number;
    occupancyPct: number;
    criticalWards: number;
    ambulances: number;
    ambulancesActive: number;
    activeAlerts: number;
    activeDispatches: number;
  };
};

/**
 * Props every tab under `ui/` receives from the page shell.
 */
export type BedTrackerTabProps = {
  data: BedTrackerOverview | undefined;
  loading: boolean;
};
