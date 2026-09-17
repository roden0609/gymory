-- Make the privileges required by createAdminClient-backed application routes
-- reproducible on a clean local database. RLS bypass alone does not grant
-- PostgreSQL table access.

-- Remove permissive ACLs inherited from older Supabase project defaults.
-- Migration 0052 selectively restores public read access where required.
revoke all privileges on public.gyms from anon, authenticated;
revoke all privileges on public.gyms_normalized from anon, authenticated;
revoke all privileges on public.gym_equipment_type_inventory from anon, authenticated;
revoke all privileges on public.gym_brand_inventory from anon, authenticated;
revoke all privileges on public.gym_accuracy_votes from anon, authenticated;
revoke all privileges on public.gym_accuracy_vote_events from anon, authenticated;
revoke all privileges on public.contributor_gym_firsts from anon, authenticated;
revoke all privileges on public.contributor_stats from anon, authenticated;

grant select, insert, update on public.gyms to service_role;
grant select on public.gyms_normalized to service_role;

grant select, insert, update, delete
  on public.gym_equipment_type_inventory to service_role;
grant select, insert, update, delete
  on public.gym_brand_inventory to service_role;

grant select, insert, update, delete
  on public.gym_accuracy_votes to service_role;
grant select, insert
  on public.gym_accuracy_vote_events to service_role;

grant select, insert, update
  on public.contributor_gym_firsts to service_role;
grant select, insert, update
  on public.contributor_stats to service_role;
