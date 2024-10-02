    export default async function handler(req, res) { 
        const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
    
        // Function to fetch nearby places
        const fetchNearbyPlaces = async (
        latitude,
        longitude,
        filter = "Pharmacy"
        ) => {
        let type = "hospital"; // Default filter
        if (filter === "Herbal") type = "health";
        if (filter === "Labs") type = "laboratory";
        if (filter === "Ambulance") type = "ambulance";
        if (filter === "Pharmacy") type = "pharmacy";
        if (filter === "Wholesale") type = "store";
    
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=${type}&key=${API_KEY}`;
        ;
    
        try {
            const response = await fetch(url);
            if (!response.ok) {
            throw new Error("Failed to fetch places");
            }
            const data = await response.json();
            console.log("Regions:", data.results);
            return data.results;
        } catch (error) {
            console.error("Network request failed:", error);
            throw new Error(error.message);
        }
        };
    
        // Validate the request method
        if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
        }
    
        try {
        const { latitude, longitude, filter } = req.body;
    
        // Fetch nearby places based on the input data
        const places = await fetchNearbyPlaces(
            latitude,
            longitude,
            filter || "Pharmacy"
        );
    
        // Respond with the fetched places
        res.status(200).json({ places });
        } catch (error) {
        res.status(500).json({ error: "Failed to fetch data" });
        }
    }
    