-- Submission records are created and moderated only by authenticated
-- application routes using the backend service role. Public clients must not
-- bypass application authentication, validation, or rate limiting.

revoke all privileges on public.gym_update_submissions from anon, authenticated;
grant select, insert, update on public.gym_update_submissions to service_role;
