-- Remove accidental leading/trailing spaces from imported model numbers.
-- Preserve internal spaces and leave already-clean values unchanged.
update public.equipment
set model_number = btrim(model_number)
where model_number <> btrim(model_number);
