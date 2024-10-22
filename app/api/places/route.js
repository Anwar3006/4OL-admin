// Backend API Route (e.g., /api/places)

export async function POST(req, res) {
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const data = await req.json();

  const fetchNearbyPlaces = async (
    latitude,
    longitude,
    filter = "All",
    searchQuery = ""
  ) => {
    let type = ""; // Default filter
    if (filter !== "All") {
      if (filter === "Herbal") type = "health";
      if (filter === "Labs") type = "laboratory";
      if (filter === "Ambulance") type = "ambulance";
      if (filter === "Pharmacy") type = "pharmacy";
      if (filter === "Wholesale") type = "store";
      if (filter === "Hospital") type = "hospital";
    }

    let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=50000&type=${type}&key=${API_KEY}`;
    if (searchQuery) {
      url += `&keyword=${searchQuery}`;
    }

    try {
      const response = await fetch(url);
      console.log(response)
      if (!response.ok) {
        throw new Error("Failed to fetch places");
      }
      const data = await response.json();
      return data.results;
    } catch (error) {
      console.error("Network request failed:", error);
      throw new Error(error.message);
    }
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
