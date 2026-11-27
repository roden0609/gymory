insert into public.equipment_types (code, name_en, name_zh, category)
values ('wall_ball_plate', 'Wall ball plate', '牆球目標板', 'other')
on conflict (code) do nothing;
