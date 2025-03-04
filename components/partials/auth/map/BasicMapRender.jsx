"use client";
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import * as mapService from "@/app/services/map_service";
import Dropdown from "@/components/ui/Dropdown";
import Icons from "@/components/ui/Icon";
import Swicth from "@/components/ui/Switch";
import L from "leaflet";

const pendingFacilityIcon = L.icon({
  iconUrl: "/assets/images/icon/pendingFacilityIcon.svg",
  iconSize: [30, 30],
  iconAnchor: [20, 40],
});

const approvedFacilityIcon = L.icon({
  iconUrl: "/assets/images/icon/approvedFacilityIcon.svg",
  iconSize: [30, 30],
  iconAnchor: [20, 40],
});

// Facility status options
const facilityStatusOptions = [
  { label: "All", value: "All" },
  { label: "Approved", value: "Approved" },
  { label: "Pending", value: "Pending" },
];

const BasicMapRender = () => {
  // Client-side rendering check
  const [isClient, setIsClient] = useState(false);

  // Map data
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Regions and districts from database
  const [regionMap, setRegionMap] = useState({});
  const [regionList, setRegionList] = useState([]);

  // Filter states
  const [selectedRegion, setSelectedRegion] = useState("Greater Accra");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedFacilityType, setSelectedFacilityType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(""); // Default to Approved
  const [showBusinessPins, setShowBusinessPins] = useState(true);
  const [facilityTypes, setFacilityTypes] = useState([]);

  // Available districts for selected region
  const [districtList, setDistrictList] = useState([]);

  // Set default position to Ghana's center
  const [mapCenter, setMapCenter] = useState([7.9465, -1.0232]);
  const [mapZoom, setMapZoom] = useState(7);

  // Load region and district data
  useEffect(() => {
    mapService.getFacilityTypes().then((res) => {
      setFacilityTypes(["All", ...res]);
    });
    const fetchRegionsAndDistricts = async () => {
      try {
        const regionsData = await mapService.getAllRegions();
        setRegionMap(regionsData);

        // Create a list of region names for dropdown and add "All" option
        const regions = ["All", ...Object.keys(regionsData).sort()];
        setRegionList(regions);

        // Add "All" option to each region's district list
        const updatedRegionsData = {};
        for (const region in regionsData) {
          updatedRegionsData[region] = ["All", ...regionsData[region]];
        }
        setRegionMap(updatedRegionsData);

        // Set Greater Accra as default if available
        if (regions.includes("Greater Accra")) {
          setSelectedRegion("Greater Accra");
          setDistrictList(updatedRegionsData["Greater Accra"] || []);
          if (updatedRegionsData["Greater Accra"]?.length > 0) {
            setSelectedDistrict("All");
          }
        } else if (regions.length > 0) {
          // Otherwise use the first region
          setSelectedRegion(regions[0]);
          setDistrictList(updatedRegionsData[regions[0]] || []);
          if (updatedRegionsData[regions[0]]?.length > 0) {
            setSelectedDistrict("All");
          }
        }
      } catch (error) {
        console.error("Error fetching regions:", error);
      }
    };

    setIsClient(true);
    fetchRegionsAndDistricts();
  }, []);

  // Update districts when region changes
  useEffect(() => {
    if (selectedRegion && regionMap[selectedRegion]) {
      setDistrictList(regionMap[selectedRegion] || []);
      // Set first district of the region as selected
      if (regionMap[selectedRegion]?.length > 0) {
        setSelectedDistrict(regionMap[selectedRegion][0]);
      } else {
        setSelectedDistrict("");
      }
    } else {
      setDistrictList([]);
      setSelectedDistrict("");
    }
  }, [selectedRegion, regionMap]);

  // Load map data with filters
  useEffect(() => {
    console.log(
      JSON.stringify(
        {
          selectedRegion,
          selectedDistrict,
          selectedFacilityType,
          selectedStatus,
          isClient,
        },
        null,
        2
      )
    );
    const fetchData = async () => {
      setLoading(true);
      try {
        await mapService
          .getMapMarkerDetails({
            region: selectedRegion === "All" ? null : selectedRegion,
            district: selectedDistrict === "All" ? null : selectedDistrict,
            isApproved: selectedStatus === "All" ? null : selectedStatus,
            facilityType:
              selectedFacilityType === "All" ? null : selectedFacilityType,
          })
          .then((res) => {
            setData(res);
          });

        // Adjust map center and zoom if results are available
        // if (result.length > 0) {
        //   // Calculate average lat/lng if multiple points
        //   const avgLat =
        //     result.reduce((sum, item) => sum + parseFloat(item.latitude), 0) /
        //     result.length;
        //   const avgLng =
        //     result.reduce((sum, item) => sum + parseFloat(item.longitude), 0) /
        //     result.length;
        //   setMapCenter([avgLat, avgLng]);
        //   setMapZoom(result.length === 1 ? 14 : 10);
        // }
      } catch (error) {
        console.error("Error fetching map data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isClient) {
    }
    fetchData();
    console.log("Is client:", isClient);
    // console.log("DATA:", JSON.stringify(data, null, 2));
  }, [
    selectedRegion,
    selectedDistrict,
    selectedFacilityType,
    selectedStatus,
    isClient,
  ]);

  // Handle region change
  const handleRegionChange = (regionName) => {
    setSelectedRegion(regionName);
  };

  // Handle district change
  const handleDistrictChange = (districtName) => {
    setSelectedDistrict(districtName);
  };

  // Handle facility type change
  const handleFacilityTypeChange = (facilityType) => {
    setSelectedFacilityType(facilityType);
  };

  // Handle status change
  const handleStatusChange = (status) => {
    setSelectedStatus(status);
  };

  // Don't render on server side
  if (!isClient) {
    return (
      <div className="w-full h-[480px] bg-gray-100 flex items-center justify-center">
        <span>Loading map...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex lg:justify-between max-lg:flex-col max-lg:space-y-2 w-full mb-4">
        {/* Region, District, Facility Type Filters */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 grid-cols-2">
          <Dropdown
            label={
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} />
                {selectedRegion || "Region"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col left-0 h-96 overflow-scroll custom-scrollbar"
            items={regionList.map((region) => ({
              label: region,
              onClick: () => handleRegionChange(region),
            }))}
            selectedItem={
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} />
                {selectedRegion || "Region"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            onSelect={handleRegionChange}
          />
          <Dropdown
            label={
              <>
                <Icons icon={"carbon:cics-region"} className={"mr-2"} />
                {selectedDistrict || "District"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col left-0 h-96 overflow-scroll custom-scrollbar"
            items={districtList.map((district) => ({
              label: district,
              onClick: () => handleDistrictChange(district),
            }))}
            selectedItem={
              <>
                <Icons icon={"carbon:cics-region"} className={"mr-2"} />
                {selectedDistrict || "District"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            onSelect={handleDistrictChange}
          />

          <Dropdown
            label={
              <>
                <Icons icon={"heroicons-outline:user"} className={"mr-2"} />
                {selectedFacilityType || "Facility Type"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass=""
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col right-0"
            items={facilityTypes.map((item) => ({
              label: item,
              onClick: () => handleFacilityTypeChange(item),
            }))}
            selectedItem={
              <>
                <Icons icon={"heroicons-outline:user"} className={"mr-2"} />
                {selectedFacilityType || "Facility Type"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            onSelect={handleFacilityTypeChange}
          />

          <Dropdown
            label={
              <>
                {selectedStatus || "Status"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass=""
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col right-0"
            items={facilityStatusOptions.map((item) => ({
              label: item.label,
              onClick: () => handleStatusChange(item.value),
            }))}
            selectedItem={
              <>
                {selectedStatus || "Status"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
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
        <div
          className="flex justify-center items-center mb-4"
          style={{ zIndex: 1000 }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#56ce84]" />
          <span className="ml-2 text-sm text-gray-600">
            Loading facilities...
          </span>
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
            data &&
            data.map((item) => (
              <Marker
                eventHandlers={{
                  click: (e) => {
                    e.target._map.setView(e.latlng, 14);
                  },
                }}
                key={item.id}
                position={[item.latitude, item.longitude]}
                icon={
                  item.status === "Pending"
                    ? pendingFacilityIcon
                    : approvedFacilityIcon
                }
              >
                <Popup offset={[-5, -30]}>
                  <div className="flex gap-2 flex-col flex-grow">
                    <div>
                      <strong>Facility Name:</strong> {item.facility_name}
                    </div>
                    {item.gps_address && (
                      <div>
                        <strong>GPS Address:</strong>{" "}
                        {item.gps_address || "N/A"}
                      </div>
                    )}
                    <div>
                      <strong>Type:</strong> {item.facility_type}
                    </div>
                    <div>
                      <strong>Status:</strong>{" "}
                      <span
                        className={
                          item.status === "Pending"
                            ? "text-orange-500"
                            : "text-green-500"
                        }
                      >
                        {item.status}
                      </span>
                    </div>
                    <div>
                      <strong>Admin:</strong> {item.creator?.first_name}{" "}
                      {item.creator?.last_name}
                    </div>
                    <div>
                      <strong>Registered at:</strong>{" "}
                      {new Date(item.created_at).toDateString()}{" "}
                    </div>
                    {item.status === "Approved" && (
                      <div>
                        <strong>Approved at:</strong>{" "}
                        {new Date(item.approved_at).toDateString()}{" "}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>

      {/* Total count */}
      <div className="mt-2 text-sm text-gray-600">
        {data && `${data.length} facilities found`}
      </div>
    </>
  );
};

export default BasicMapRender;
