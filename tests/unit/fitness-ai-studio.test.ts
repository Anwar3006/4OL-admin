import { describe, expect, it } from "vitest";
import { DEFAULT_AI_MODEL } from "@/features/ai/schema/models";
import {
  AI_STUDIO_MODULE_KEYS,
  AI_STUDIO_MODULE_MAP,
  AI_STUDIO_MODULES,
  AiStudioGenerateRequestSchema,
} from "@/features/fitness/schema/ai-studio";

describe("Fitness AI Studio contract", () => {
  it("keeps the capability catalogue and generator registry in sync", () => {
    expect(AI_STUDIO_MODULES).toHaveLength(AI_STUDIO_MODULE_KEYS.length);
    expect(new Set(AI_STUDIO_MODULES.map((module) => module.key)).size).toBe(
      AI_STUDIO_MODULES.length,
    );

    for (const key of AI_STUDIO_MODULE_KEYS) {
      expect(AI_STUDIO_MODULE_MAP[key].capabilities.length).toBeGreaterThan(0);
      expect(AI_STUDIO_MODULE_MAP[key].outputGuide.length).toBeGreaterThan(20);
    }
  });

  it("accepts the curated default model", () => {
    const result = AiStudioGenerateRequestSchema.safeParse({
      module: "exercises",
      model: DEFAULT_AI_MODEL,
      quantity: 3,
      topic: "Bodyweight exercise ideas",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unapproved model ids and invalid quantities", () => {
    expect(
      AiStudioGenerateRequestSchema.safeParse({
        module: "plans",
        model: "secret-server-default",
        quantity: 3,
        topic: "Beginner plan",
      }).success,
    ).toBe(false);
    expect(
      AiStudioGenerateRequestSchema.safeParse({
        module: "plans",
        model: DEFAULT_AI_MODEL,
        quantity: 13,
        topic: "Beginner plan",
      }).success,
    ).toBe(false);
  });
});
