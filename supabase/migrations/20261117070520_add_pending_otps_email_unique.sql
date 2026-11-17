/*
# Add unique constraint on pending_otps.email

## Purpose
The send-auth-email edge function upserts OTP records with
`Prefer: resolution=merge-duplicates,return=minimal` and `on_conflict=email`,
which requires a unique constraint on the email column. Without it, duplicate
sign-up attempts for the same email create multiple pending rows and the
upsert silently inserts instead of replacing.
*/

CREATE UNIQUE INDEX IF NOT EXISTS pending_otps_email_unique_idx
  ON pending_otps(email);
