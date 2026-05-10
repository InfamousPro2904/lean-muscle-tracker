-- Migration 005: Security hardening
-- Address findings from Supabase advisor:
--   • function_search_path_mutable
--   • anon_security_definer_function_executable
--   • authenticated_security_definer_function_executable (internal-only fns)

ALTER FUNCTION public.handle_new_user()                      SET search_path = '';
ALTER FUNCTION public.rls_auto_enable()                      SET search_path = '';
ALTER FUNCTION public.increment_feedback_upvotes(uuid)       SET search_path = '';
ALTER FUNCTION public.decrement_feedback_upvotes(uuid)       SET search_path = '';
ALTER FUNCTION public.get_my_leaderboard_ids()               SET search_path = public, pg_temp;
ALTER FUNCTION public.shares_leaderboard_with_me(uuid)       SET search_path = public, pg_temp;
ALTER FUNCTION public.update_feedback_updated_at()           SET search_path = '';
ALTER FUNCTION public.update_daily_log_updated_at()          SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.handle_new_user()                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_feedback_upvotes(uuid)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_feedback_upvotes(uuid)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_leaderboard_ids()              FROM anon;
REVOKE EXECUTE ON FUNCTION public.shares_leaderboard_with_me(uuid)      FROM anon;

REVOKE EXECUTE ON FUNCTION public.handle_new_user()                     FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()                     FROM authenticated;
