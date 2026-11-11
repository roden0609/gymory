# Frontend minimum data list

更新日期：2026-11-12

## 實作狀態及範圍

本文件記錄 public-facing 查詢嘅欄位合約，以及 migration `0067_frontend_column_read_access.sql` 嘅匿名／authenticated 欄位權限。本次已修改 repo 查詢同新增 migration；未套用到 production。權限測試喺本機 Supabase transaction 內執行，最後 rollback。

- 公開查詢改用 `gyms_public` security-invoker view，列明所需欄位。
- 原有 `gyms_normalized` 保留畀後台，撤走 anon／authenticated 存取。
- 公開角色改用 column-level SELECT，冇 table-wide SELECT；RLS 繼續限制可讀 rows。
- Server admin query（貢獻者／投票摘要等）唔代表原表需要公開。
- 每頁 SELECT 係該功能所需資料；DB allowlist 係所有公開用途及 RLS／join 依賴嘅聯集，唔係每頁獨立權限。
- 路徑省略 `/zh-HK`、`/en`。本文件唔包含 admin、私人帳戶及寫入欄位清單。

現有 `gyms_normalized` 包含內部 base columns；只撤走底層欄位權限會令 security-invoker 查詢失敗。因此新增只引用公開 base columns 嘅 `gyms_public`，唔係直接喺舊 view 外面再包一層 SELECT。

## 1. 頁面對應

| 頁面 | 資料組合 |
|---|---|
| `/`、`/search`、`/districts/[slug]` | 搜尋清單 + 票數 + 搜尋選項；按條件查器材／品牌關聯 |
| `/gyms` | 搜尋清單 + 票數；按條件查器材／品牌關聯；冇 SearchExperience 選項載入 |
| `/[training]`、`/[training]/districts/[district]` | 搜尋清單 + 票數 + 搜尋選項；metadata 亦會查訓練分類 |
| `/gym-brands/[slug]` | 搜尋清單 + 票數 + 搜尋選項 + 連鎖品牌概覽 |
| `/equipment/[equipment]` | 搜尋清單 + 票數；品牌相關定義另查品牌 inventory |
| `/gyms/[slug]/[equipment]` | 同器材專題，加地區條件；此路徑嘅 slug 係地區 |
| `/brands/[brand]` | 搜尋清單 + 票數 + equipment_brands + gym_brand_inventory |
| `/gyms/[slug]` | 明確 gym 詳情欄位 + 器材種類 + 型號 + 品牌 + server 投票摘要 |
| `/gym-brands` | 連鎖品牌目錄 |
| `/contributors`、`/contributors/[handle]` | Server admin 查公開貢獻者資料 |
| `/login` | 頁面本身冇直接查 Supabase 業務資料 |
| `/submit` | 需要登入；只讀可編輯 gym 欄位同品牌 slug，唔再載入未用嘅種類 inventory |
| `/account` | 登入後私人資料，唔納入匿名公開欄位清單 |

舊 `/gyms/*-hong-kong` 訓練路徑係 redirect；metadata 使用訓練分類查詢。

## 2. 搜尋／列表

### 2.1 gyms_public：完整 SELECT

`GYM_SEARCH_COLUMNS` 由 153 收窄至 148 個欄位。移除未用嘅 size_category、equipment_last_verified_at、hyrox_partner_id、hyrox_source_url、hyrox_source_synced_at。

保留大量器材欄位，因為 GymCard 嘅「未有器材資料」提示會逐項檢查已知資料，訓練分類亦喺 server 用欄位判斷 membership／signals。唔可以只按卡片可見 badges 刪欄位。未來可另行用 computed summary 繼續減少傳輸；本次保留現有功能行為。

