"use client";
import {
  GoogleMap,
  useJsApiLoader,
  Data,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetFacilitiesMapData } from "@/features/facilities/data/useFacilities";
import { useRegistrarTrails } from "@/features/users/data/useUser";
import { useIbpPins, useOutdoorRoutePins } from "@/features/map/data/useMap";
import { getColorForId } from "@/lib/utils";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const center = {
  lat: 5.6037,
  lng: -0.187,
};


/** Promoted from the JSDoc that documented these props while the file was .jsx. */
type MapLayers = {
  facilities: boolean;
  footprints: boolean;
  ibp: boolean;
  outdoorRoutes: boolean;
};

/** Outdoor-route marker payload from get_outdoor_route_pins. */
type RoutePin = {
  id: string;
  category?: string | null;
  name?: string | null;
  start_lat: number;
  start_lng: number;
  distance_km?: number | null;
  difficulty?: string | null;
  rating?: number | null;
  route_class?: string | null;
  has_gps?: boolean | null;
};

/** IBP business marker payload. */
/** One registrar trail from useRegistrarTrails. */
type RegistrarTrail = { registrar_id: string; trail: unknown };

type IbpPin = {
  id: string;
  business_name?: string | null;
  business_category?: string | null;
  district?: string | null;
  region?: string | null;
  latitude: number;
  longitude: number;
};

type GoogleMapContainerProps = {
  /** Region/district/type/status filter bag, passed straight to the map RPCs. */
  filters: Record<string, unknown>;
  layers?: MapLayers;
  focusRouteId?: string | null;
  selectedCollectorId?: string | null;
};

