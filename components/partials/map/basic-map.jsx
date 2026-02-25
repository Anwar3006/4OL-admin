"use client";
import React, { useRef, useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

const BasicMap = () => {
  const [mounted, setMounted] = useState(false);
  const position = [47.31322, -1.319482];
  const mapKeyRef = useRef(`basic-map-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full h-[300px] bg-slate-100 dark:bg-slate-700 animate-pulse rounded" />;
  }

  return (
    <div className="w-full h-[300px]">
      <MapContainer
        key={mapKeyRef.current}
        center={position}
        zoom={8}
        maxZoom={18}
        minZoom={3}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
            <div>
              A pretty CSS3 popup. <br /> Easily customizable.
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default BasicMap;
