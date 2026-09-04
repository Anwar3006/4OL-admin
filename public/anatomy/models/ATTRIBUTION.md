# Anatomy Model Attribution

## Skin body models

The bundled anatomy base models are skin-only derivatives prepared for 4OurLife from public NIH 3D / Human Reference Atlas source models.

- Female source: NIH 3D entry 3DPX-020992, "Body, Female", https://3d.nih.gov/entries/20992?version=1
- Male source: NIH 3D entry 3DPX-021022, "Body, Male", https://3d.nih.gov/entries/21022?version=1
- License shown by NIH 3D: CC-BY.
- Source data: Visible Human Female and Visible Human Male, provided by the National Library of Medicine.

The app-ready GLBs keep only the skin mesh, normalize material alpha to opaque, and simplify geometry for mobile rendering. The female mesh was re-decimated on 2026-09-04 (133,924 → 65,000 triangles) to match the male mesh's polygon budget for consistent performance across genders.

## Organ models (`body-organs-standard.glb`)

Real anatomical organ geometry (heart, liver, small/large intestine, right/left lung, right/left kidney, brain, stomach, esophagus) replacing the earlier placeholder primitive spheres, added 2026-09-04.

- Source: **BodyParts3D**, (c) The Database Center for Life Science (DBCLS), licensed under **Creative Commons Attribution-Share Alike 2.1 Japan**. Dataset version 4.0 ("part-of" hierarchy release), downloaded from https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Required attribution per the source license: "BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan."
- Citation: Mitsuhashi N, Fujieda K, Tamura T, Kawamoto S, Takagi T, Okubo K. "BodyParts3D: 3D structure database for anatomical concepts." Nucleic Acids Res. 2009. DOI: http://doi.org/10.18908/lsdba.nbdc00837-000
- **CC BY-SA is share-alike (copyleft on the data):** any redistribution of these specific organ mesh files (modified or not) must remain under the same CC BY-SA 2.1 Japan license and carry the attribution above. This applies to the organ GLB only — the skin models above (CC-BY, no share-alike) and all application code are unaffected.
- Processing: each organ's constituent sub-part meshes (per BodyParts3D's FMA-based part decomposition) were merged, decimated with `@gltf-transform` (meshopt simplifier) to a mobile-appropriate triangle budget, and repositioned/scaled into the app's normalized body-space coordinates (feet y=0, head y=200, +z=front) using an affine transform calibrated against BodyParts3D's own "Skin" mesh bounding box (full-body span ≈1719.47mm). Final triangle counts: heart 3,252 · liver 1,720 · small intestine 2,236 · large intestine 1,200 · right lung 1,182 · left lung 1,178 · right kidney 400 · left kidney 400 · brain 9,586 · stomach 500 · esophagus 298 (≈22k triangles total, 279KB).
- Known approximation: the medial-lateral (left/right) sign convention and anterior-posterior depth centering were calibrated from BodyParts3D's own coordinate system rather than an exact anatomical reference; visually verify left/right sidedness (e.g. heart should read as offset toward one side, not centered) during QA and flip the `MIRROR_X` constant in the build pipeline if it reads mirrored relative to the app's existing left/right pin conventions.
