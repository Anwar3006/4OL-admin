import React from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet"; // Import Leaflet library

const customIcon = L.icon({
  iconUrl: "/assets/images/icon/map_marker.svg", // Custom Icon URL
  iconSize: [30, 30], // Size of the icon
  iconAnchor: [20, 40], // Anchor point of the icon (center bottom)
});

const BasicMap = () => {
  const position = [9.367277099999999, -0.1494988]; // Ghana's approximate center

  return (
    <div className="w-full h-[300px]" style={{ zIndex: 0 }}>
      <MapContainer
        center={position}
        zoom={8}
        // maxZoom={18}
        // minZoom={3}
        // scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position} icon={customIcon}>
          {/* <Popup>
            <div className="">
              A pretty CSS3 popup. <br /> Easily customizable.
            </div>
          </Popup> */}
        </Marker>
      </MapContainer>
    </div>
  );
};

export default BasicMap;