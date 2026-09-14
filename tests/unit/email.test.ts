import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendGridSend, setApiKey } = vi.hoisted(() => ({
  sendGridSend: vi.fn(),
  setApiKey: vi.fn(),
}));

vi.mock("@sendgrid/mail", () => ({
  default: { send: sendGridSend, setApiKey },
}));

import { isEmailConfigured, missingEmailConfig, sendEmail } from "@/lib/email";

const ENV = { ...process.env };

beforeEach(() => {
  delete process.env.SENDGRID_API_KEY;
  delete process.env.SENDGRID_FROM_EMAIL;
  delete process.env.SENDGRID_FROM_NAME;
  sendGridSend.mockReset();
  setApiKey.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
});

describe("missingEmailConfig", () => {
  it("names both required variables when neither is set", () => {
    expect(missingEmailConfig()).toEqual([
      "SENDGRID_API_KEY",
      "SENDGRID_FROM_EMAIL",
    ]);
  });

  it("names only the variable that is missing", () => {
    process.env.SENDGRID_API_KEY = "SG.test";
    expect(missingEmailConfig()).toEqual(["SENDGRID_FROM_EMAIL"]);

    delete process.env.SENDGRID_API_KEY;
    process.env.SENDGRID_FROM_EMAIL = "auth@mail.4ourlife.com";
    expect(missingEmailConfig()).toEqual(["SENDGRID_API_KEY"]);
  });

  it("is configured once both required variables are set", () => {
    process.env.SENDGRID_API_KEY = "SG.test";
    process.env.SENDGRID_FROM_EMAIL = "auth@mail.4ourlife.com";
    expect(missingEmailConfig()).toEqual([]);
    expect(isEmailConfigured()).toBe(true);
  });
});

describe("sendEmail without configuration", () => {
  it("fails without attempting a SendGrid request", async () => {
    const result = await sendEmail({
      to: "someone@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("SENDGRID_API_KEY");
      expect(result.error).toContain("SENDGRID_FROM_EMAIL");
    }
    expect(sendGridSend).not.toHaveBeenCalled();
  });
});

describe("sendEmail with SendGrid configured", () => {
  beforeEach(() => {
    process.env.SENDGRID_API_KEY = "SG.test";
    process.env.SENDGRID_FROM_EMAIL = "auth@mail.4ourlife.com";
  });

  it("passes the shared message shape to SendGrid", async () => {
    sendGridSend.mockResolvedValue([
      { headers: { "x-message-id": "email-123" }, statusCode: 202 },
      {},
    ]);

    const result = await sendEmail({
      to: "someone@example.com",
      subject: "Security alert",
      html: "<p>Alert</p>",
      text: "Alert",
      replyTo: "support@4ourlife.com",
    });

    expect(setApiKey).toHaveBeenCalledWith("SG.test");
    expect(sendGridSend).toHaveBeenCalledWith({
      from: { email: "auth@mail.4ourlife.com", name: "4 Our Life" },
      to: "someone@example.com",
      subject: "Security alert",
      html: "<p>Alert</p>",
      text: "Alert",
      replyTo: "support@4ourlife.com",
    });
    expect(result).toEqual({ success: true, messageId: "email-123" });
  });

  it("returns SendGrid API failures without reporting success", async () => {
    sendGridSend.mockRejectedValue({
      message: "Bad Request",
      response: {
        body: { errors: [{ message: "Sender identity is not verified" }] },
      },
    });

    const result = await sendEmail({
      to: "someone@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({
      success: false,
      error: "Sender identity is not verified",
    });
  });
});
