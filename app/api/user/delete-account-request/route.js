import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, reason } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and Email are required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("delete_account_requests")
      .insert([
        {
          user_id: userId,
          email: email,
          reason: reason || "",
          status: "pending",
        },
      ]);

    if (error) {
      console.error("Error inserting delete account request:", error);
      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