```text
id
name
name_zh
slug
district_code
address
address_zh
lat
lng
rack_count
bench_count
barbell_count
platform_count
dumbbell_min_weight_kg
dumbbell_max_weight_kg
plate_min_weight_kg
plate_max_weight_kg
has_roman_chair
has_trap_bar
has_safety_squat_bar
has_farmer_handles
has_landmine_attachment
has_swiss_bar
has_cambered_bar
has_ez_bar
treadmill_count
assault_bike_count
exercise_bike_count
climber_count
elliptical_machine_count
assault_runner_count
ski_erg_count
rower_count
sled_count
has_wall_ball
wall_ball_count
wall_ball_4kg_count
wall_ball_6kg_count
wall_ball_8kg_count
wall_ball_9kg_count
wall_ball_10kg_count
wall_ball_plate_9ft_count
wall_ball_plate_10ft_count
has_workout_sandbag
has_boxing_sandbag
sandbag_5kg_count
sandbag_10kg_count
sandbag_15kg_count
sandbag_20kg_count
sandbag_25kg_count
sandbag_30kg_count
has_kettlebell
kettlebell_4kg_count
kettlebell_6kg_count
kettlebell_8kg_count
kettlebell_10kg_count
kettlebell_12kg_count
kettlebell_14kg_count
kettlebell_16kg_count
kettlebell_18kg_count
kettlebell_20kg_count
kettlebell_24kg_count
kettlebell_32kg_count
cable_machine_count
has_lat_pulldown_cable
has_seated_row_cable
smith_machine_count
has_smith_machine
has_deadlift_platform
has_pull_up_bar
has_dip_station
has_trx
has_resistance_band
has_battle_ropes
has_rings
has_glute_ham_developer
has_reverse_hyper
has_farmers_handles
has_preacher_curl_bench
has_bicep_curl_machine
has_tricep_extension_machine
has_dip_machine
has_chest_press_machine
has_incline_chest_press_machine
has_decline_chest_press_machine
has_bench_rack
has_incline_bench_rack
has_iso_lateral_chest_press_machine
has_pec_deck_machine
has_chest_fly_machine
has_lat_pulldown_machine
has_seated_row_machine
has_back_extension_machine
has_iso_lateral_row_machine
has_t_bar_row_machine
has_pull_over_machine
has_overhead_chair
has_lateral_raise_machine
has_standing_lateral_raise_machine
has_reverse_fly_machine
has_shoulder_press_machine
has_iso_lateral_shoulder_press_machine
has_multi_press_machine
has_multi_hip_machine
has_stretching_machine
has_mobility_stick
has_hip_abductor_machine
has_hip_adductor_machine
has_leg_extension_machine
has_leg_press_machine
has_seated_leg_press_machine
has_lying_leg_curl_machine
has_seated_leg_curl_machine
has_seated_calf_raise_machine
has_squat_machine
has_hack_squat
has_belt_squat_machine
has_standing_calf_raise_machine
has_glute_extension_machine
has_hip_thrust_machine
has_battle_rope
has_foam_roller
has_medicine_ball
has_exercise_stepper
has_ab_roller
has_massage_ball
has_dip_belt
has_weight_vest
has_lifting_straps
has_plyo_box
has_balance_ball
has_washroom
has_bathroom
has_changing_room
has_free_water
has_dry_sauna
has_wet_sauna
has_ice_bath
has_yoga_block
has_yoga_mat
has_ab_crunch_bench
has_torso_rotation_machine
has_ab_crunch_machine
equipment_notes
is_verified
is_hyrox_official
data_accuracy_status
updated_at
```

查詢另用 is_active、estimated_size_sqft 同所選器材／地區條件。filter／排序所需欄位唔一定要出現喺 response。

來源：[search-gyms.ts](../../apps/web/src/lib/db/queries/search-gyms.ts)、[GymCard.tsx](../../apps/web/src/components/search/GymCard.tsx)、[training-pages.ts](../../apps/web/src/lib/training-pages.ts)。

### 2.2 票數、搜尋選項及條件式關聯

| Table | SELECT | 額外條件／排序用途 |
|---|---|---|
| gym_accuracy_votes | gym_id, vote | gym_id；列表計算票數 |
| equipment_categories | slug, name, name_zh | is_active, sort_order, name；舊 schema fallback 只查 slug, name |
| equipment | id, name；篩選 query 只查 id | slug, name, brand_id |
| equipment_aliases | equipment_id, alias | alias |
| equipment_types | code | category, is_active；有分類條件先查 |
| equipment_type_assignments | equipment_id | equipment_type_code；有分類條件先查 |
| equipment_brands | id | slug；品牌 landing 另用 is_active |
| gym_equipment_inventory | gym_id | equipment_id, verified_status |
| gym_brand_inventory | gym_id | brand_id |

來源：[equipment-catalog-search.ts](../../apps/web/src/lib/db/queries/equipment-catalog-search.ts)、[equipment-pages.ts](../../apps/web/src/lib/db/queries/equipment-pages.ts)、[equipment-brands.ts](../../apps/web/src/lib/db/queries/equipment-brands.ts)。

