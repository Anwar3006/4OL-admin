/**
 * Shared helpers for the Map & Footprint server routes (Gap Analysis Part F).
 * Coverage denominator comes from constant/ghana-locations.json (decision
 * F-D2): districts with >=1 active facility / districts listed per region.
 */
import ghanaLocations from "@/constant/ghana-locations.json";

const LOCATION_MAP = ghanaLocations as Record<string, string[]>;

/** "greater accra" | "Greater Accra" | "GREATER ACCRA REGION" -> "GREATER ACCRA REGION" */
export function normalizeRegionKey(region: string | null | undefined): string | null {
  if (!region) return null;
  const upper = String(region).trim().toUpperCase();
  if (!upper) return null;
  const candidate = upper.endsWith("REGION") ? upper : `${upper} REGION`;
  return LOCATION_MAP[candidate] !== undefined ? candidate : null;
}

/** Case-insensitive district membership per region (JSON is the source of truth). */
export function districtKey(regionKey: string | null, district: string | null | undefined): string | null {
  if (!regionKey || !district) return null;
  const districts = LOCATION_MAP[regionKey] ?? [];
  const match = districts.find((d) => d.toLowerCase() === String(district).trim().toLowerCase());
  return match ? `${regionKey}::${match}` : null;
}

export function totalDistrictCount(): number {
  return Object.values(LOCATION_MAP).reduce((sum, list) => sum + list.length, 0);
}

export function regionDistrictCount(regionKey: string): number {
  return LOCATION_MAP[regionKey]?.length ?? 0;
}

export function allRegionKeys(): string[] {
  return Object.keys(LOCATION_MAP);
}

/** Display label: "GREATER ACCRA REGION" -> "Greater Accra" */
export function regionLabel(regionKey: string): string {
  return regionKey
    .replace(/\s*REGION$/, "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
