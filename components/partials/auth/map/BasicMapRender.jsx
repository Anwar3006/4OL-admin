"use client";
import React, { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import * as mapService from "@/app/services/map_service";
import Dropdown from "@/components/ui/Dropdown";
import Icons from "@/components/ui/Icon";
import Swicth from "@/components/ui/Switch";

// Facility status options — lowercase to match facility_status_enum
const facilityStatusOptions = [
  { label: "All", value: "All" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Inactive", value: "inactive" },
  { label: "Rejected", value: "rejected" },
];

const BasicMapRender = () => {
  const [isClient, setIsClient] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regionMap, setRegionMap] = useState({});
  const [regionList, setRegionList] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("Greater Accra");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedFacilityType, setSelectedFacilityType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [showBusinessPins, setShowBusinessPins] = useState(true);
  const [facilityTypes, setFacilityTypes] = useState([]);
  const [districtList, setDistrictList] = useState([]);
  const [mapCenter, setMapCenter] = useState([7.9465, -1.0232]);
  const [mapZoom, setMapZoom] = useState(7);

  // L.icon() must be created client-side only — Leaflet accesses the DOM on init
  const icons = useMemo(() => {
    if (!isClient) return null;
    // Dynamic import ensures L is only evaluated in the browser
    const L = require("leaflet");
    return {
      pending: L.icon({
        iconUrl: "/assets/images/icon/pendingFacilityIcon.svg",
        iconSize: [30, 30],
        iconAnchor: [20, 40],
      }),
      approved: L.icon({
        iconUrl: "/assets/images/icon/approvedFacilityIcon.svg",
        iconSize: [30, 30],
        iconAnchor: [20, 40],
      }),
    };
  }, [isClient]);

  // Initialise on client only
  useEffect(() => {
    setIsClient(true);

    mapService.getFacilityTypes().then((res) => {
      setFacilityTypes(["All", ...res]);
    });

    const fetchRegionsAndDistricts = async () => {
      try {
        const regionsData = await mapService.getAllRegions();
        const updatedRegionsData = {};
        for (const region in regionsData) {
          updatedRegionsData[region] = ["All", ...regionsData[region]];
        }
        setRegionMap(updatedRegionsData);

        const regions = ["All", ...Object.keys(regionsData).sort()];
        setRegionList(regions);

        if (regions.includes("Greater Accra")) {
          setSelectedRegion("Greater Accra");
          setDistrictList(updatedRegionsData["Greater Accra"] || []);
          setSelectedDistrict("All");
        } else if (regions.length > 0) {
          setSelectedRegion(regions[0]);
          setDistrictList(updatedRegionsData[regions[0]] || []);
          setSelectedDistrict(updatedRegionsData[regions[0]]?.[0] || "");
        }
      } catch (error) {
        console.error("Error fetching regions:", error);
      }
    };

    fetchRegionsAndDistricts();
  }, []);

  // Update districts when region changes
  useEffect(() => {
    if (selectedRegion && regionMap[selectedRegion]) {
      setDistrictList(regionMap[selectedRegion] || []);
      setSelectedDistrict(regionMap[selectedRegion][0] || "");
    } else {
      setDistrictList([]);
      setSelectedDistrict("");
    }
  }, [selectedRegion, regionMap]);

  // Fetch map markers whenever filters change (client-side only)
  useEffect(() => {
    if (!isClient) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await mapService.getMapMarkerDetails({
          region: selectedRegion === "All" ? null : selectedRegion,
          district: selectedDistrict === "All" ? null : selectedDistrict,
          isApproved: selectedStatus === "All" ? null : selectedStatus,
          facilityType:
            selectedFacilityType === "All" ? null : selectedFacilityType,
        });
        setData(res);
      } catch (error) {
        console.error("Error fetching map data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRegion, selectedDistrict, selectedFacilityType, selectedStatus, isClient]);

  const handleRegionChange = (regionName) => setSelectedRegion(regionName);
  const handleDistrictChange = (districtName) => setSelectedDistrict(districtName);
  const handleFacilityTypeChange = (facilityType) => setSelectedFacilityType(facilityType);
  const handleStatusChange = (status) => setSelectedStatus(status);

  // Show a plain placeholder until hydration is complete
  if (!isClient) {
    return (
      <div className="w-full h-[480px] bg-gray-100 dark:bg-slate-700 flex items-center justify-center rounded">
        <span className="text-gray-500 dark:text-slate-300">Loading map…</span>
      </div>
    );
  }

  return (
    <>
      {/* Filters */}
      <div className="flex lg:justify-between max-lg:flex-col max-lg:space-y-2 w-full mb-4">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 grid-cols-2">
          <Dropdown
            label={
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} />
                {selectedRegion || "Region"}
                <Icons className={"text-2xl"} icon={"ri:arrow-drop-down-line"} />
              </>
            }
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col left-0 h-96 overflow-scroll custom-scrollbar"
            items={regionList.map((region) => ({
              label: region,
              onClick: () => handleRegionChange(region),
            }))}
            onSelect={handleRegionChange}
          />
          <Dropdown
            label={
              <>
                <Icons icon={"carbon:cics-region"} className={"mr-2"} />
                {selectedDistrict || "District"}
                <Icons className={"text-2xl"} icon={"ri:arrow-drop-down-line"} />
              </>
            }
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col left-0 h-96 overflow-scroll custom-scrollbar"
            items={districtList.map((district) => ({
              label: district,
              onClick: () => handleDistrictChange(district),
            }))}
            onSelect={handleDistrictChange}
          />
          <Dropdown
            label={
              <>
                <Icons icon={"heroicons-outline:user"} className={"mr-2"} />
                {selectedFacilityType || "Facility Type"}
                <Icons className={"text-2xl"} icon={"ri:arrow-drop-down-line"} />
              </>
            }
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col right-0"
            items={facilityTypes.map((item) => ({
              label: item,
              onClick: () => handleFacilityTypeChange(item),
            }))}
            onSelect={handleFacilityTypeChange}
          />
          <Dropdown
            label={
              <>
                {selectedStatus || "Status"}
                <Icons className={"text-2xl"} icon={"ri:arrow-drop-down-line"} />
              </>
            }
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col right-0"
            items={facilityStatusOptions.map((item) => ({
              label: item.label,
              onClick: () => handleStatusChange(item.value),
            }))}
            onSelect={handleStatusChange}
          />
        </div>

        <div className="flex items-center">
          <Swicth
            value={showBusinessPins}
            onChange={() => setShowBusinessPins(!showBusinessPins)}
            label="Business Pins"
            activeClass="bg-green-500"
            labelClass="-ml-2 mr-2 sm:text-sm text-xs text-gray-500"
          />
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center items-center mb-4" style={{ zIndex: 1000 }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#56ce84]" />
          <span className="ml-2 text-sm text-gray-600">Loading facilities…</span>
        </div>
      )}

      {/* Map */}
      <div className="w-full h-[520px]" style={{ zIndex: 0 }}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {showBusinessPins &&
            icons &&
            data?.map((item) => (
              <Marker
                key={item.id}
                position={[item.latitude, item.longitude]}
                icon={item.status === "pending" ? icons.pending : icons.approved}
                eventHandlers={{
                  click: (e) => {
                    e.target._map.setView(e.latlng, 14);
                  },
                }}
              >
                <Popup offset={[-5, -30]}>
                  <div className="flex gap-2 flex-col flex-grow">
                    <div>
                      <strong>Facility Name:</strong> {item.facility_name}
                    </div>
                    {item.gps_address && (
                      <div>
                        <strong>GPS Address:</strong> {item.gps_address}
                      </div>
                    )}
                    <div>
                      <strong>Type:</strong> {item.facility_type}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        className={
                          item.status === "active"
                            ? "text-green-500"
                            : item.status === "pending"
                            ? "text-orange-500"
                            : item.status === "rejected"
                            ? "text-red-500"
                            : "text-gray-500"
                        }
                      >
                        <span className="capitalize">{item.status}</span>
                      </span>
                    </div>
                    <div>
                      <strong>Admin:</strong> {item.creator?.first_name}{" "}
                      {item.creator?.last_name}
                    </div>
                    <div>
                      <strong>Registered at:</strong>{" "}
                      {new Date(item.created_at).toDateString()}
                    </div>
                    {item.status === "active" && item.approved_at && (
                      <div>
                        <strong>Approved at:</strong>{" "}
                        {new Date(item.approved_at).toDateString()}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>

      <div className="mt-2 text-sm text-gray-600">
        {data && `${data.length} facilities found`}
      </div>
    </>
  );
};

export default BasicMapRender;
