/**
 * Server-side client for PostHog's Feature Flags management API (P0-07).
 * Reads POSTHOG_PERSONAL_API_KEY (a secret), so only ever import this from
 * API routes / server code — same expectation as lib/email.ts and
 * lib/aws-sms.ts, which hold equivalent secrets and also skip the
 * `import "server-only"` guard (it throws under plain vitest, which is why
 * this file's unit tests would break with it; Next's own bundler still
 * fails the build if a client component pulls this in transitively).
 *
 * PostHog is the actual flag-evaluation engine — the mobile app reads flags
 * client-side via posthog-react-native's useFeatureFlags(), using a
 * project *token* (EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN, read-only for flag
 * evaluation). Authoring/updating a flag's definition needs a different
 * credential — a *personal* API key — which is why this is a separate,
 * new, server-only client rather than reusing anything mobile already has.
 *
 * This is NOT the posthog-node SDK: that SDK is for capturing events and
 * evaluating flags server-side, not for creating/editing flag definitions.
 * The management surface is a plain bearer-token REST API, so a thin fetch
 * wrapper is all this needs.
 *
 * Required configuration:
 *   POSTHOG_PERSONAL_API_KEY   personal API key (phx_…), scoped to this project
 *   POSTHOG_PROJECT_ID         numeric project id (Project settings → Project ID)
 *   POSTHOG_HOST               the APP/API host, e.g. https://app.posthog.com —
 *                              NOT the ingestion host (us.i.posthog.com /
 *                              eu.i.posthog.com) the mobile app uses for events.
 */

export function missingPostHogConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.POSTHOG_PERSONAL_API_KEY) missing.push("POSTHOG_PERSONAL_API_KEY");
  if (!process.env.POSTHOG_PROJECT_ID) missing.push("POSTHOG_PROJECT_ID");
  return missing;
}

export function isPostHogConfigured(): boolean {
  return missingPostHogConfig().length === 0;
}

export class PostHogSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostHogSyncError";
  }
}

function apiBase(): string {
  const host = (process.env.POSTHOG_HOST || "https://app.posthog.com").replace(/\/$/, "");
  const projectId = process.env.POSTHOG_PROJECT_ID;
  return `${host}/api/projects/${projectId}/feature_flags`;
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
    "Content-Type": "application/json",
  };
}

interface PostHogFlagGroup {
  properties: unknown[];
  rollout_percentage: number | null;
}

export interface PostHogFlag {
  id: number;
  key: string;
  name: string;
  active: boolean;
  filters: { groups: PostHogFlagGroup[] };
  deleted?: boolean;
}

interface PostHogFlagListResponse {
  results: PostHogFlag[];
  next: string | null;
}

function requireConfigured(): void {
  const missing = missingPostHogConfig();
  if (missing.length > 0) {
    throw new PostHogSyncError(`PostHog is not configured: set ${missing.join(" and ")}.`);
  }
}

/** All flags in the project, paginated through. Excludes soft-deleted flags. */
export async function listPostHogFlags(): Promise<PostHogFlag[]> {
  requireConfigured();

  const flags: PostHogFlag[] = [];
  let url: string | null = `${apiBase()}/?limit=100`;

  while (url) {
    const res: Response = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      throw new PostHogSyncError(`PostHog list flags failed: ${res.status} ${await res.text()}`);
    }
    const body = (await res.json()) as PostHogFlagListResponse;
    flags.push(...body.results.filter((f) => !f.deleted));
    url = body.next;
  }

  return flags;
}

/** Looks a flag up by its stable key (PostHog's REST API addresses flags by internal id, not key). */
export async function findPostHogFlagByKey(key: string): Promise<PostHogFlag | null> {
  const flags = await listPostHogFlags();
  return flags.find((f) => f.key === key) ?? null;
}

export interface UpsertPostHogFlagInput {
  key: string;
  name: string;
  description?: string | null;
  active: boolean;
  rolloutPercentage: number;
}

/**
 * Creates the flag in PostHog if it doesn't exist yet, otherwise updates it.
 * Always throws PostHogSyncError on failure — callers decide whether that's
 * fatal.
 *
 * `active` and the release-condition group's `rollout_percentage` are
 * pushed independently, matching how this project actually uses PostHog:
 * `active` means "staged/registered," `rollout_percentage` is the separate,
 * deliberate dial for when it's actually turned on for users — a flag can
 * be `active: true, rollout_percentage: 0` on purpose (confirmed with the
 * team; most of this project's existing flags are exactly that shape).
 */
export async function upsertPostHogFlag(input: UpsertPostHogFlagInput): Promise<PostHogFlag> {
  requireConfigured();

  const existing = await findPostHogFlagByKey(input.key);
  const body = {
    key: input.key,
    name: input.name,
    active: input.active,
    filters: {
      groups: [{ properties: [], rollout_percentage: input.rolloutPercentage }],
    },
  };

  const url = existing ? `${apiBase()}/${existing.id}/` : `${apiBase()}/`;
  const method = existing ? "PATCH" : "POST";

  const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    throw new PostHogSyncError(
      `PostHog ${method === "PATCH" ? "update" : "create"} flag "${input.key}" failed: ${res.status} ${await res.text()}`,
    );
  }
  return (await res.json()) as PostHogFlag;
}

/**
 * A flag's state as this project's `feature_flags` table mirrors it:
 * `active` maps 1:1 to PostHog's own `active` bit (staged/registered, not
 * "currently visible to users" — that's what `rolloutPercentage` is for,
 * and it's read and shown separately, never collapsed into `active`).
 */
export function effectiveFlagState(flag: PostHogFlag): { active: boolean; rolloutPercentage: number } {
  const group = flag.filters?.groups?.[0];
  return { active: flag.active, rolloutPercentage: group?.rollout_percentage ?? 100 };
}

/** Current state of a flag in PostHog, for the pull-sync job. Null if PostHog has no such flag. */
export async function getPostHogFlagState(
  key: string,
): Promise<{ active: boolean; rolloutPercentage: number } | null> {
  const flag = await findPostHogFlagByKey(key);
  return flag ? effectiveFlagState(flag) : null;
}
