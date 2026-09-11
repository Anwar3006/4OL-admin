import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resendSend } = vi.hoisted(() => ({ resendSend: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: resendSend };
  },
}));

import { isEmailConfigured, missingEmailConfig, sendEmail } from "@/lib/email";

/**
 * Resend itself is not exercised here — these pin the behaviour that matters
 * while email is not configured: that a missing variable is reported by
 * NAME, and that nothing pretends to have sent mail.
 *
 * That distinction is the whole reason this module exists. The SendGrid code
 * it replaces failed a bare `if (!apiKey)` and returned "Email service is not
 * configured", which told an operator nothing about which key, and the login
 * alert path set `emailSent = true` without checking the send at all.
 */
const ENV = { ...process.env };

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  resendSend.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
});

describe("missingEmailConfig", () => {
  it("names both variables when neither is set", () => {
    expect(missingEmailConfig()).toEqual(["RESEND_API_KEY", "RESEND_FROM_EMAIL"]);
  });

  it("names only the one that is missing", () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(missingEmailConfig()).toEqual(["RESEND_FROM_EMAIL"]);

    delete process.env.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = "4 Our Life <auth@mail.4ourlife.com>";
    expect(missingEmailConfig()).toEqual(["RESEND_API_KEY"]);
  });

  it("is empty once both are set", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "4 Our Life <auth@mail.4ourlife.com>";
    expect(missingEmailConfig()).toEqual([]);
    expect(isEmailConfigured()).toBe(true);
  });
});

describe("sendEmail with no configuration", () => {
  it("fails rather than throwing, so callers can decide", async () => {
    const result = await sendEmail({
      to: "someone@example.com",
      subject: "hi",
      html: "<p>hi</p>",
    });
    expect(result.success).toBe(false);
  });

  it("names the missing variables in the error", async () => {
    const result = await sendEmail({
      to: "someone@example.com",
      subject: "hi",
      html: "<p>hi</p>",
    });
    // An operator reading a log should learn what to set. "Credentials error"
    // five frames into the AWS SDK does not do that.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("RESEND_API_KEY");
      expect(result.error).toContain("RESEND_FROM_EMAIL");
    }
  });

  it("does not attempt a network call when unconfigured", async () => {
    // If it reached Resend it would fail with a network error instead of the
    // named configuration error.
    const started = Date.now();
    const result = await sendEmail({ to: "a@b.c", subject: "s", html: "h" });
    expect(Date.now() - started).toBeLessThan(200);
    expect(result.success).toBe(false);
  });
});

describe("sendEmail with Resend configured", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "4 Our Life <auth@mail.4ourlife.com>";
  });

  it("passes the shared email shape to Resend", async () => {
    resendSend.mockResolvedValue({ data: { id: "email-123" }, error: null });

    const result = await sendEmail({
      to: "someone@example.com",
      subject: "Security alert",
      html: "<p>Alert</p>",
      text: "Alert",
      replyTo: "support@4ourlife.com",
    });

    expect(resendSend).toHaveBeenCalledWith({
      from: "4 Our Life <auth@mail.4ourlife.com>",
      to: "someone@example.com",
      subject: "Security alert",
      html: "<p>Alert</p>",
      text: "Alert",
      replyTo: "support@4ourlife.com",
    });
    expect(result).toEqual({ success: true, messageId: "email-123" });
  });

  it("returns API failures without pretending the email was sent", async () => {
    resendSend.mockResolvedValue({
      data: null,
      error: { name: "validation_error", message: "Domain is not verified" },
    });

    const result = await sendEmail({
      to: "someone@example.com",
      subject: "Hello",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({ success: false, error: "Domain is not verified" });
  });
});
