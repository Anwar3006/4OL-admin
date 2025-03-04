// hooks/useGeolocation.js
import { useState, useEffect } from "react";

export default function useGeolocation(options = {}) {
  const [location, setLocation] = useState({
    loaded: false,
    coordinates: { lat: null, lng: null },
    error: null,
  });

  function onSuccess(position) {
    setLocation({
      loaded: true,
      coordinates: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      accuracy: position.coords.accuracy, // Adding accuracy information
      error: null,
    });
  }

  function onError(error) {
    setLocation({
      loaded: true,
      coordinates: { lat: null, lng: null },
      error,
    });
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({
        loaded: true,
        coordinates: { lat: null, lng: null },
        error: { code: 0, message: "Geolocation not supported" },
      });
      return;
    }

    // High accuracy enabled here
    const geoOptions = {
      enableHighAccuracy: true, // This is the key setting
      timeout: 5000, // 5 seconds timeout
      maximumAge: 0, // Don't use cached position
      ...options, // Merge with any custom options passed to the hook
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, geoOptions);
  }, [options]);

  return location;
}
