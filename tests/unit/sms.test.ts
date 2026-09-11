import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createVerification, checkVerification } = vi.hoisted(() => ({
  createVerification: vi.fn(),
  checkVerification: vi.fn(),
}));

vi.mock("@/lib/twilio", () => ({
  getTwilioClient: () => ({
    verify: {
      v2: {
        services: () => ({
          verifications: { create: createVerification },
          verificationChecks: { create: checkVerification },
        }),
      },
    },
  }),
}));

import { checkVerificationCode, sendVerificationCode } from "@/lib/sms";

const ENV = { ...process.env };

beforeEach(() => {
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
  createVerification.mockReset();
  checkVerification.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
});

describe("Twilio Verify phone OTP", () => {
  it("reports the missing service SID without calling Twilio", async () => {
    const result = await sendVerificationCode("+233200000000");

    expect(result).toEqual({
      success: false,
      error: "Twilio Verify is not configured: set TWILIO_VERIFY_SERVICE_SID.",
    });
    expect(createVerification).not.toHaveBeenCalled();
  });

  it("starts an SMS verification", async () => {
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_test";
    createVerification.mockResolvedValue({ status: "pending", sid: "VE_test" });

    const result = await sendVerificationCode("+233200000000");

    expect(createVerification).toHaveBeenCalledWith({
      to: "+233200000000",
      channel: "sms",
    });
    expect(result).toEqual({ success: true, status: "pending", sid: "VE_test" });
  });

  it("approves a valid verification code", async () => {
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_test";
    checkVerification.mockResolvedValue({ status: "approved", valid: true });

    const result = await checkVerificationCode("+233200000000", "123456");

    expect(checkVerification).toHaveBeenCalledWith({
      to: "+233200000000",
      code: "123456",
    });
    expect(result).toEqual({ success: true, status: "approved", valid: true });
  });

  it("rejects a code Twilio has not approved", async () => {
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_test";
    checkVerification.mockResolvedValue({ status: "pending", valid: false });

    const result = await checkVerificationCode("+233200000000", "000000");

    expect(result).toEqual({ success: false, status: "pending", valid: false });
  });
});
