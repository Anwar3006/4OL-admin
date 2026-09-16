import { describe, expect, it } from "vitest";
import { mobileFeatureCatalogue } from "./mobile-feature-catalogue";

describe("mobile feature catalogue", () => {
  it("keeps service and feature names unique", () => {
    const areaIds = mobileFeatureCatalogue.map((area) => area.id);
    expect(new Set(areaIds).size).toBe(areaIds.length);

    for (const area of mobileFeatureCatalogue) {
      const names = [...area.features, ...area.future].map(
        (feature) => feature.name,
      );
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("documents a user promise and a working check for every feature", () => {
    for (const area of mobileFeatureCatalogue) {
      expect(area.summary.trim().length).toBeGreaterThan(20);
      expect(area.features.length).toBeGreaterThan(0);

      for (const feature of [...area.features, ...area.future]) {
        expect(feature.description.trim().length).toBeGreaterThan(20);
        expect(feature.workingWhen.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("keeps future ideas out of the current feature list", () => {
    for (const area of mobileFeatureCatalogue) {
      expect(area.features.every((feature) => feature.state !== "planned")).toBe(
        true,
      );
      expect(area.future.every((feature) => feature.state === "planned")).toBe(
        true,
      );
    }
  });
});
