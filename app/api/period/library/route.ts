/**
 * Route entry only — see features/period/README.md.
 * Handler lives in features/period/api/library.ts.
 */

// Declared here, not in the feature module: Next reads route segment config
// by directly analysing the route file, so it does not follow a re-export.
export const runtime = "nodejs";
export { GET, POST } from "@/features/period/api/library";
