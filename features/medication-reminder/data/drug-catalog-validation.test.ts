import { describe, expect, it } from "vitest";
import { getObviousNonDrugReason } from "./drug-catalog-validation";

describe("getObviousNonDrugReason", () => {
  it.each([
    ["1 Million Perfume 100ml", "perfume"],
    ["60 Polar Arm Sling 80cm", "arm sling"],
    ["Old Spice Body Spray", "old spice body spray"],
    ["Remote Control Car", "toy"],
  ])("rejects non-drug inventory entry %s", (name, genericName) => {
    expect(getObviousNonDrugReason({ name, genericName })).not.toBeNull();
  });

  it.each([
    ["Avamys Nasal Spray", "fluticasone furoate"],
    ["Deep Heat Spray", "topical analgesic"],
    ["Paracetamol 500mg Tablets", "paracetamol"],
  ])("keeps medicine %s", (name, genericName) => {
    expect(getObviousNonDrugReason({ name, genericName })).toBeNull();
  });
});
