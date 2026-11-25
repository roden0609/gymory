# Frontend minimum data list

更新日期：2026-11-13

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

### 2.1 gym_search_public：完整 SELECT（0073）

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

搜尋專用 `gym_search_public`（security invoker）只由 `gyms_public` 明確公開欄位同 `gym_accuracy_votes(gym_id, vote)` 聚合組成；唔包含 voter user_id、時間、provenance 或其他私人欄位。新增 view 用 column grants，底層權限不擴大。`GYM_SEARCH_COLUMNS` 保持原有 148 欄，避免將票數加入 submission form。總票數同排序結果仍即時，唔會快取。

0074 將器材 inventory RLS 嘅 derived model 判斷改為批量 `public_gym_model_types()`，只返回已公開 gym_id／equipment_code。函數以固定空 search_path 同明確 joins 檢查 active gym、active model／brand、verified inventory、active assigned type/category 同 primary type/category。保留直接報告資料同 active gym row restrictions；唔返回 equipment source、captured names、manual image URL 或 assignment source。

### 2.2 票數、搜尋選項及條件式關聯

| Table | SELECT | 額外條件／排序用途 |
|---|---|---|
| gym_search_public | 上述 148 欄位 + accuracy_like_count, accuracy_dislike_count, accuracy_total_votes | is_active、estimated_size_sqft 只作 filter；0073 喺 DB 聚合投票，保留底層 RLS |
| equipment_categories | slug, name, name_zh | is_active, sort_order, name；舊 schema fallback 只查 slug, name |
| equipment | id, name；篩選 query 只查 id | slug, name, brand_id |
| equipment_aliases | equipment_id, alias | alias |
| equipment_types | code | category, is_active；有分類條件先查 |
| equipment_type_assignments | equipment_id | equipment_type_code；有分類條件先查 |
| equipment_brands | id | slug；品牌 landing 另用 is_active |
| gym_equipment_inventory | gym_id | equipment_id, verified_status |
| gym_brand_inventory | gym_id | brand_id |

器材選項同品牌摘要以無 request cookies 嘅 anon client 作共用 server cache，重驗間隔 60 秒；只 cache 最終明確公開 props／摘要。後台 catalog edits 會失效 catalog／brand tags，gym model edits 會失效 brand tag；其他寫入／import 依賴時間重驗。Next.js background refresh／refresh error 可繼續供應舊值，因此唔係嚴格 60 秒上限。唔會 cache service-role／登入者私有查詢結果，亦唔會將 restricted names 複製成公開 label。

來源：[equipment-catalog-search.ts](../../apps/web/src/lib/db/queries/equipment-catalog-search.ts)、[equipment-pages.ts](../../apps/web/src/lib/db/queries/equipment-pages.ts)、[equipment-brands.ts](../../apps/web/src/lib/db/queries/equipment-brands.ts)。

## 3. Gym 詳情

### 3.1 gyms_public：明確 SELECT

取代原有 `select("*")`，以 PublicGymDetail 型別表達實際欄位。包含顯示、聯絡連結及 SEO structured data。場館頁首只喺有單次入場價錢時顯示該資料。規模同面積由建議更新表單嘅獨立 projection 讀取，面積亦用於搜尋篩選。

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
threads_url
facebook_url
contact_phone
is_verified
is_hyrox_official
equipment_last_verified_at
updated_at
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

`id, name, slug, address, district_code, country_code, postal_code, website_url, instagram_url, threads_url, facebook_url, contact_phone, lat, lng, size_category, estimated_size_sqft, opening_hours_json, day_pass_price, is_active, is_verified, dumbbell_max_weight_kg, plate_max_weight_kg, equipment_notes, equipment_last_verified_at, updated_at, name_zh, address_zh, plate_min_weight_kg, data_accuracy_status, has_washroom, has_bathroom, dumbbell_min_weight_kg, has_dry_sauna, has_wet_sauna, has_ice_bath, has_changing_room, has_free_water, is_hyrox_official`

### gyms_public

搜尋及詳情清單嘅聯集，另加 is_active。完整欄位見 migration；所有欄位都有明確 column GRANT，冇 table-level SELECT。

