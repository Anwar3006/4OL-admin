import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId } = await request.json();

    // Access the service key safely on the server
    const serviceKey = process.env.SERVICE_KEY;

    if (!serviceKey) {
      console.error("Service key is undefined");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    console.log("User ID:", userId);
    console.log("serviceKey:", serviceKey);

    // Call the edge function directly with fetch
    const response = await fetch(
      "https://bqdohqgwdqrpmzffmsva.supabase.co/functions/v1/delete-user-function",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ user_id: userId }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error invoking delete-user-function:", data);
      return NextResponse.json(
        { error: data.error || "Failed to delete user" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
