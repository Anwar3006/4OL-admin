import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isEmailConfigured, missingEmailConfig, sendEmail } from "@/lib/email";

/**
 * SES itself is not exercised here — these pin the behaviour that matters
 * while AWS is not yet configured: that a missing variable is reported by
 * NAME, and that nothing pretends to have sent mail.
 *
 * That distinction is the whole reason this module exists. The SendGrid code
 * it replaces failed a bare `if (!apiKey)` and returned "Email service is not
 * configured", which told an operator nothing about which key, and the login
 * alert path set `emailSent = true` without checking the send at all.
 */
const ENV = { ...process.env };

beforeEach(() => {
  delete process.env.AWS_REGION;
  delete process.env.SES_FROM_EMAIL;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ENV };
  vi.restoreAllMocks();
});

describe("missingEmailConfig", () => {
  it("names both variables when neither is set", () => {
    expect(missingEmailConfig()).toEqual(["AWS_REGION", "SES_FROM_EMAIL"]);
  });

  it("names only the one that is missing", () => {
    process.env.AWS_REGION = "eu-west-1";
    expect(missingEmailConfig()).toEqual(["SES_FROM_EMAIL"]);

    delete process.env.AWS_REGION;
    process.env.SES_FROM_EMAIL = "life@4ourlife.com";
    expect(missingEmailConfig()).toEqual(["AWS_REGION"]);
  });

  it("is empty once both are set", () => {
    process.env.AWS_REGION = "eu-west-1";
    process.env.SES_FROM_EMAIL = "life@4ourlife.com";
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
      expect(result.error).toContain("AWS_REGION");
      expect(result.error).toContain("SES_FROM_EMAIL");
    }
  });

  it("does not attempt a network call when unconfigured", async () => {
    // If it reached SES it would take far longer than this and fail with an
    // AWS error instead of the named one.
    const started = Date.now();
    const result = await sendEmail({ to: "a@b.c", subject: "s", html: "h" });
    expect(Date.now() - started).toBeLessThan(200);
    expect(result.success).toBe(false);
  });
});