Migration `0084` 為 `gyms` 同 `gyms_public` 增加 `threads_url`、`facebook_url` 嘅欄位 SELECT 權限。詳情頁用 IG、Threads 同 Facebook 連結顯示聯絡按鈕及 structured data。搜尋、分店品牌頁同提交表單嘅 projections 維持原有欄位。分店可見性繼續由 `gyms` RLS 控制。

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

公開 gym 詳情頁不顯示或查詢 `data_source`。Migration `0068` 撤銷 `PUBLIC`、`anon`、`authenticated` 對 `gyms.data_source` 及 `gyms_public.data_source` 的欄位讀取權限；後台 service-role 存取不變。

## Equipment slug policy（0069）

- `equipment.slug` 由公開 `equipment.name` 及品牌 `slug/name_en/aliases` 生成；只在 backend 使用品牌 aliases，公開查詢毋須增加欄位。
- 品牌以完整 normalized token 識別並去重；同名記錄使用器材 UUID 前 8 位作後綴，碰撞時延長。唔使用 model number 或 restricted source identity。
- 初次 migration 會更新全部現有 slug，同組重複記錄全部加後綴；往後只替新增記錄分配 slug，名稱／品牌修改保持既有 slug。全表 unique index 防止重複。
- 舊 slug 可能包含 restricted source inventory ID，唔複製到公開 aliases；使用舊 slug 嘅搜尋 bookmark 需更新。現有 name／alias 搜尋及按 equipment UUID 關聯不變。
- Helper functions 撤走 PUBLIC／anon／authenticated EXECUTE；不新增公開欄位、view 或 grant。
- Migration 0078 移除展示名稱對擷取名稱嘅 fallback。管理員分別編輯公開展示名、官方名同私有擷取名。擷取名只經已核對管理員身分嘅後台 RPC 寫入，公開資料投影及欄位權限維持原有範圍。
- 0078 清理同私有擷取名相符且未經相同官方名稱確認嘅展示值。英文改用 Equipment 加型號，中文清空。新匯入亦用同一個公開英文預設。現有 slug 維持原值以保留網址；部分 0069 期間建立嘅舊 slug 可能包含當時由擷取名填入展示欄嘅文字，需另行核對同更換。


Migration `0070` 修正 `gyms_public` 的 security-invoker 依賴：保留原有
`data_source` 欄位位置及 text 型別，但內容固定為 NULL，不再引用
`gyms.data_source`。兩者的公開欄位權限仍撤銷；前端不選取此欄位。
這避免 0068 撤權後，連只選 `id/name/slug` 都因底層私有欄位而失敗。
後台繼續透過 `gyms`／`gyms_normalized` 讀取真實來源。權限回歸測試
`supabase/tests/frontend_column_read_access.sql` 必須在 0070 之後執行，
同時驗證公開查詢成功、來源欄位被拒絕及 active-row RLS。


Migration `0071` 新增 security-invoker view `gym_brand_overview_public`，
供品牌 overview 使用，保留 `gyms`／`gym_equipment_type_inventory` 既有 RLS。
回傳只包含 district_code、rack_count、dumbbell_max_weight_kg、treadmill_count、
rower_count、has_bathroom、has_changing_room、has_free_water。
slug／is_active 只用作資料庫篩選，不回傳。View 只聚合 rack／treadmill／rower，
避免一般 gyms_public 聚合所有器材類型的 RLS 成本；不增加共享查詢欄位。
公開角色只獲明確列出的 view 欄位 SELECT，沒有底層新增 grants。
必須先部署 0071，再部署使用此 view 的 application code。


Migration `0072` 把 `gym_type_has_public_models(uuid,text)` 改成固定 search_path
的 security-definer 布林 helper，避免完整搜尋逐項重入 inventory/equipment/
assignment RLS。只回傳公開器材存在與否，不回傳任何原始資料。函式內明確
檢查 active gym、admin/owner verified inventory、active equipment/brand、
active 主分類及其 category，以及 active 查詢分類及其 category。
PUBLIC execute 被撤銷，anon/authenticated/service_role 明確獲准執行。
底層 table/column grants 及 RLS policies 不變；未驗證或停用資料不能透過
這個 helper 推斷為公開存在。回歸測試：public_inventory_visibility.sql。

