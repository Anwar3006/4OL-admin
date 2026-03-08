"use client";
import { GoogleMap, useJsApiLoader, Data } from "@react-google-maps/api";
import React, { useState, useCallback, useEffect } from "react";
import { useGetFacilitiesMapData } from "@/hooks/supabase-calls/useFacilities";
import { useRegistrarTrails } from "@/hooks/supabase-calls/useUser";
import { getColorForId } from "@/lib/utils";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const center = {
  lat: 5.6037,
  lng: -0.187,
};

const GoogleMapContainer = ({ filters }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [map, setMap] = useState(null);
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(11);

  const { data: geojson, isLoading } = useGetFacilitiesMapData({
    minLng: bounds?.[0] ?? 0,
    minLat: bounds?.[1] ?? 0,
    maxLng: bounds?.[2] ?? 0,
    maxLat: bounds?.[3] ?? 0,
    zoom: Math.round(zoom),
    enabled: !!bounds,
    filters: filters,
  });

  console.log("GeoJSON: ", geojson);

  const onLoad = useCallback(function callback(currentMap) {
    setMap(currentMap);
  }, []);

  const onUnmount = useCallback(function callback() {
    setMap(null);
  }, []);

  const onBoundsChanged = () => {
    if (map) {
      const newBounds = map.getBounds();
      const ne = newBounds.getNorthEast();
      const sw = newBounds.getSouthWest();
      setBounds([sw.lng(), sw.lat(), ne.lng(), ne.lat()]);
      setZoom(map.getZoom());
    }
  };

  const [data, setData] = useState(null);
  const { data: trails } = useRegistrarTrails(1);

  useEffect(() => {
    if (data && trails) {
      trails.forEach((item) => {
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
  }, [data, trails]);

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
        data.remove(feature);
      });
      data.addGeoJson(geojson);
    }
  }, [data, geojson]);

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
            setData(loadedData);
            loadedData.setStyle((feature) => {
              const type = feature.getGeometry()?.getType();

              if (type === "LineString") {
                const registrarId = feature.getProperty("registrar_id");
                return {
                  strokeColor: getColorForId(registrarId),
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

              return {
                icon: {
                  path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                  fillColor: "#10b981",
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
              <span className="text-[12px] font-bold text-emerald-800 tracking-tight">
                SCANNING AREA...
              </span>
            </div>
          </div>
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
