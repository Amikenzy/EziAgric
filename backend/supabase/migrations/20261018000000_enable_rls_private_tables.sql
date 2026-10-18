-- Row-level security for Supabase tables holding private data (issue #470).
--
-- Inventory (tables the backend reads/writes through @supabase/supabase-js,
-- see backend/src/services/user.service.ts):
--   users       profile rows keyed by wallet address; holds phone_encrypted
--   phone_otps  hashed OTP codes and encrypted phone numbers
--   driver_logs driver activity logs (not queried by backend code yet)
--
-- Policy model: deny-by-default for anon and authenticated roles. No policies
-- are granted to client roles, so the anon key (and any user JWT) returns zero
-- rows and cannot write. The backend uses SUPABASE_SERVICE_ROLE_KEY, which
-- bypasses RLS by design, so it keeps working unchanged.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- Defense in depth: remove the default table grants Supabase gives client roles.
REVOKE ALL ON TABLE public.users FROM anon, authenticated;
REVOKE ALL ON TABLE public.phone_otps FROM anon, authenticated;

-- driver_logs may not exist in every environment, so guard the change.
DO $$
BEGIN
  IF to_regclass('public.driver_logs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.driver_logs ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.driver_logs FROM anon, authenticated';
  END IF;
END
$$;
