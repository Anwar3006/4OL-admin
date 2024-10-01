import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from 'axios';
import Dropdown from '@/components/ui/Dropdown';
import Icons from '@/components/ui/Icon';
import Swicth from '@/components/ui/Switch';
import Textinput from '@/components/ui/Textinput';
import { useForm } from 'react-hook-form';
const mapContainerStyle = {
  width: '100%',
  height: '500px',
};
const defaultCenter = { lat: 7.9465, lng: -1.0232 };  // Ghana's approximate center
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
    const fetchRegions = async () => {
      try {
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=&types=(regions)&key=${apiKey}&components=country:GH`
        );
        const regionResults = response.data.predictions.map((region) => ({
          name: region.description,
          place_id: region.place_id,
        }));
        setRegions(regionResults);
      } catch (error) {
        console.error("Error fetching regions:", error);
      }
    };
    fetchRegions();
  }, [apiKey]);
  // Fetch districts when a region is selected
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
  // Fetch facilities based on selected region, district, and type
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
  // Handle region selection
  const handleRegionChange = (e) => {
    const selectedRegionPlaceId = e.target.value;
    setSelectedRegion(selectedRegionPlaceId);
    setSelectedDistrict('');  // Reset district selection
  };
  // Handle district selection
  const handleDistrictChange = (e) => {
    const selectedDistrictPlaceId = e.target.value;
    setSelectedDistrict(selectedDistrictPlaceId);
    setSelectedRegion('');  // Reset district selection
  };
  // Handle facility type selection
  const handleFacilityTypeChange = (e) => {
    setSelectedFacilityType(e.target.value);
  };

  return (
    <>
    <LoadScript googleMapsApiKey={apiKey}>
      <div className='flex lg:justify-between max-lg:flex-col max-lg:space-y-2 w-full'>
        {/* Region Selector */}
        <div className='flex'>
          {/* <label>Region: </label> */}
          <Dropdown
            label={selectedRegion ? regions.find(r => r.place_id === selectedRegion)?.name :  <>
                <Icons icon={"oui:vis-map-region"} className={"mr-2"} /> Region{" "}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
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
                <Icons icon={"carbon:cics-region"} className={"mr-2"} />{" "}
                District{" "}
                <Icons
                  className={"text-2xl"}
                  icon={"ri:arrow-drop-down-line"}
                />
              </>
              }
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
          />
        </div>

        <div className="flex items-center max-sm:justify-between max-sm:w-full">
          {/* <Icons icon={'bi:search'} className={' text-[#bbbcbb] text-lg'} /> */}
          <Swicth
            value={showBusinessPins}
            onChange={() => setShowBusinessPins(!showBusinessPins)}
            label="Business Pins"
            activeClass="bg-green-500"
            labelClass="-ml-2 mr-2 sm:text-sm text-xs text-gray-500 "
          />
          {/* <Textinput type={"search"} placeholder={"Search"} className="" register={register}/> */}
          <input type='search' placeholder='Search' className='border border-green-500 outline-green-500 caret-green-500 rounded-md px-2 py-1 ml-2' />
        </div>

        {/* <div>
          <label>Region: </label>
          <select onChange={handleRegionChange} value={selectedRegion}>
            <option value="">Select Region</option>
            {regions.map((region) => (
              <option key={region.place_id} value={region.place_id}>
                {region.name}
              </option>
            ))}
          </select>
        </div> */}
        {/* District Selector */}
      
        {/* <div>
          <label>District: </label>
          <select onChange={handleDistrictChange} value={selectedDistrict} disabled={!selectedRegion}>
            <option value="">Select District</option>
            {districts.map((district, index) => (
              <option key={index} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div> */}
        {/* Facility Type Selector */}
        
        {/* <div>
          <label>Facility Type: </label>
          <select onChange={handleFacilityTypeChange} value={selectedFacilityType}>
            {facilityTypes.map((facilityType) => (
              <option key={facilityType.value} value={facilityType.value}>
                {facilityType.label}
              </option>
            ))}
          </select>
        </div> */}
        {/* Google Map */}
      </div>
      <div className="w-full sm:mt-5 mt-2">
      <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={8}>
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