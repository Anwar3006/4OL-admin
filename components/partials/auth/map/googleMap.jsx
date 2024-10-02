import React, { useState, useEffect } from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Dropdown from "@/components/ui/Dropdown";
import Icons from "@/components/ui/Icon";
import Swicth from "@/components/ui/Switch";
import { useForm } from "react-hook-form";
import { districts_regions } from "@/constant/district_data";

const mapContainerStyle = {
  width: "100%",
  height: "500px",
};

const defaultCenter = { lat: 7.9465, lng: -1.0232 }; // Ghana's approximate center
const facilityTypes = [
  { label: "Hospitals/ Clinics", value: "ads-display-order" },
  { label: "Herbal Hospitals", value: "advertisement" },
  { label: "Diagnostic Labs", value: "news" },
  { label: "Pharmacies", value: "health" },
  { label: "Wholesalers", value: "events" },
  { label: "Ambulance", value: "auto-slide-delay" },
  { label: "Homes", value: "auto-slide-delay" },
];

const MyGoogleMap = () => {
  const { register, handleSubmit } = useForm();
  const [regions] = useState(districts_regions.data);
  const [allDistricts, setAllDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedFacilityType, setSelectedFacilityType] = useState("");
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [showBusinessPins, setShowBusinessPins] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

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
      // setFilteredDistricts(region.districts); // Show only districts of selected region
      // setSelectedRegion(regionName);
      setFilteredDistricts(allDistricts); // Show all districts if no region selected
      setSelectedRegion(regionName);
    } else {
      setFilteredDistricts(allDistricts); // Show all districts if no region selected
      setSelectedRegion("");
    }
  };

  // Update map when a district is selected
  const handleDistrictChange = (districtName) => {
    const district = filteredDistricts.find((d) => d.name === districtName);
    if (district) {
      setMapCenter(district.location);
      setSelectedDistrict(districtName);
    }
  };

  // Handle facility type selection
  const handleFacilityTypeChange = (facilityType) => {
    setSelectedFacilityType(facilityType);
  };

  // Handle facility search
  useEffect(() => {
    const fetchFacilities = async () => {
      if (selectedRegion || selectedDistrict || selectedFacilityType) {
        // Simulating filtered facilities with dummy data
        setFilteredFacilities([
          {
            id: "1",
            name: "Sample Facility",
            location: { lat: 7.9465, lng: -1.0232 },
          },
        ]);
      }
    };
    fetchFacilities();
  }, [selectedRegion, selectedDistrict, selectedFacilityType]);

  return (
    <>
      <LoadScript googleMapsApiKey={apiKey}>
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
                  {selectedRegion || "Region"}
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
                  {selectedDistrict || "District"}
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
            />
          </div>
        </div>

        <div className="w-full sm:mt-5 mt-2">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={8}
          >
            {/* Render markers based on filtered facilities */}
            {filteredFacilities.map((facility) => (
              <Marker key={facility.id} position={facility.location} />
            ))}
          </GoogleMap>
        </div>
      </LoadScript>
    </>
  );
};

export default MyGoogleMap;
