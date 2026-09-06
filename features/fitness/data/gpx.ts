// features/fitness/data/gpx.ts
// Lightweight client-side GPX parser -- no external dependency needed since
// the browser's built-in DOMParser can already read the XML. Designed to
// feed straight into fitness_outdoor_routes.gps_data (jsonb), so no schema
// migration is required to support GPX uploads.

export interface GpxTrackPoint {
  lat: number;
  lon: number;
  ele?: number;
}

export interface GpxParseResult {
  points: [number, number][]; // [lat, lon] tuples -- compact for jsonb storage
  pointCount: number;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  distanceKm: number;
}

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: GpxTrackPoint, b: GpxTrackPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Parses raw GPX (XML) text into track points. Reads <trkpt> first (the
 * normal case for a recorded run/ride), falling back to <rtept> (a planned
 * route with no recorded telemetry) if there are no track points. */
export function parseGpx(gpxText: string): GpxParseResult {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, "application/xml");

  const parserError = xml.getElementsByTagName("parsererror");
  if (parserError.length > 0) {
    throw new Error("This file doesn't look like valid GPX/XML.");
  }

  let nodes = Array.from(xml.getElementsByTagName("trkpt"));
  if (nodes.length === 0) {
    nodes = Array.from(xml.getElementsByTagName("rtept"));
  }
  if (nodes.length === 0) {
    throw new Error(
      "No track points (<trkpt> or <rtept>) found in this GPX file.",
    );
  }

  const rawPoints: GpxTrackPoint[] = nodes
    .map((node) => {
      const lat = parseFloat(node.getAttribute("lat") || "");
      const lon = parseFloat(node.getAttribute("lon") || "");
      const eleNode = node.getElementsByTagName("ele")[0];
      const ele = eleNode?.textContent
        ? parseFloat(eleNode.textContent)
        : undefined;
      return { lat, lon, ele };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));

  if (rawPoints.length < 2) {
    throw new Error("GPX file needs at least 2 valid track points.");
  }

  let distanceKm = 0;
  let minLat = rawPoints[0].lat,
    maxLat = rawPoints[0].lat,
    minLon = rawPoints[0].lon,
    maxLon = rawPoints[0].lon;

  for (let i = 0; i < rawPoints.length; i++) {
    const p = rawPoints[i];
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
    if (i > 0) distanceKm += haversineKm(rawPoints[i - 1], p);
  }

  return {
    points: rawPoints.map((p) => [p.lat, p.lon]),
    pointCount: rawPoints.length,
    bounds: { minLat, maxLat, minLon, maxLon },
    distanceKm: Math.round(distanceKm * 100) / 100,
  };
}

/** Recomputes bounds from a stored [lat, lon] tuple array -- used when
 * loading an existing route back into the edit form, since we only persist
 * the points themselves in gps_data, not a redundant copy of the bounds. */
export function computeBoundsFromPoints(points: [number, number][]): {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
} {
  let minLat = points[0][0],
    maxLat = points[0][0],
    minLon = points[0][1],
    maxLon = points[0][1];
  for (const [lat, lon] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

// chief, can you remind me again the role of the fitness plan?
// There so many table that i have to keep track of and i forget the role of some TableSelection. fitness alone has about 26 tables with more to come.
// my understanding:
// - fitness plan has fitness exercises.
// - a fitness user enrolls in this plan to get access to structured exercises within that plan.
// - multiple fitness users can enroll in the same plan.
// - different fitness plans can have the same exercise.
// - after a user onboards we generate a fitness plan for this user with some exercises from our database using AI then we register this user as a fitness user.

// i have structured the above bullet points so if one or more dont align then you can change them to make them align with the business requirement.