const GoogleMapContainer = ({
  filters,
  layers = { facilities: true, footprints: true, ibp: false, outdoorRoutes: false },
  focusRouteId = null,
  selectedCollectorId = null,
}: GoogleMapContainerProps) => {
  const router = useRouter();
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(11);
  const [selectedRoutePin, setSelectedRoutePin] = useState<RoutePin | null>(null);
  const [selectedIbpPin, setSelectedIbpPin] = useState<IbpPin | null>(null);

  const { data: geojson, isLoading } = useGetFacilitiesMapData({
    minLng: bounds?.[0] ?? 0,
    minLat: bounds?.[1] ?? 0,
    maxLng: bounds?.[2] ?? 0,
    maxLat: bounds?.[3] ?? 0,
    zoom: Math.round(zoom),
    enabled: !!bounds && layers.facilities,
    filters: filters,
  });

  // Secondary pin layers (Gap Analysis Part F, phases 2-3).
  const { data: ibpPins } = useIbpPins();
  const { data: routePins } = useOutdoorRoutePins();

  // Deep-link focus: /map?tab=map-view&route=<id> pans to the route start.
  useEffect(() => {
    if (!map || !focusRouteId || !routePins?.length) return;
    const pin = routePins.find((p) => p.id === focusRouteId);
    if (pin) {
      map.panTo({ lat: pin.start_lat, lng: pin.start_lng });
      map.setZoom(14);
      setSelectedRoutePin(pin);
    }
  }, [map, focusRouteId, routePins]);


  const onLoad = useCallback(function callback(currentMap: google.maps.Map) {
    setMap(currentMap);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const onBoundsChanged = () => {
    if (map) {
      const newBounds = map.getBounds();
      if (!newBounds) return;
      const ne = newBounds.getNorthEast();
      const sw = newBounds.getSouthWest();
      setBounds([sw.lng(), sw.lat(), ne.lng(), ne.lat()]);
      setZoom(map.getZoom() ?? zoom);
    }
  };

  useEffect(() => {
    if (!map || !window.google) return;

    const hasRegionOrDistrict = filters?.region || filters?.district;

    if (hasRegionOrDistrict) {
      const locationToSearch = filters?.district
        ? `${filters.district}, ${filters.region || ""}, Ghana`
        : `${filters.region}, Ghana`;

      const timeoutId = setTimeout(() => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: locationToSearch }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            if (results[0].geometry.viewport) {
              map.fitBounds(results[0].geometry.viewport);
            } else {
              map.panTo(results[0].geometry.location);
              map.setZoom(12);
            }
          } else {
            console.error("Geocode was not successful for the following reason: " + status);
          }
        });
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      // If we cleared all filters OR we only have facilityType/status
      // We zoom out to show Ghana
      const timeoutId = setTimeout(() => {
        // Center of Ghana
        const ghanaCenter = { lat: 7.9465, lng: -1.0232 };
        map.panTo(ghanaCenter);
        map.setZoom(7); // Zoom level 7 usually covers the country
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [filters?.region, filters?.district, filters?.facilityType, filters?.status, map]);

  const [data, setData] = useState<google.maps.Data | null>(null);
  const { data: trails } = useRegistrarTrails(1);

  useEffect(() => {
    if (!data) return;
    // Remove stale trail features before re-adding (layer toggle aware).
    const stale: google.maps.Data.Feature[] = [];
    data.forEach((feature) => {
      if (feature.getProperty("type") === "trail") stale.push(feature);
    });
    stale.forEach((feature) => data.remove(feature));

    if (layers.footprints && trails) {
      trails
        .filter(
          (item: RegistrarTrail) =>
            !selectedCollectorId ||
            selectedCollectorId === "all" ||
            item.registrar_id === selectedCollectorId,
        )
        .forEach((item: RegistrarTrail) => {
          const feature = {
            type: "Feature",
            geometry: item.trail,
            properties: {
              registrar_id: item.registrar_id,
              type: "trail",
            },
          };
          data.addGeoJson(feature);
        });
    }
  }, [data, trails, layers.footprints, selectedCollectorId]);

  const mapOptions = {
    zoomControl: true,
    fullscreenControl: true,
    mapTypeControl: true,
    streetViewControl: true,
    gestureHandling: "greedy",
    styles: [
      {
        featureType: "landscape",
        elementType: "geometry.fill",
        stylers: [{ color: "#e9ddc8" }],
      },
      {
        featureType: "poi.attraction",
        elementType: "labels.icon",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.attraction",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.business",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.government",
        elementType: "labels.icon",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.government",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.medical",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "poi.park",
        elementType: "labels.icon",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.place_of_worship",
        elementType: "labels.icon",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.place_of_worship",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.school",
        elementType: "labels.icon",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.school",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.sports_complex",
        elementType: "labels.icon",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "poi.sports_complex",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "road",
        elementType: "geometry.fill",
        stylers: [{ color: "#d49640" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels.icon",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#0b0b09" }],
      },
      {
        featureType: "water",
        elementType: "geometry.fill",
        stylers: [{ color: "#66bef4" }],
      },
    ],
  };

  useEffect(() => {
    if (data && geojson) {
      data.forEach((feature) => {
        if (feature.getProperty("type") !== "trail") data.remove(feature);
      });
      data.addGeoJson(geojson);
    }
  }, [data, geojson]);

  const pinPath =
    "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z";

  const makePinIcon = (fillColor: string) => ({
    path: pinPath,
    fillColor,
    fillOpacity: 1,
    strokeWeight: 1.5,
    strokeColor: "#ffffff",
    scale: 1.5,
    anchor: isLoaded ? new window.google.maps.Point(12, 22) : undefined,
    labelOrigin: isLoaded ? new window.google.maps.Point(12, 9) : undefined,
  });

  return isLoaded ? (
    <div className="h-full w-full overflow-hidden rounded-xl border bg-slate-50 shadow-inner">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={11}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onBoundsChanged={onBoundsChanged}
        options={mapOptions}
      >
        <Data
          onLoad={(loadedData) => {
            console.log("Data layer loaded:", loadedData);
            setData(loadedData);
            // Sync initial geojson if it's already available
            if (geojson) {
               loadedData.addGeoJson(geojson);
            }
            loadedData.setStyle((feature) => {
              const type = feature.getGeometry()?.getType();

              if (type === "LineString") {
                const registrarId = feature.getProperty("registrar_id");
                return {
                  strokeColor: getColorForId(String(registrarId ?? "")),
                  strokeWeight: 4,
                  strokeOpacity: 0.8,
                  icons: [
                    {
                      icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                      },
                      offset: "100px",
                      repeat: "200px",
                    },
                  ],
                };
              }

              const statusColors = {
                active: "#10b981", 
                pending: "#f59e0b",
                inactive: "#6b7280",
                rejected: "#ef4444",
              };
              const status = String(feature.getProperty("status") ?? "").toLowerCase();
              const fillColor =
                statusColors[status as keyof typeof statusColors] || "#10b981";

              return {
                icon: {
                  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                  fillColor: fillColor,
                  fillOpacity: 1,
                  strokeWeight: 1.5,
                  strokeColor: "#ffffff",
                  scale: 1.5,
                  anchor: new google.maps.Point(12, 22),
                  labelOrigin: new google.maps.Point(12, 9),
                },
                visible: feature.getProperty("type") !== "breadcrumb",
              };
            });
          }}
        />
        {isLoading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full shadow-lg border border-emerald-100">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <span className="text-sm font-bold text-emerald-800 tracking-tight">
                SCANNING AREA...
              </span>
            </div>
          </div>
        )}

        {/* IBP business pins (purple, decision F-D3) */}
        {layers.ibp &&
          (ibpPins ?? []).map((pin) => (
            <Marker
              key={`ibp-${pin.id}`}
              position={{ lat: pin.latitude, lng: pin.longitude }}
              icon={makePinIcon("#8b5cf6")}
              onClick={() => {
                setSelectedIbpPin(pin);
                setSelectedRoutePin(null);
              }}
            />
          ))}

        {/* Outdoor workout route pins (green, start of GPS track — F-D4) */}
        {layers.outdoorRoutes &&
          (routePins ?? []).map((pin) => (
            <Marker
              key={`route-${pin.id}`}
              position={{ lat: pin.start_lat, lng: pin.start_lng }}
              icon={makePinIcon("#22c55e")}
              onClick={() => {
                setSelectedRoutePin(pin);
                setSelectedIbpPin(null);
              }}
            />
          ))}

        {selectedIbpPin && (
          <InfoWindow
            position={{ lat: selectedIbpPin.latitude, lng: selectedIbpPin.longitude }}
            onCloseClick={() => setSelectedIbpPin(null)}
          >
            <div className="text-xs space-y-1 min-w-[160px]">
              <div className="font-bold text-slate-800">🏪 {selectedIbpPin.business_name}</div>
              <div className="text-slate-500 capitalize">{selectedIbpPin.business_category}</div>
              <div className="text-slate-400">
                {selectedIbpPin.district}, {selectedIbpPin.region}
              </div>
              <button
                className="mt-1 text-emerald-700 font-bold hover:underline"
                onClick={() => router.push("/ibp")}
              >
                View Business →
              </button>
            </div>
          </InfoWindow>
        )}

        {selectedRoutePin && (
          <InfoWindow
            position={{ lat: selectedRoutePin.start_lat, lng: selectedRoutePin.start_lng }}
            onCloseClick={() => setSelectedRoutePin(null)}
          >
            <div className="text-xs space-y-1 min-w-[180px]">
              <div className="font-bold text-slate-800">🌳 {selectedRoutePin.name}</div>
              <div className="text-slate-500 capitalize">
                {selectedRoutePin.category || "Trail"} · {selectedRoutePin.difficulty}
              </div>
              <div className="text-slate-400">
                {selectedRoutePin.distance_km ? `${selectedRoutePin.distance_km} km` : ""}
                {selectedRoutePin.rating ? ` · ⭐ ${selectedRoutePin.rating}` : ""}
              </div>
              <div className="text-slate-400">
                {selectedRoutePin.route_class === "official" ? "🏅 Official" : "👥 Community"}
                {!selectedRoutePin.has_gps && " · ⚠️ No GPS"}
              </div>
              <button
                className="mt-1 text-emerald-700 font-bold hover:underline"
                onClick={() =>
                  router.push(`/fitness?tab=outdoor&route=${selectedRoutePin.id}`)
                }
              >
                View Route →
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  ) : (
    <div className="flex items-center justify-center h-full">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );
};

export default React.memo(GoogleMapContainer);