## 3. Gym 詳情

### 3.1 gyms_public：明確 SELECT

取代原有 `select("*")`，以 PublicGymDetail 型別表達實際欄位。包含顯示、聯絡連結及 SEO structured data。

```text
id
name
name_zh
slug
district_code
address
address_zh
lat
lng
country_code
postal_code
size_category
estimated_size_sqft
dumbbell_min_weight_kg
dumbbell_max_weight_kg
plate_min_weight_kg
plate_max_weight_kg
has_washroom
has_bathroom
has_changing_room
has_free_water
has_dry_sauna
has_wet_sauna
has_ice_bath
day_pass_price
opening_hours_json
website_url
instagram_url
contact_phone
is_verified
is_hyrox_official
equipment_last_verified_at
updated_at
data_source
```

來源：[gym-public-columns.ts](../../apps/web/src/lib/db/queries/gym-public-columns.ts)、[gyms.ts](../../apps/web/src/lib/db/queries/gyms.ts)、[詳情頁](../../apps/web/src/app/[locale]/gyms/[slug]/page.tsx)。

### 3.2 器材及品牌

| Table | SELECT |
|---|---|
| gym_equipment_type_inventory | equipment_code, is_present, quantity, is_directly_reported；gym_id 篩選 |
| equipment_types | code, name_en, name_zh, category, labels, is_active, display_order |
| gym_brand_inventory | 關聯 equipment_brands；gym_id 篩選 |
| equipment_brands（品牌展示） | name_en, name_zh |
| gym_equipment_inventory | quantity, verified_status；gym_id 篩選 |
| equipment | id, name, name_zh, labels |
| equipment_images | id, image_role, storage_path, is_primary, sort_order |
| equipment_type_assignments | is_primary，關聯 equipment_types |
| equipment_brands（型號關聯） | name_en, name_zh |

已移除 inventory timestamps／id、type aliases／parent／timestamps、圖片原始 url／source_url、model_number、品牌 country 同未用嘅品牌 id。圖片主圖仍需要 id 作排序 tie-break、image_role 判斷官方 fallback，以及 storage_path 組合公開 Storage URL。

來源：[gym-equipment-inventory.ts](../../apps/web/src/lib/db/queries/gym-equipment-inventory.ts)、[equipment-machine-inventory.ts](../../apps/web/src/lib/db/queries/equipment-machine-inventory.ts)、[equipment-image-review.ts](../../apps/web/src/lib/equipment-image-review.ts)。

### 3.3 投票摘要：server admin query

| Table | SELECT／條件欄位 |
|---|---|
| gym_accuracy_votes | gym_id, vote, updated_at；登入者票另以 user_id 篩選 |
| gym_accuracy_vote_events | created_at；gym_id 篩選 |
| gyms | data_accuracy_status, data_accuracy_flagged_at；id 篩選 |
| users | id；firebase_uid 篩選，僅登入者 |

後端輸出 likeCount、dislikeCount、totalVotes、lastVoteAt、userVote、dataAccuracyStatus、dataAccuracyFlaggedAt。users、vote_events 同逐票 user_id 唔公開畀 API 角色。

來源：[gym-accuracy.ts](../../apps/web/src/lib/db/queries/gym-accuracy.ts)。

## 4. 連鎖品牌目錄及概覽

| 頁面 | Table／view | SELECT | 條件／排序 |
|---|---|---|---|
| /gym-brands | gyms | slug, district_code, updated_at | is_active, id |
| /gym-brands/[slug] 概覽 | gyms_public | slug, district_code, rack_count, dumbbell_max_weight_kg, treadmill_count, rower_count, has_bathroom, has_changing_room, has_free_water | is_active, slug |

目錄 query 同 sitemap 共用；保留 district_code、updated_at。

來源：[gym-brand-pages.ts](../../apps/web/src/lib/db/queries/gym-brand-pages.ts)。

## 5. 公開貢獻者頁：server admin query

| Table | SELECT |
|---|---|
| users | id, handle, display_name, avatar_url, created_at |
| contributor_stats | approved_submission_count, first_contributor_count, verified_submission_count, accuracy_vote_count |

唔納入 anon／authenticated 原表 GRANT。來源：[contributors.ts](../../apps/web/src/lib/db/queries/contributors.ts)。

