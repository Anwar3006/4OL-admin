import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { userId, phone } = await request.json();

    // Validate inputs
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    console.log("Phone:", phone);
    console.log("User ID:", userId);

    // Get the service key from environment variables
    const serviceKey = process.env.SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      console.error("Missing environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Create a Supabase client with admin privileges

    //const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Update the phone number in user_profiles table
    // const { error: profileError } = await supabaseAdmin
    //   .from("user_profiles")
    //   .update({ phone_number: phone })
    //   .eq("id", userId);

    // if (profileError) {
    //   console.error("Error updating user profile:", profileError);
    //   return NextResponse.json(
    //     { error: `Failed to update profile: ${profileError.message}` },
    //     { status: 500 }
    //   );
    // }

    // Call the edge function to update the phone in auth table
    const response = await fetch(
      `${supabaseUrl}/functions/v1/update-user-phone`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ userId, phone }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Error invoking update-phone function:", data);
      return NextResponse.json(
        { error: data.error || "Failed to update phone in auth" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Phone number updated successfully",
      data,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 }
    );
  }
}