0077 後，器材分類匹配嘅 gym IDs 放入 `search_gyms` RPC POST body，一次查詢取代每 50 IDs 分批。RPC security invoker、固定 search_path，明確列出既有 `gym_search_public` 公開欄位及衍生 `search_order`；未來 view 新欄不會自動加入輸出，底層 grants／RLS 不變。`p_gym_ids` 為 NULL 代表所有可見 gyms，空陣列不匹配任何 gym。

普通／定位搜尋用 SQL 計算距離、準確度／票數／驗證、更新日期及 slug 排序；PostgREST 套用原有 filters、exact count、order 同 range，僅下載當頁資料。為兼容 PostgREST，backend SELECT 包含 `search_order`，但最終 serializer 逐欄 allowlist，只輸出既有 148 欄及三個 vote counts；排序欄、filter-only is_active／estimated_size_sqft／gym_chain_code 不進入 API／props。0081 為訓練類別使用同一 RPC 嘅四參數版本，喺 SQL 用既有公開欄位做類別配對，再用 PostgREST 做 filters、exact count、排序同分頁。SEO metadata 同列表喺同一個 render 共用篩選後總數，已被標示 noindex 嘅篩選頁可直接產生 metadata。超出頁碼時以第二次 limit 0、只選 id 嘅相同篩選 RPC 恢復總數。

部署訓練類別搜尋前須套用 `0081_paginated_training_collection_search.sql`。SQL 回歸測試 `paginated_gym_search.sql` 驗證 anon／authenticated 結果、排名、分頁、inactive RLS、私人欄位拒讀、未來 view 新欄仍私人、RPC 固定輸出及 service_role 存取。


## 2026-11-13：Gym chain code（0075）

`gyms.gym_chain_code` 係明確批准公開嘅品牌分類：`247`、`anytime`、`efx24`、`go24`、`lcsd`、`pure`、`snap`；獨立／未分類 gym 為 NULL。現有記錄按已公開 slug 前綴回填，唔使用 captured names、provenance 或私人來源欄位。新增 INSERT trigger 為未傳 code 嘅舊 importer／admin insert 補值，明確 code 優先；改 slug 唔會自動改分類。

`gyms_public`、`gym_search_public` 同 `gym_brand_overview_public` 只追加此一欄，維持 security_invoker 同原有欄位身份、column grants、RLS。只增加該欄 SELECT 權限，其他新欄仍預設私人。搜尋品牌用 `gym_chain_code = code` 或 `IN (codes)`；品牌摘要用同一欄 equality。此欄只作 backend filter，唔加入 `GYM_SEARCH_COLUMNS`、卡片 props、品牌摘要 response 或 submission form。對應 URL／checkbox slug 保持不變。

`idx_gyms_active_chain` 係 `gyms(gym_chain_code) WHERE is_active = true` partial index。普通獨立 gym NULL 唔會被任何品牌條件匹配。需先套用 migration 再部署新版 web；未修改 production。

### 私人擷取圖片（0076）

`equipment_captured_images` 全表（包括 `source_url`、`storage_path`）只限 service-role backend；
`PUBLIC`、`anon`、`authenticated` 無表／欄位權限，並啟用 RLS，無 client policies。
`equipment-captured-images` 為 private bucket，Storage restrictive policy 阻擋普通 client 讀寫。
Firebase admin 經 `/api/admin/equipment-captured-images/[id]` 每次驗證後讀取原尺寸圖片；
`?original=1` 同樣驗證後先開來源網址。回應 `private, no-store`，不發出 signed URL。
管理畫面只收到私人圖片 id 同已上傳狀態；公開 queries、views、props 不加入任何私人圖片欄位。
私人圖片不屬於公開 `equipment_images`，不參與公開主圖／fallback 選擇。


### Gym detail navigation and streaming

Gym detail metadata/page share the same explicit `GYM_DETAIL_COLUMNS` read via
React request-scoped cache; no cross-user or persistent server cache is added.
Missing rows remain 404s; read failures throw a generic error for the detail retry UI.
The verified header/structured data can stream before the existing brands, machine
inventory and voting reads finish. Skeletons contain no gym data or new projections.
A single volatile client-side list snapshot retains only the already-public visible
GymSummary rows, loaded page, list identity and scroll position for list/detail Back
navigation. It is not persisted to Storage/sessionStorage or sent to an API; locale,
filters and initial-page content must match before restoration. Database grants,
views and restricted-field boundaries are unchanged.