## 6. 登入及管理功能界線

- `/submit` 嘅 GYM_SUBMISSION_COLUMNS 取詳情／搜尋欄位中表單需要嘅聯集，排除位置、驗證及準確度狀態等非編輯資料；只查 active gym。
- `/submit` 品牌 prefill 只讀 equipment_brands.slug；唔再同品牌展示共用較闊查詢。
- `/account` 需要登入並用 server admin client 處理本人資料／統計。
- GET `/api/gyms` 同 `/api/gyms/[id]` 有 session + admin 驗證，仍可用 gyms_normalized.*；唔係匿名公開 API。

## 7. DB column-level allowlist

以下係 migration 明確授予 anon、authenticated 嘅欄位；包含必要嘅 filter、排序、FK、RLS helper 依賴，唔代表每次 query 都會傳送全部欄位。

### gyms

`id, name, slug, address, district_code, country_code, postal_code, website_url, instagram_url, contact_phone, lat, lng, size_category, estimated_size_sqft, opening_hours_json, day_pass_price, is_active, is_verified, dumbbell_max_weight_kg, plate_max_weight_kg, equipment_notes, data_source, equipment_last_verified_at, updated_at, name_zh, address_zh, plate_min_weight_kg, data_accuracy_status, has_washroom, has_bathroom, dumbbell_min_weight_kg, has_dry_sauna, has_wet_sauna, has_ice_bath, has_changing_room, has_free_water, is_hyrox_official`

### gyms_public

搜尋及詳情清單嘅聯集，另加 is_active。完整欄位見 migration；所有欄位都有明確 column GRANT，冇 table-level SELECT。

### equipment_types

`code, name_en, name_zh, category, labels, is_active, display_order`

### gym_equipment_type_inventory

`gym_id, equipment_code, is_present, quantity, is_directly_reported`

### equipment_brands

`id, slug, name_en, name_zh, is_active`

### gym_brand_inventory

`gym_id, brand_id`

### gym_accuracy_votes

`gym_id, vote`

### equipment_categories

`slug, name, name_zh, sort_order, is_active`

### equipment

`id, brand_id, status, name, name_zh, slug, labels`

### equipment_aliases

`equipment_id, alias`

### equipment_images

`id, equipment_id, image_role, storage_path, is_primary, sort_order`

### gym_equipment_inventory

`gym_id, equipment_id, quantity, verified_status`

### equipment_type_assignments

`equipment_id, equipment_type_code, is_primary`

equipment.status 額外供 security-invoker helper `gym_type_has_public_models` 使用。RLS 所引用嘅其他 table 欄位（例如 brands.is_active、types.category）亦已保留。

gyms_normalized、equipment_specs 撤走公開存取；其餘 users、submissions、audit、contributors 原表繼續 backend-only。service_role 原有權限保留。

## 8. 驗證及部署

已通過 pnpm test、web typecheck、web lint。本機 SQL 測試覆蓋 anon／authenticated 可讀欄位、隱藏 internal columns、新增 column 預設不可讀、冇 table-wide SELECT／寫入權限、inactive gym RLS、關聯查詢及 service_role 權限。測試 migration 同 fixtures 全部 rollback，唔會改 production。

SQL 回歸測試：[frontend_column_read_access.sql](../../supabase/tests/frontend_column_read_access.sql)，喺已套用 0067 嘅測試 DB 用 psql -v ON_ERROR_STOP=1 執行；測試自身會 rollback fixtures。

部署時需要先準備 migration，再切換 frontend 到 gyms_public。0067 會撤走舊 frontend 對 gyms_normalized 同舊較闊 SELECT 嘅權限，應安排協調切換，避免舊版本仍處理 request 時出現讀取錯誤。正式部署前應以 production schema migration dry-run 核對，唔好直接將 repo 狀態當成已部署。

本次冇改 UI markup／CSS。已用本機資料喺 320px／375px 驗證 `/zh-HK/search`、`/zh-HK/districts/yau-tsim-mong`、定位搜尋、map、split 同 gym 詳情頁；全部 HTTP 200，documentElement／body scrollWidth 冇超過 viewport，列表有正常 gym 結果。瀏覽器測試只臨時建立本機 gyms_public（冇套用權限收窄），完成後已移除；完整 ACL 行為由上述 rollback SQL 測試獨立驗證。仍應喺部署測試環境驗證登入提交表單完整流程。
