import { describe, expect, it } from "vitest";
import { getReminderStatus } from "./useMedicationReminder";

describe("getReminderStatus", () => {
  it("marks a reminder complete when its course has ended", () => {
    expect(
      getReminderStatus({
        end_date: "2000-01-01",
        last_sent_at: null,
        is_enabled: true,
      }),
    ).toBe("complete");
  });

  it("does not let a missed or enabled state keep an ended course active", () => {
    expect(
      getReminderStatus({
        end_date: "2000-01-01T23:59:59.999Z",
        last_sent_at: "1999-12-31T12:00:00.000Z",
        is_enabled: true,
      }),
    ).toBe("complete");
  });

  it("keeps a future enabled course active", () => {
    expect(
      getReminderStatus({
        end_date: "2999-01-01",
        last_sent_at: null,
        is_enabled: true,
      }),
    ).toBe("active");
  });

  it("marks a timestamped course complete as soon as its end time passes", () => {
    expect(
      getReminderStatus({
        end_date: new Date(Date.now() - 60_000).toISOString(),
        last_sent_at: null,
        is_enabled: true,
      }),
    ).toBe("complete");
  });
});
