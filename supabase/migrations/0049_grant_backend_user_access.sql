-- Authenticated application routes resolve Firebase identities through this
-- table with the backend service role.

revoke all privileges on public.users from anon, authenticated;
revoke all privileges on public.user_profile_audit_events from anon, authenticated;

grant select, insert, update on public.users to service_role;
grant insert on public.user_profile_audit_events to service_role;
