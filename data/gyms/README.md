# 香港健身室資料匯入

本目錄存放 `scripts/gyms/import-*.mjs` 產生的資料及人工修正檔。以下指令均在 repository 根目錄執行；先用 `pnpm install` 安裝依賴。

## 快速開始

預設會從來源網站/API 取得資料，轉成 Gymory gym rows 並寫入 JSON，**不會寫入 Supabase**。Dry run 仍會連線及覆寫輸出檔；試跑時可用 `--out` 指定其他位置。

```bash
# 先取少量資料，檢查 JSON
pnpm import:anytime-fitness-hk --limit 2 --out /tmp/anytime-preview.json

# 取得完整資料，寫入預設 baseline
pnpm import:anytime-fitness-hk

# 確認資料及目標環境後，重新取得資料並寫入 Supabase
pnpm import:anytime-fitness-hk --upsert
```

所有 pnpm 指令亦可改用 `node scripts/gyms/import-<名稱>.mjs`，例如 `node scripts/gyms/import-anytime-fitness-hk.mjs --limit 2`。參數值用空格分隔，例如 `--limit 2`。

## Importer 一覽

| pnpm 指令 | 來源 | 預設輸出（相對本目錄） | 自動載入的環境檔 |
| --- | --- | --- | --- |
| `pnpm import:247-fitness-hk` | 24/7 Fitness 香港 API | `247-fitness-hk-baseline.json` | `apps/web/.env.prod` |
| `pnpm import:anytime-fitness-hk` | Anytime Fitness 香港 API | `anytime-fitness-hk-baseline.json` | `apps/web/.env.dev` |
| `pnpm import:efx24-hk` | EFX24 分店網站 | `efx24-hk-baseline.json` | `apps/web/.env.dev` |
| `pnpm import:go24-fitness-hk` | GO24 Fitness 分店網站 | `go24-fitness-hk-baseline.json` | `apps/web/.env.dev` |
| `pnpm import:hyrox-official-hk` | HYROX 官方 partner gym finder | `hyrox-official-hk.json` | `apps/web/.env.dev` |
| `pnpm import:lcsd-fitness-hk` | 康文署健身室網站 | `lcsd-fitness-hk-baseline.json` | `apps/web/.env.prod` |
| `pnpm import:pure-fitness-hk` | PURE Fitness 分店網站 | `pure-fitness-hk-baseline.json` | `apps/web/.env.dev` |
| `pnpm import:snap-fitness-hk` | Snap Fitness 香港 API | `snap-fitness-hk-baseline.json` | `apps/web/.env.dev` |

環境檔路徑及所有 CLI 檔案路徑均相對執行指令時的目錄。環境檔不會覆蓋 shell 已設定的變數；目前沒有 `--env` 參數。

寫入 Supabase 需要 `NEXT_PUBLIC_SUPABASE_URL` 及 `SUPABASE_SECRET_KEY`。使用 `--upsert`、`--upsert-file` 或 HYROX `--repair-stale` 前，確認它們指向預期環境，尤其是預設讀取 `.env.prod` 的 24/7 及 LCSD。

## 參數

| 參數 | 用途 | 支援的 importer |
| --- | --- | --- |
| `--out <path>` | 指定轉換後 gym rows 的 JSON 輸出位置 | 全部 |
| `--upsert-file <path>` | 直接讀取已轉換的 gym rows JSON 並寫入 Supabase，獨立使用 | 全部 |
| `--upsert` | 寫出 JSON 後新增／更新 Supabase 資料 | 全部 |
| `--details-file <path>` | 從來源 detail JSON 陣列讀取資料，取代網站/API 抓取 | 全部 |
| `--limit <n>` | 只處理前 n 個來源項目，試跑時使用正整數 | 除 HYROX 外全部 |
| `--details-out <path>` | 另存轉換前的 detail snapshot，供重跑 | 除 24/7、HYROX 外全部 |
| `--district-overrides <path>` | 讀取人工指定地區的 JSON | 除 HYROX 外全部 |
| `--skip-geocode` | 跳過 Mapbox 地址座標查詢 | EFX24、GO24、LCSD、PURE |
| `--browser` | 使用本機 Google Chrome 開啟來源頁面 | EFX24、GO24 |
| `--browser-profile <path>` | 指定 browser mode 的專用 Chrome profile | EFX24、GO24 |
| `--address-overrides <path>` | 修正中文地址 | PURE |
| `--repair-stale` | 清除錯配的 HYROX metadata，會修改資料庫 | HYROX |

各 importer 支援的參數不同，請按上表使用；部分 script 不會拒絕無效參數，但亦不會套用它們。

## 直接由 gym JSON 寫入 Supabase

全部八個 importer 都支援 `--upsert-file <path>`。此模式單獨使用便會寫入資料庫，不需要加 `--upsert`；不會抓來源網站、呼叫 Mapbox、重新轉換資料或覆寫 JSON。請先檢查檔案內容及目標環境。

```bash
pnpm import:247-fitness-hk --upsert-file data/gyms/247-fitness-hk-baseline.json
pnpm import:anytime-fitness-hk --upsert-file data/gyms/anytime-fitness-hk-baseline.json
pnpm import:efx24-hk --upsert-file data/gyms/efx24-hk-baseline.json
pnpm import:go24-fitness-hk --upsert-file data/gyms/go24-fitness-hk-baseline.json
pnpm import:hyrox-official-hk --upsert-file data/gyms/hyrox-official-hk.json
pnpm import:lcsd-fitness-hk --upsert-file data/gyms/lcsd-fitness-hk-baseline.json
pnpm import:pure-fitness-hk --upsert-file data/gyms/pure-fitness-hk-baseline.json
pnpm import:snap-fitness-hk --upsert-file data/gyms/snap-fitness-hk-baseline.json
```

