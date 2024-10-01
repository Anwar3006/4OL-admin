import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import axios from 'axios';
const mapContainerStyle = {
  width: '100%',
  height: '500px',
};
const defaultCenter = { lat: 7.9465, lng: -1.0232 };  // Ghana's approximate center
const facilityTypes = [
  { label: "All", value: "" },
  { label: "Hospital", value: "hospital" },
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Lab", value: "laboratory" },
  { label: "Clinic", value: "clinic" },
];
const TestMap = () => {
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedFacilityType, setSelectedFacilityType] = useState('');
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const apiKey = 'AIzaSyB2P5-vu0IOv5-XYa1N_Fvqo1RNyhGaoJM'; // Replace with your Google API Key
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
    setSelectedDistrict(e.target.value);
  };
  // Handle facility type selection
  const handleFacilityTypeChange = (e) => {
    setSelectedFacilityType(e.target.value);
  };
  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <div>
        {/* Region Selector */}
        <div>
          <label>Region: </label>
          <select onChange={handleRegionChange} value={selectedRegion}>
            <option value="">Select Region</option>
            {regions.map((region) => (
              <option key={region.place_id} value={region.place_id}>
                {region.name}
              </option>
            ))}
          </select>
        </div>
        {/* District Selector */}
        <div>
          <label>District: </label>
          <select onChange={handleDistrictChange} value={selectedDistrict} disabled={!selectedRegion}>
            <option value="">Select District</option>
            {districts.map((district, index) => (
              <option key={index} value={district}>
                {district}
              </option>
            ))}
          </select>
        </div>
        {/* Facility Type Selector */}
        <div>
          <label>Facility Type: </label>
          <select onChange={handleFacilityTypeChange} value={selectedFacilityType}>
            {facilityTypes.map((facilityType) => (
              <option key={facilityType.value} value={facilityType.value}>
                {facilityType.label}
              </option>
            ))}
          </select>
        </div>
        {/* Google Map */}
        <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={8}>
          {/* Render markers based on filtered facilities */}
          {filteredFacilities.map((facility) => (
            <Marker key={facility.id} position={facility.location} />
          ))}
        </GoogleMap>
      </div>
    </LoadScript>
  );
};
export default TestMap