import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import Dropdown from "@/components/ui/Dropdown";
import Icons from "@/components/ui/Icon";
import Swicth from "@/components/ui/Switch";
import { useForm } from "react-hook-form";
import { districts_regions } from "@/constant/district_data";
import L from "leaflet"; // Import Leaflet
import axios from "axios";

// Leaflet's default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/images/marker-icon-2x.png",
  iconUrl: "/leaflet/images/marker-icon.png",
  shadowUrl: "/leaflet/images/marker-shadow.png",
});

const customIcon = L.icon({
  iconUrl: "/assets/images/icon/map_marker.svg", // Custom Icon URL
  iconSize: [30, 30], // Size of the icon
  iconAnchor: [20, 40], // Anchor point of the icon (center bottom)
});

const defaultCenter = [9.367277099999999, -0.1494988]; // Ghana's approximate center
const facilityTypes = [
  { label: "Hospital", value: "Hospital" },
  { label: "Herbal", value: "Herbal" },
  { label: "Labs", value: "Labs" },
  { label: "Ambulance", value: "Ambulance" },
  { label: "Pharmacies", value: "health" },
  { label: "Pharmacy", value: "Pharmacy" },
  { label: "Wholesale", value: "Wholesale" },
];

const MyGoogleMap = () => {
  const { register, handleSubmit } = useForm();
  const [regions] = useState(districts_regions.data);
  const [allDistricts, setAllDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedFacilityType, setSelectedFacilityType] = useState("Hospital");
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [showBusinessPins, setShowBusinessPins] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // Track if component is mounted
  const [searchInput, setSearchInput] = useState("");


  useEffect(() => {
    setIsMounted(true); // Set mounted to true when component mounts
  }, []);

  // Collect all districts on component mount
  useEffect(() => {
    const allDistrictsList = regions.flatMap((region) => region.districts);
    setAllDistricts(allDistrictsList);
    setFilteredDistricts(allDistrictsList); // Initially show all districts
  }, [regions]);

  // Update districts when a region is selected
  const handleRegionChange = (regionName) => {
    const region = regions.find((r) => r.name === regionName);
    if (region) {
      setFilteredDistricts(region.districts); // Show filtered districts
      setSelectedRegion(region);
      setMapCenter(region.location);
    } else {
      setFilteredDistricts(allDistricts); // Show all districts if no region selected
      setSelectedRegion("");
      setMapCenter(defaultCenter);
    }
  };

  // Update map when a district is selected
  const handleDistrictChange = (districtName) => {
    const district = filteredDistricts.find((d) => d.name === districtName);
    if (district) {
      setMapCenter(district.location);
      setSelectedDistrict(district);
    }
  };

  // Handle facility type selection
  const handleFacilityTypeChange = (facilityType) => {
    console.log('d', facilityType);
    
    setSelectedFacilityType(facilityType);
  };

  const handleSearchChange = async (event) => {
    const value = event.target.value;
    setSearchInput(value);
  };

  // Handle facility search
  useEffect(() => {
    const fetchFacilities = async () => {
      if (selectedRegion || selectedDistrict || selectedFacilityType) {
        // Simulating filtered facilities with dummy data
        const requestData = {
          latitude: selectedDistrict
            ? selectedDistrict?.location?.lat
            : selectedRegion?.location?.lat || defaultCenter[0],
          longitude: selectedDistrict
            ? selectedDistrict?.location?.lng
            : selectedRegion?.location?.lng || defaultCenter[0],
          filter: selectedFacilityType || "Pharmacy",
        };

        const { data } = await axios.post("/api/places", {
          ...requestData,
        });
        console.log(data)
        setFilteredFacilities(data?.places);
      }
    };
    fetchFacilities();
  }, [selectedRegion, selectedDistrict, selectedFacilityType]);

  if (!isMounted) return null; // Prevent rendering until mounted

  return (
    <>
      <div className="flex lg:justify-between max-lg:flex-col max-lg:space-y-2 w-full">
        {/* Region Selector */}
        <div className="flex">
          <Dropdown
            label={
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} />
                Region
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass=""
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex left-0"
            items={[
              { onClick: () => handleRegionChange("") },
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
                District
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass="ml-2"
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex left-0 h-72 overflow-scroll custom-scrollbar"
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
                Facility Type
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
            }
            wrapperClass="ml-2"
            labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
            classMenuItems="mt-2 w-[180px] flex right-0"
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
          <input
            type="search"
            placeholder="Search"
            className="border border-green-500 outline-green-500 caret-green-500 rounded-md px-2 py-1 ml-2"
            value={searchInput}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      <div className="w-full sm:mt-5 mt-2">
        <MapContainer
          center={mapCenter}
          zoom={8}
          style={{ height: "500px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {/* Displaying markers for filtered facilities */}
          {showBusinessPins && 
          filteredFacilities.map((facility) => (
            <Marker
              key={facility?.place_id}
              position={facility?.geometry?.location}
              icon={customIcon}
            >
              {/* <Popup>{facility.name}</Popup> */}
            </Marker>
          ))}
        </MapContainer>
      </div>
    </>
  );
};

export default MyGoogleMap;
