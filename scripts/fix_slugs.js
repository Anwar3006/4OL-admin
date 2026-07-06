const fs = require("fs");
const path = require("path");

const filePath = path.join(process.cwd(), "constant", "disease_seed_data.json");

const slugMap = {
  "blood.and.lymph": "blood-and-lymph",
  "muscle.bone.and.joints": "muscle-bone-and-joint",
  "stomach.liver.and.gastrointestinal.tract":
    "stomach-liver-and-gastrointestinal",
  "brain.nerves.and.spinal.cord": "brain-nerves-and-spinal-cord",
  "immune.system": "immune-system",
  "cardiovascular.disease": "cardiovascular-disease",
  "lungs.and.airways": "lungs-and-airways",
  "mental.health": "mental-health",
  "sexual.and.reproductive": "sexual-and-reproductive",
  "kidneys.bladder.and.prostate": "kidneys-bladder-and-prostate",
  "infections.and.poisoning": "infections-and-poisoning",
  "rare.conditions": "rare-conditions",
  "chromosomal.conditions": "chromosomal-conditions",
  "ears.nose.and.throat": "ears-nose-and-throat",
  "pregnancy.and.childbirth": "pregnancy-and-childbirth",
  "skin.hair.and.nails": "skin",
};

try {
  let rawData = fs.readFileSync(filePath, "utf8");
  let data = JSON.parse(rawData);

  let updatedCount = 0;

  // Update categories seed if needed
  if (data.categories_seed) {
    data.categories_seed = data.categories_seed.map((cat) => {
      if (slugMap[cat.slug]) {
        cat.slug = slugMap[cat.slug];
      }
      return cat;
    });
  }

  // Update diseases seed
  if (data.diseases_seed) {
    data.diseases_seed = data.diseases_seed.map((disease) => {
      if (slugMap[disease.category_association_slug]) {
        disease.category_association_slug =
          slugMap[disease.category_association_slug];
        updatedCount++;
      }
      return disease;
    });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(
    `✅ Successfully updated ${updatedCount} disease category slugs! You can run the seeder again.`,
  );
} catch (error) {
  console.error("❌ Error updating the JSON file:", error);
}
