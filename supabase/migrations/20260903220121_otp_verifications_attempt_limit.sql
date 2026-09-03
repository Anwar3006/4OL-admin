-- =============================================================================
-- OTP verification attempt limiting
--
-- Twilio Verify handled attempt-limiting and expiry internally. Now that
-- send-otp/verify-otp generate and check codes ourselves (see lib/sms.ts,
-- part of the Twilio -> AWS SMS switch), otp_verifications needs an attempts
-- counter so a guesser can't brute-force a 6-digit code within its validity
-- window.
-- =============================================================================

alter table public.otp_verifications
  add column if not exists attempts integer not null default 0;

comment on column public.otp_verifications.attempts is
  'Failed verification attempts against this code. checkVerificationCode() rejects once this hits the max (5).';
