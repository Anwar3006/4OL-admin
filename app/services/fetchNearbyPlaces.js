/**
 * Fetch nearby places through server-side API
 * @param {Object} params - Search parameters
 * @param {number} params.latitude - Latitude coordinate
 * @param {number} params.longitude - Longitude coordinate
 * @param {string} params.filter - Filter category
 * @param {string} params.searchQuery - Optional search query
 * @returns {Promise<Array>} - Array of place results
 */
export const fetchNearbyPlaces = async ({
  latitude,
  longitude,
  filter = "All",
  searchQuery = "",
}) => {
  try {
    const response = await fetch("/api/places", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude,
        longitude,
        filter,
        searchQuery,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch places");
    }

    const data = await response.json();
    return data.places;
  } catch (error) {
    console.error("Error fetching places:", error);
    throw error;
  }
};
