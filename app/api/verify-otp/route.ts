import { NextRequest, NextResponse } from "next/server";
import { checkVerificationCode } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, otp } = await req.json();

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP are required" },
        { status: 400 }
      );
    }

    // Verify code using Twilio Verify API
    const result = await checkVerificationCode(phoneNumber, otp);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Invalid verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
      phoneNumber,
      status: result.status,
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
