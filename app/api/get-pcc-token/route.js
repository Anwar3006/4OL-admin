import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ message: "Missing client credentials" });
  }

  const encodedCredentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  try {
    const response = await axios.post(
      "https://connect2.pointclickcare.com/auth/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    res.status(200).json({
      message: "Token fetched successfully",
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error fetching token:",
      error.response?.data || error.message
    );

    res.status(500).json({
      message: "Error fetching token",
      error: error.response?.data || error.message,
    });
  }
}
