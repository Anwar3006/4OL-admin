export async function POST(req) {
  // This is correct - server components can access non-public env vars
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    console.error("API_KEY environment variable is not set");
    return new Response("Server configuration error", { status: 500 });
  }

  const data = await req.json();

  const fetchNearbyPlaces = async (
    latitude,
    longitude,
    filter = "All",
    searchQuery = ""
  ) => {
    let keyword = "";

    // Define keywords for filtering
    if (filter === "All") {
      keyword =
        "hospital|herbal|pharmacy|ambulance|wholesale|labs|herbal medicine|natural health|herbal clinic|laboratory|medical test|diagnostics|ambulance service|emergency transport|medicine store|drugstore|medical supplies|wholesale pharmacy|clinic|medical center";
    } else if (filter === "Herbal") {
      keyword = "herbal medicine|natural health|herbal clinic";
    } else if (filter === "Labs") {
      keyword = "laboratory|medical test|diagnostics";
    } else if (filter === "Ambulance") {
      keyword = "ambulance service|emergency transport";
    } else if (filter === "Pharmacy") {
      keyword = "pharmacy|medicine store|drugstore";
    } else if (filter === "Wholesale") {
      keyword = "medical supplies|wholesale pharmacy";
    } else if (filter === "Hospital") {
      keyword = "hospital|clinic|medical center";
    }

    console.log("Filter:", filter, "Keyword:", keyword);

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50000&key=${API_KEY}`;
    if (keyword) url += `&type=${keyword}`;
    if (searchQuery) url += `&keyword=${encodeURIComponent(searchQuery)}`;

    let nextPageToken = "";
    let allPlaces = [];

    do {
      const pageUrl = nextPageToken ? `${url}&pagetoken=${nextPageToken}` : url;
      try {
        const response = await fetch(pageUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch places");
        }

        const data = await response.json();

        if (data.results) {
          allPlaces.push(...data.results);
        }

        nextPageToken = data.next_page_token || "";
        if (nextPageToken) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Prevents API rate limits
        }
      } catch (error) {
        console.error("Network request failed:", error);
        throw new Error(error.message);
      }
    } while (nextPageToken);

    return allPlaces;
  };

  try {
    const { latitude, longitude, filter, searchQuery } = data;
    const places = await fetchNearbyPlaces(
      latitude,
      longitude,
      filter,
      searchQuery
    );
    return new Response(JSON.stringify({ places }));
  } catch (error) {
    console.error("Error fetching places:", error);
    return new Response(error.message, { status: 500 });
  }
}
