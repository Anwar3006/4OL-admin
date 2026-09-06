import { NextResponse } from "next/server";

/**
 * Mapping Audit S1 — this endpoint is deprecated and returns 410 Gone.
 *
 * It previously accepted an unauthenticated, client-supplied `userId` +
 * `phone` and used the service-role key to update the phone on that
 * user's auth record — an account-takeover path (any caller could take
 * over any account by supplying its userId). Mobile never called this
 * route (confirmed via repo-wide grep); phone changes go through
 * Supabase Auth's own `updateUser` + OTP flow instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This endpoint has been deprecated. Update the phone number through Supabase Auth (updateUser + OTP verification) instead.",
    },
    { status: 410 },
  );
}
