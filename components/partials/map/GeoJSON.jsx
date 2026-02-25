"use client";
import React, { useRef, useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import seg from "./seg.json";
import ecomp from "./ecomp.json";

const GeoJSONMap = () => {
  const [mounted, setMounted] = useState(false);
  const [L, setL] = useState(null);
  const position = [37.5004851, -96.2261503];
  const mapKeyRef = useRef(`geojson-map-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    // Import Leaflet only on the client — it accesses `document` on load
    import("leaflet").then((leaflet) => {
      setL(leaflet.default ?? leaflet);
      setMounted(true);
    });
  }, []);

  if (!mounted || !L) {
    return <div className="w-full h-[300px] bg-slate-100 dark:bg-slate-700 animate-pulse rounded" />;
  }

  const setColor = () => ({ weight: 1 });

  const customMarkerIcon = (name) =>
    L.divIcon({ html: name, className: "icon" });

  const setIcon = ({ properties }, latlng) =>
    L.marker(latlng, { icon: customMarkerIcon(properties.Name) });

  return (
    <div className="w-full h-[300px]">
      <MapContainer
        key={mapKeyRef.current}
        center={position}
        zoom={4}
        maxZoom={18}
        zoomControl={false}
        minZoom={3}
        animate={true}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJSON data={seg} style={setColor} />
        <GeoJSON data={ecomp} pointToLayer={setIcon} />
      </MapContainer>
    </div>
  );
};

export default GeoJSONMap;
