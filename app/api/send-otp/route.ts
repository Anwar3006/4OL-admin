import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@/lib/sms";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();

    console.log("Sending verification code to:", phoneNumber);

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 },
      );
    }

    // Send verification code via AWS SNS/End User Messaging SMS
    const result = await sendVerificationCode(phoneNumber);

    if (!result.success) {
      console.error("Verification code send error:", result.error);
      return NextResponse.json(
        { error: result.error || "Failed to send verification code" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
      status: result.status,
    });
  } catch (error) {
    console.error("Send verification code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


