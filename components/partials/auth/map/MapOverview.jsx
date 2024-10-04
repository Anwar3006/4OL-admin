import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from 'axios';
import Dropdown from '@/components/ui/Dropdown';
import Icons from '@/components/ui/Icon';
import Swicth from '@/components/ui/Switch';
import BasicMapRender from './BasicMapRender';

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};
const defaultCenter = { lat: 7.9465, lng: -1.0232 }; // Ghana's approximate center
const facilityTypes = [
  { label: "Hospitals/ Clinics", value: "hospital" },
  { label: "Herbal Hospitals", value: "health" },
  { label: "Diagnostic Labs", value: "doctor" },
  { label: "Pharmacies", value: "pharmacy" },
  { label: "Wholesalers", value: "store" },
  { label: "Ambulance", value: "car_repair" },
  { label: "Homes", value: "home" },
];

const MapOverview = () => {
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedFacilityType, setSelectedFacilityType] = useState('');
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [showBusinessPins, setShowBusinessPins] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;

// Fetch regions from Google Places API
useEffect(() => {
  const fetchNearbyPlaces = async () => {
    try {
      const response = await fetch("/api/fetch-places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          latitude: 9.367277099999999,
          longitude: -0.1494988,
          filter: "Herbal",
        }),
      });
      const data = await response.json();
      console.log("Regions", data);
      console.log(data);
    } catch (error) {
      console.error("Network request failed:", error);
    }
  };
  fetchNearbyPlaces();
}, []);

  useEffect(() => {
    const fetchDistricts = async () => {
      if (selectedRegion) {
        try {
          const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?place_id=${selectedRegion}&key=${apiKey}`
          );
          const districtResults = response.data.results[0].address_components.filter(component =>
            component.types.includes('administrative_area_level_2')
          );
          setDistricts(districtResults.map(district => district.long_name));
        } catch (error) {
          console.error("Error fetching districts:", error);
        }
      }
    };
    fetchDistricts();
  }, [selectedRegion, apiKey]);

  useEffect(() => {
    const fetchFacilities = async () => {
      if (selectedRegion || selectedDistrict || selectedFacilityType) {
        try {
          const response = await axios.get(
            `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=7.9465,-1.0232&radius=50000&type=${selectedFacilityType}&key=${apiKey}`
          );
          setFilteredFacilities(response.data.results.map(facility => ({
            id: facility.place_id,
            name: facility.name,
            location: {
              lat: facility.geometry.location.lat,
              lng: facility.geometry.location.lng,
            }
          })));
        } catch (error) {
          console.error("Error fetching facilities:", error);
        }
      }
    };
    fetchFacilities();
  }, [selectedRegion, selectedDistrict, selectedFacilityType, apiKey]);

  const handleRegionChange = (e) => {
    const selectedRegionPlaceId = e.target.value;
    setSelectedRegion(selectedRegionPlaceId);
    setSelectedDistrict(''); // Reset district selection
  };

  const handleDistrictChange = (e) => {
    const selectedDistrictPlaceId = e.target.value;
    setSelectedDistrict(selectedDistrictPlaceId);
    setSelectedRegion(''); // Reset region selection
  };

  const handleFacilityTypeChange = (e) => {
    setSelectedFacilityType(e.target.value);
  };

  return (
    <>
      <LoadScript googleMapsApiKey={apiKey}>
        <div className='flex lg:justify-between max-lg:flex-col max-lg:space-y-2 w-full'>
          {/* Region Selector */}
          <div className='flex'>
            <Dropdown
              label={selectedRegion ? regions.find(r => r.place_id === selectedRegion)?.name : 
              <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} /> Region{" "}
                <Icons className={"text-2xl"} icon={"ri:arrow-drop-down-line"} />
              </>}
              wrapperClass=""
              labelClass="flex items-center  px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
              classMenuItems="mt-2 w-[180px] flex left-0"
              items={regions.map((region) => ({
                label: region.name,
                onClick: () => handleRegionChange(region.place_id),
              }))}
            />
            <Dropdown
              label={selectedDistrict ? districts.find(r => r.place_id === selectedDistrict)?.name :  
              <>
                <Icons icon={"carbon:cics-region"} className={"mr-2"} /> District{" "}
                <Icons className={"text-2xl"} icon={"ri:arrow-drop-down-line"} />
              </>}
              wrapperClass="ml-2"
              labelClass="flex items-center  px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
              classMenuItems="mt-2 w-[180px] flex left-0"
              items={districts.map((district) => ({
                label: district.name,
                onClick: () => handleDistrictChange(district.place_id),
              }))}
            />
            <Dropdown
              label={
                <>
                  <Icons icon={"heroicons-outline:user"} className={"mr-2 "} />{" "}
                  Facility Type{" "}
                  <Icons className={"text-2xl"} icon={"ri:arrow-drop-down-line"} />
                </>
              }
              wrapperClass="ml-2"
              labelClass="flex items-center px-2 py-1 border border-[#56ce84] rounded-sm lg:text-sm text-xs text-[#56ce84]"
              classMenuItems="mt-2 w-[180px] flex right-0"
              items={facilityTypes.map((item) => ({
                label: item.label,
                onClick: () => handleFacilityTypeChange(item.value),
              }))}
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
            <input type='search' placeholder='Search' className='border border-green-500 outline-green-500 caret-green-500 rounded-md px-2 py-1 ml-2' />
          </div>
        </div>
        <div className="w-full sm:mt-5 mt-2">
          <BasicMapRender />
          {/* <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={8}>
            {filteredFacilities.map((facility) => (
              <Marker key={facility.id} position={facility.location} />
            ))}
          </GoogleMap> */}
        </div>
      </LoadScript>
    </>
  );
};

export default MapOverview;
