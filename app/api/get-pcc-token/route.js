import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request) {
  try {
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing client credentials");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const encodedCredentials = Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64");

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

    return NextResponse.json({
      success: true,
      message: "Token fetched successfully",
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error fetching token:",
      error.response?.data || error.message
    );

    return NextResponse.json(
      {
        error: "Error fetching token",
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
