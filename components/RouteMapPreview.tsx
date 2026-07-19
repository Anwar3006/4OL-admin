// components/RouteMapPreview.tsx
// ------------------------------------------------------------------------------
// Renders a route's GPS track (fitness_outdoor_routes.gps_data.points, or any
// [lat, lon][] array) on a Leaflet map with a colored polyline + start/finish
// markers. Leaflet touches `window` on import, so this file must only ever be
// loaded via `next/dynamic(() => import(...), { ssr: false })` from the
// server-rendered dialog that uses it — never import it directly.
//
// This manages the Leaflet map instance manually (raw `leaflet`, not
// react-leaflet's <MapContainer>) on purpose: React's dev-mode double-invoke
// of effects (on by default in Next.js) re-runs MapContainer's mount effect
// on the SAME DOM node before its cleanup has finished. Leaflet stamps a
// container with an internal `_leaflet_id` the instant a map is created and
// throws "Map container is already initialized" if asked to init a second
// one on a node still carrying that stamp — react-leaflet doesn't guard
// against this. Managing the instance directly lets us defend against it.
// ------------------------------------------------------------------------------
"use client";

import React, { useEffect, useMemo, useRef } from "react";
import L from "leaflet";

export interface RouteMapPreviewProps {
  points: [number, number][];
  strokeColor?: string;
  heightClassName?: string;
}

export default function RouteMapPreview({
  points,
  strokeColor = "#10B981", // matches --clr-green design token
  heightClassName = "h-72",
}: RouteMapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const hasRoute = points && points.length >= 2;

  // Cap the number of rendered points for the same reason the mobile app's
  // RouteDetailModal does — a raw GPX recording can carry thousands of
  // points, and rendering all of them is visibly slower than a
  // stride-sampled version that looks identical at map zoom levels.
  const displayPoints = useMemo(() => {
    if (!hasRoute) return [] as [number, number][];
    const MAX_POINTS = 500;
    if (points.length <= MAX_POINTS) return points;
    const stride = Math.ceil(points.length / MAX_POINTS);
    const sampled = points.filter((_, i) => i % stride === 0);
    const last = points[points.length - 1];
    if (sampled[sampled.length - 1] !== last) sampled.push(last);
    return sampled;
    // Depend on a stable, content-derived key rather than the `points`
    // array reference itself — the caller may pass a fresh `[]`/array
    // literal on every render (e.g. `data.gps_data?.points ?? []`), which
    // would otherwise tear down and recreate the whole map on unrelated
    // re-renders of the parent dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoute, points.length, points[0]?.[0], points[points.length - 1]?.[0]]);

  useEffect(() => {
    if (!hasRoute || !containerRef.current || displayPoints.length < 2) return;

    const container = containerRef.current as HTMLDivElement & {
      _leaflet_id?: number;
    };

    // Defensive guard against the double-invoke scenario described above:
    // if this node already has a map stamped on it (from an effect run
    // that hasn't been cleaned up yet), tear it down first rather than
    // letting L.map() throw.
    if (container._leaflet_id) {
      mapRef.current?.remove();
      mapRef.current = null;
      delete container._leaflet_id;
    }

    const map = L.map(container, {
      scrollWheelZoom: false,
      zoomControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const latLngs = displayPoints.map(([lat, lon]) => L.latLng(lat, lon));

    L.polyline(latLngs, {
      color: strokeColor,
      weight: 4,
      opacity: 0.9,
    }).addTo(map);

    L.circleMarker(latLngs[0], {
      radius: 7,
      color: "#ffffff",
      weight: 2,
      fillColor: strokeColor,
      fillOpacity: 1,
    })
      .bindTooltip("Start", {
        permanent: true,
        direction: "top",
        offset: [0, -8],
        className: "!text-[10px] !font-bold",
      })
      .addTo(map);

    L.circleMarker(latLngs[latLngs.length - 1], {
      radius: 7,
      color: "#ffffff",
      weight: 2,
      fillColor: "#EF4444",
      fillOpacity: 1,
    })
      .bindTooltip("Finish", {
        permanent: true,
        direction: "top",
        offset: [0, -8],
        className: "!text-[10px] !font-bold",
      })
      .addTo(map);

    map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24] });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRoute, displayPoints, strokeColor]);

  if (!hasRoute) {
    return (
      <div
        className={`${heightClassName} w-full flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-none gap-2`}
      >
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          No GPS track uploaded for this route
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${heightClassName} w-full rounded-none overflow-hidden border border-slate-200`}
    />
  );
}
