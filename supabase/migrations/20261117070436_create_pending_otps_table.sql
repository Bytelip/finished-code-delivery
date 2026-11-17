/*
# Create pending_otps table for email verification flow

## Purpose
Stores 6-digit OTP verification codes generated during sign-up, with 5-minute
expiration and one-time-use semantics. Replaces the previous client-side
in-memory OTP record, which could not persist across edge function instances.

## New Tables
- `pending_otps`
  - `id` (uuid, primary key)
  - `email` (text, indexed) — the address pending verification
  - `code_hash` (text) — SHA-256 hash of the OTP code (never the plaintext)
  - `salt` (text) — per-record salt used in the hash
  - `attempts` (int, default 0) — failed verification attempts (max 5)
  - `verified` (boolean, default false) — set true once code confirmed
  - `expires_at` (timestamptz) — 5 minutes from creation
  - `created_at` (timestamptz, default now())

## Security
- RLS enabled.
- Grants: service_role only (edge functions verify the code server-side; the
  browser never reads or writes this table directly). anon/authenticated get
  no grants, so the table is invisible to the anon-key client.
- No policies are added because only the service role touches this table and
  the service role bypasses RLS; the explicit GRANT is still required for the
  function invocation to reach the table.
*/

CREATE TABLE IF NOT EXISTS pending_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code_hash text NOT NULL,
  salt text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pending_otps_email_idx ON pending_otps(email);
CREATE INDEX IF NOT EXISTS pending_otps_expires_at_idx ON pending_otps(expires_at);

ALTER TABLE pending_otps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON pending_otps TO service_role;

-- Helper function used by verify-auth-otp edge function to clean up expired
-- rows for a given email so only the most recent pending code is evaluated.
CREATE OR REPLACE FUNCTION cleanup_expired_otps(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM pending_otps
  WHERE email = lower(p_email)
    AND (expires_at < now() OR verified = true);
END;
$$;

REVOKE EXECUTE ON FUNCTION cleanup_expired_otps(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION cleanup_expired_otps(text) TO service_role;
