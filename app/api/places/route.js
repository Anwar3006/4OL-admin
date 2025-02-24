
export async function POST(req, res) {
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
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
      keyword = "hospital|herbal|pharmacy|ambulance|wholesale|labs|herbal medicine|natural health|herbal clinic|laboratory|medical test|diagnostics|ambulance service|emergency transport|medicine store|drugstore|medical supplies|wholesale pharmacy|clinic|medical center"; 
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
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
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
        console.log("Fetched data:", data);

        if (data.results) {
          allPlaces.push(...data.results);
        }

        nextPageToken = data.next_page_token || "";
        if (nextPageToken) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Prevents API rate limits
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
    const places = await fetchNearbyPlaces(latitude, longitude, filter, searchQuery);
    return new Response(JSON.stringify({ places }));
  } catch (error) {
    console.error("Error fetching places:", error);
    return new Response(error.message, { status: 500 });
  }
}

// export async function POST(req, res) {
//   const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
//   const data = await req.json();
//   // Function to fetch nearby places
//   const fetchNearbyPlaces = async (
//     latitude,
//     longitude,
//     filter = "Pharmacy"
//   ) => {
//     let type = "hospital"; // Default filter
//     if (filter === "Herbal") type = "health";
//     if (filter === "Labs") type = "laboratory";
//     if (filter === "Ambulance") type = "ambulance";
//     if (filter === "Pharmacy") type = "pharmacy";
//     if (filter === "Wholesale") type = "store";
//     if(filter === "Hospital") type = "hospital";

//     const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50000&type=${type}&key=${API_KEY}`;
//     try {
//       const response = await fetch(url);
//       4;
//       if (!response.ok) {
//         throw new Error("Failed to fetch places");
//       }
//       const data = await response.json();
//       return data.results;
//     } catch (error) {
//       console.error("Network request failed:", error);
//       throw new Error(error.message);
//     }
//   };

//   try {
//     const { latitude, longitude, filter } = data;

//     // Fetch nearby places based on the input data
//     const places = await fetchNearbyPlaces(
//       latitude,
//       longitude,
//       filter || "Pharmacy"
//     );

//     // Respond with the fetched places
//     return new Response(JSON.stringify({ places }));
//   } catch (error) {
//     console.error("Error fetching places:", error);
//     return new Response(error?.response?.data || error?.message, {
//       status: 500,
//     });
//   }
// }