輸入必須是非空的 gym rows JSON 陣列，每筆包含非空 `name`、`slug`、`district_code` 及 `country_code`，地區碼使用 `HK-*`，國家碼為 `HK`，且 slug 不重複。來源 detail snapshot 和 override 檔不能用於此模式。HYROX 另要求有效的官方 partner metadata 及不重複的 partner ID。

此模式不能與其他參數一起使用，包括 `--upsert`、`--details-file`、`--limit`、override、geocoding、browser、`--out` 或 `--repair-stale`，避免已編輯資料被再次轉換。檔案中的時間戳及其他資料直接沿用；寫入仍採用各 importer 原有規則，包括 null 保留、器材 inventory、submission 紀錄及 HYROX 配對規則，並非逐欄強制覆蓋現有 gym。

## 保存來源資料及重跑

Baseline 是轉換後的 gym rows，**不是** `--details-file` 所需的來源 detail 格式。不要把 `*-baseline.json` 當作 detail snapshot 輸入。

```bash
# 保存來源 snapshot 及轉換結果
pnpm import:pure-fitness-hk \
  --details-out /tmp/raw-pure-fitness-hk-details.json \
  --out /tmp/pure-preview.json \
  --skip-geocode

# 使用同一份 snapshot 重跑，無需再抓來源網站
pnpm import:pure-fitness-hk \
  --details-file /tmp/raw-pure-fitness-hk-details.json \
  --out /tmp/pure-replay.json \
  --skip-geocode
```

24/7 及 HYROX 可以讀取相應來源格式的 detail JSON 陣列，但沒有 `--details-out`。使用 `--details-file` 時，EFX24、GO24、LCSD、PURE 仍可能呼叫 Mapbox；如需離線轉換，另加 `--skip-geocode`。

## 地區及中文地址修正

地區 override 是「來源識別碼或 slug → Gymory district code」的 JSON object，例如：

```json
{
  "pure-fitness-kinwick-centre-kin": "HK-CW"
}
```

| Importer | 支援的 key（依優先次序） |
| --- | --- |
| 24/7 | Store ID、slug |
| Anytime | Club number、分店 website URL、slug |
| EFX24 / GO24 | 分店 URL、slug |
| LCSD | 場館 ID、slug |
| PURE | 英文分店 URL、branch code、slug |
| Snap | Location number、Glofox ID、完整分店 URL、slug |

Override 優先於自動推斷。一般 importer 若仍有分店無法判定地區，會報錯；HYROX 沒有地區 override 參數，需要更新 script 的地區推斷規則。

```bash
pnpm import:247-fitness-hk \
  --district-overrides data/gyms/247-fitness-hk-district-overrides.json

pnpm import:pure-fitness-hk \
  --address-overrides data/gyms/pure-fitness-hk-address-overrides.json
```

PURE 中文地址 override 的值必須是只含非空 `address_zh` 的 object：

```json
{
  "pure-fitness-kinwick-centre-kin": {
    "address_zh": "中環蘇豪荷李活道32號建業榮基中心3樓"
  }
}
```

中文地址 key 依 branch code、英文分店 URL、slug 次序查找。兩種 override 可一起使用；本目錄的 override 檔不會自動載入，必須傳入相應參數，dry run 和 upsert 都會套用。

## Mapbox 及 Chrome 模式

EFX24、GO24、LCSD、PURE 有 Mapbox geocoding：優先使用 `MAPBOX_PRIVATE_TOKEN`，其次使用 `NEXT_PUBLIC_MAPBOX_TOKEN`。沒有 token 時跳過查詢；亦可明確傳入 `--skip-geocode`。如遇權限錯誤，使用有 Search/Geocoding 權限的 token，或跳過 geocoding。

EFX24 / GO24 若以 Node fetch 抓取時遇到 CAPTCHA，可手動改用 browser mode（需要本機已安裝 Google Chrome）：

```bash
pnpm import:efx24-hk --browser
pnpm import:go24-fitness-hk --browser

# 自訂專用 profile
pnpm import:efx24-hk --browser --browser-profile .cache/efx24-import-profile
```

預設 profile 分別是 `.cache/efx24-chrome-profile` 和 `.cache/go24-chrome-profile`，不使用個人預設 Chrome profile。如視窗要求驗證，需手動完成；script 不會自動切換 browser mode。

## 寫入資料庫的行為

除 HYROX 外，importer 使用共用 upsert helper，按 `slug` 配對現有 gym：新增時記錄 approved `add_gym` submission；有實質資料變更才更新並記錄 approved `edit_gym_info` submission。匯入的 `null` 不會清除已有值，較短且包含於原地址內的地址亦不會覆蓋較詳細地址。器材欄位透過 normalized inventory RPC 處理，並記錄 `edit_equipment` submission。

詳細規則見 [scripts/gyms/README.md](../../scripts/gyms/README.md)。

HYROX 使用獨立配對及寫入邏輯：找不到可信的現有 gym 才新增，配對成功則只更新 HYROX metadata。

```bash
# 同步官方 HYROX 資料
pnpm import:hyrox-official-hk --upsert

# 修復 partner ID 與來源分店不相容的舊配對，直接寫入資料庫
pnpm import:hyrox-official-hk --repair-stale
```

`--repair-stale` 只清除來源仍有該 partner ID、但配對不相容的 gym 的 HYROX metadata；不會因來源缺少某個 ID 就取消其標記。它會記錄 approved submission，不需要 `--upsert` 才生效。兩個 flag 不要一起使用：同時提供時只會執行 `--upsert` 分支。
