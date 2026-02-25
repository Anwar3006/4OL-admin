// hooks/useGhanaPostGPS.js
import { useState } from "react";

export type AddressData = {
  data: {
    Table: [
      {
        GPSName: string;
        Region: string;
        District: string;
        PostCode: string;
        NLat: number;
        SLat: number;
        WLong: number;
        Elong: number;
        Area: string;
        Street: string;
      }
    ];
  };
  found: boolean;
};
export default function useGhanaPostGPS() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addressData, setAddressData] = useState<AddressData | null>(null);

  const fetchGhanaPostAddress = async (
    latitude: number,
    longitude: number
  ): Promise<AddressData | null> => {
    setLoading(true);
    setError(null);

    try {
      // Create FormData object (the API expects form data, not JSON)
      const formData = new FormData();
      formData.append("lat", latitude.toString());
      formData.append("long", longitude.toString());

      // Make the request to the Ghana Post GPS API
      const response = await fetch(
        "https://ghanapostgps.sperixlabs.org/get-address",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Check if the API returned an error
      if (data.error) {
        throw new Error(data.error);
      }

      setAddressData(data);
      return data;
    } catch (err: any) {
      setError(err.message || "Failed to fetch Ghana Post GPS data");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchGhanaPostAddress, addressData, loading, error };
}
