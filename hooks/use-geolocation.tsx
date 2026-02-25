import { useState } from "react";
import { toast } from "sonner";

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const getLocationCoordinates = (isRetry = false) => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLoading(false);
        setRetryCount(0); // Reset on success
      },
      (err) => {
        // iOS Fix: If high accuracy fails or is unavailable, try one more time with accuracy false
        if (!isRetry && retryCount < 1) {
          setRetryCount((prev) => prev + 1);
          setTimeout(() => getLocationCoordinates(true), 1000);
          return;
        }

        setLoading(false);
        const msg =
          err.code === 1
            ? "Permission Denied. Please check Safari site settings."
            : err.message;
        setError(msg);
        toast.error("Location Error: " + msg);
      },
      {
        // Senior Tip: On some iPhones, enableHighAccuracy: true causes a 'User Denied' error
        // if the GPS chip takes too long to wake up. Setting it to false for retries helps.
        enableHighAccuracy: !isRetry,
        timeout: 10000,
        maximumAge: 30000, // Use a cached location if it's less than 30 seconds old
      },
    );
  };

  return { getLocationCoordinates, error, loading, coordinates };
};
