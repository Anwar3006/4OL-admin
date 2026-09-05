/**
 * Route entry only. /api/period/data was a single 1,166-line file.
 *
 * Handlers are in _handlers/, request validation and shared helpers in _lib/.
 * Directories prefixed with `_` are private to Next's router, so nothing here
 * becomes a URL.
 *
 * This endpoint is NOT part of the mobile contract — the Expo app uses
 * /api/period/{me,library,trivia,trivia/fulfillment}. Those are frozen; this
 * one is free to change shape.
 */
export { GET } from "./_handlers/get";
export { POST } from "./_handlers/post";
