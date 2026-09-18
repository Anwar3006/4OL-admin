export type DrugCandidate = {
  name?: string | null;
  genericName?: string | null;
  classificationReason?: string | null;
};

const NON_DRUG_GENERIC_NAMES = new Set([
  "adidas",
  "air freshener",
  "arm sling",
  "baby lotion",
  "body spray",
  "cologne",
  "deodorant",
  "dog food",
  "mouth freshener",
  "old spice",
  "perfume",
  "sling",
  "slingshot",
  "slingshots",
  "toothpaste",
  "toy",
  "toys",
]);

const NON_DRUG_NAME_PATTERNS: Array<[RegExp, string]> = [
  [/\barm\s+slings?\b|\bslingshots?\b/i, "medical accessory"],
  [/\bperfumes?\b|\beau\s+de\s+(parfum|perfume|toilette)\b|\bcolognes?\b/i, "fragrance"],
  [/\btoys?\b|\b(police|racing|remote(?:\s+control)?)\s+cars?\b/i, "toy"],
  [/\b(body|deo)\s+sprays?\b|\bdeodorants?\b|\bshower\s+gels?\b/i, "personal care product"],
  [/\bair\s+(fresheners?|wick)\b|\bscented\s+candles?\b/i, "air freshener"],
  [/\bdog\s+food\b/i, "pet food"],
  [/\bstarch\s+sprays?\b/i, "household product"],
];

/** Returns a reason when a catalogue candidate is clearly not a medicine. */
export function getObviousNonDrugReason({
  name,
  genericName,
  classificationReason,
}: DrugCandidate): string | null {
  if (/non-med indicator/i.test(classificationReason ?? "")) {
    return "classifier marked this as a non-medication";
  }

  const genericKey = (genericName ?? "").trim().toLowerCase();
  if (NON_DRUG_GENERIC_NAMES.has(genericKey)) {
    return `non-drug generic: ${genericKey}`;
  }

  const candidate = `${name ?? ""} ${genericName ?? ""}`.trim();
  for (const [pattern, reason] of NON_DRUG_NAME_PATTERNS) {
    if (pattern.test(candidate)) return reason;
  }

  return null;
}
