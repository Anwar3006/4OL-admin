/**
 * The moderation vocabularies `ui/` and `api/` must agree on.
 *
 * Both of these were declared twice before the E3.2 migration: once as a
 * `z.enum([...])` in the route handler and once as an inline string union in
 * the tab or dialog that posts to it. They happened to agree — but that is
 * exactly how `BODY_SYSTEMS` looked before the API's hand-copied subset of
 * five of nine 400'd the Body Map filter for months. One declaration, imported
 * by both halves, is the point of the `schema/` slot.
 */

/** Redemption lifecycle: pending → approved → fulfilled, or pending → rejected. */
export const REDEMPTION_STATUSES = ["pending", "approved", "rejected", "fulfilled"] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];

/** What an admin can do to a redemption. Not the same list as the statuses. */
export const REDEMPTION_ACTIONS = ["approve", "reject", "fulfill"] as const;
export type RedemptionAction = (typeof REDEMPTION_ACTIONS)[number];

/** Outdoor route verification. */
export const ROUTE_VERIFY_ACTIONS = ["approve", "reject"] as const;
export type RouteVerifyAction = (typeof ROUTE_VERIFY_ACTIONS)[number];

export const ROUTE_CLASSES = ["official", "community"] as const;
export type RouteClass = (typeof ROUTE_CLASSES)[number];
