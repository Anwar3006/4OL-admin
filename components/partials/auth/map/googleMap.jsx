"use client";
import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Dropdown from "@/components/ui/Dropdown";
import Icons from "@/components/ui/Icon";
import Swicth from "@/components/ui/Switch";
import { districts_regions } from "@/constant/ghana_regions_districts_coordinates";
import L from "leaflet";
import axios from "axios";

// Leaflet's default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/images/marker-icon-2x.png",
  iconUrl: "/leaflet/images/marker-icon.png",
  shadowUrl: "/leaflet/images/marker-shadow.png",
});

const customIcon = L.icon({
  iconUrl: "/assets/images/icon/map_marker.svg",
  iconSize: [30, 30],
  iconAnchor: [20, 40],
});

const defaultCenter = [5.614818, -0.205874]; // Greater Accra Region
const facilityTypes = [
  { label: "All", value: "" },
  { label: "Hospital", value: "Hospital" },
  { label: "Herbal", value: "Herbal" },
  { label: "Labs", value: "Labs" },
  { label: "Ambulance", value: "Ambulance" },
  { label: "Pharmacy", value: "Pharmacy" },
  { label: "Wholesale", value: "Wholesale" },
];

const MyGoogleMap = () => {
  const [regions] = useState(districts_regions.data);
  const defaultRegion = regions.find((r) => r.name === "Greater Accra");
  const [allDistricts] = useState(regions.flatMap((r) => r.districts));
  const [filteredDistricts, setFilteredDistricts] = useState(
    defaultRegion?.districts || []
  );
  const [selectedRegion, setSelectedRegion] = useState("Greater Accra");
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedFacilityType, setSelectedFacilityType] = useState("All");
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [mapCenter, setMapCenter] = useState(
    defaultRegion?.location || defaultCenter
  );
  const [showBusinessPins, setShowBusinessPins] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // useEffect(() => {
  //   const allDistrictsList = regions.flatMap((region) => region.districts);
  //   setAllDistricts(allDistrictsList);
  //   setFilteredDistricts(allDistrictsList);
  // }, [regions]);

  const handleRegionChange = (regionName) => {
    const region = regions.find((r) => r.name === regionName);
    setSelectedRegion(region || null);
    setFilteredDistricts(region ? region.districts : allDistricts);
    setMapCenter(region?.location || defaultCenter);
    setSelectedDistrict(region ? region.districts[0] : allDistricts);
    setSearchInput("");
    setSelectedFacilityType("Hospital");
    setSuggestions([]);
  };

  const handleDistrictChange = (districtName) => {
    const district = filteredDistricts.find((d) => d.name === districtName);
    setSelectedDistrict(district || null);
    setMapCenter(district?.location || mapCenter);
    setSearchInput("");
    setSuggestions([]);
  };

  const handleFacilityTypeChange = (facilityType) => {
    setSelectedFacilityType(facilityType);
  };

  const handleSearchChange = async (event) => {
    const value = event.target.value;
    setSearchInput(value);

    if (value.length > 1) {
      try {
        const { data } = await axios.post("", {
          searchQuery: value,
          latitude:
            selectedDistrict?.location?.lat ||
            selectedRegion?.location?.lat ||
            defaultCenter[0],
          longitude:
            selectedDistrict?.location?.lng ||
            selectedRegion?.location?.lng ||
            defaultCenter[1],
          facilityType: selectedFacilityType,
        });
        setSuggestions(data.places || []);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    setSelectedSuggestion(suggestion);
    setMapCenter([
      suggestion.geometry.location.lat,
      suggestion.geometry.location.lng,
    ]);
    setSearchInput("");
    setSuggestions([]);
  };

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const { data } = await axios.post("", {
          latitude:
            selectedDistrict?.location?.lat ||
            selectedRegion?.location?.lat ||
            defaultCenter[0],
          longitude:
            selectedDistrict?.location?.lng ||
            selectedRegion?.location?.lng ||
            defaultCenter[1],
          filter: selectedFacilityType, // Ensures facility type is correctly used
        });
        setFilteredFacilities(data?.places || []);
      } catch (error) {
        console.error("Error fetching facilities:", error);
        setFilteredFacilities([]);
      }
    };
    fetchFacilities();
  }, [selectedRegion, selectedDistrict, selectedFacilityType]);

  if (!isMounted) return null;

  return (
    <>
      <div className="flex lg:justify-between max-lg:flex-col max-lg:space-y-2 w-full">
        {/* Region Selector */}
        <div className="flex">
          <Dropdown
            label={
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} />
                {selectedRegion?.name || "Greater Accra"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass=""
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col left-0 h-72 overflow-scroll custom-scrollbar"
            items={[
              // { onClick: () => handleRegionChange("") },
              ...regions.map((region) => ({
                label: region.name,
                onClick: () => handleRegionChange(region.name),
              })),
            ]}
            selectedItem={
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} />
                {selectedRegion?.name || "Region"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            } // Pass selectedRegion to display
            onSelect={handleRegionChange} // Handle region selection
          />

          <Dropdown
            label={
              <>
                <Icons icon={"carbon:cics-region"} className={"mr-2"} />
                {selectedDistrict?.name || "District"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass="ml-2"
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col left-0 h-72 overflow-scroll custom-scrollbar"
            items={filteredDistricts.map((district) => ({
              label: district.name,
              onClick: () => handleDistrictChange(district.name),
            }))}
            selectedItem={
              <>
                <Icons icon={"carbon:cics-region"} className={"mr-2"} />
                {selectedDistrict?.name || "District"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            } // Pass selectedDistrict to display
            onSelect={handleDistrictChange} // Handle district selection
          />

          <Dropdown
            label={
              <>
                <Icons icon={"heroicons-outline:user"} className={"mr-2 "} />
                {selectedFacilityType || "Facility Type"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass="ml-2"
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex flex-col right-0"
            items={facilityTypes.map((item) => ({
              label: item.label,
              onClick: () => handleFacilityTypeChange(item.value),
            }))}
            selectedItem={
              <>
                <Icons icon={"heroicons-outline:user"} className={"mr-2 "} />
                {selectedFacilityType || "Facility Type"}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            } // Pass selectedFacilityType to display
            onSelect={handleFacilityTypeChange} // Handle facility type selection
          />
        </div>

        <div className="flex items-center max-sm:justify-between max-sm:w-full">
          <Swicth
            value={showBusinessPins}
            onChange={() => setShowBusinessPins(!showBusinessPins)}
            label="Business Pins"
            activeClass="bg-green-500"
            labelClass="-ml-2 mr-2 sm:text-sm text-xs text-gray-500 "
          />
          <div className="relative">
            <input
              type="search"
              placeholder="Search for a facility"
              className="border border-green-500 outline-green-500 caret-green-500 rounded-md px-2 py-1 ml-2"
              value={searchInput}
              onChange={handleSearchChange}
            />
            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="border border-gray-300 rounded-md mt-1 absolute z-[9999] bg-white w-full max-h-64 custom-scrollbar overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.place_id}
                    className="p-2 hover:bg-gray-200 cursor-pointer"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    {suggestion.name}
                  </div>
                ))}
              </div>
            )}
            {suggestions.length === 0 && searchInput.length > 2 && (
              <div className="border border-gray-300 rounded-md mt-1 absolute z-[9999] bg-white w-full p-2 text-sm text-gray-500">
                No results found for "{searchInput}"
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full sm:mt-5 mt-2">
        <MapContainer
          center={mapCenter}
          zoom={8}
          scrollWheelZoom={true}
          className="h-[500px] w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {showBusinessPins && filteredFacilities
            ? filteredFacilities.map((facility) => (
                <Marker
                  eventHandlers={{
                    click: (e) => {
                      e.target._map.setView(e.latlng, 14);
                    },
                  }}
                  key={facility.place_id}
                  position={[
                    facility.geometry.location.lat,
                    facility.geometry.location.lng,
                  ]}
                  icon={customIcon}
                >
                  <Popup closeButton={false} offset={[-4, -28]}>
                    <div>
                      <strong>{facility.name}</strong> <br />
                      {facility.vicinity}
                    </div>
                  </Popup>
                </Marker>
              ))
            : selectedSuggestion && (
                <Marker
                  position={[
                    selectedSuggestion.geometry.location.lat,
                    selectedSuggestion.geometry.location.lng,
                  ]}
                  icon={customIcon}
                >
                  <Popup>{selectedSuggestion.name}</Popup>
                </Marker>
              )}
        </MapContainer>
      </div>
    </>
  );
};

export default MyGoogleMap;
