-- Provenance is no longer a public gym detail dependency.
-- Keep the view shape stable while removing public access to this column.
-- Existing row restrictions and service-role grants remain unchanged.
revoke select (data_source) on public.gyms from public, anon, authenticated;
revoke select (data_source) on public.gyms_public from public, anon, authenticated;
