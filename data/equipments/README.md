# 24/7 Fitness 香港分店器械

範圍：Android App「Equipment Library」分店選單 **HK / All regions / ALL** 中，逐頁列舉並覆核的 **159 間香港分店**。只收錄 **All / All Brands / 搜尋空白** 時屬於所選分店的器械；灰色 **Nearest Store** 項目不收錄。

## 資料來源與驗證

先用 ADB 慢速逐項滑動及本機 OCR 列舉全部分店，並完整讀取馬鞍山、粉嶺第三分店、馬鞍山第二分店、上水及粉嶺的本店清單。其後在 App 公開安裝資源找到同一頁使用的公開、毋須登入的只讀介面：

- `https://www.247fitness.hk/app-api/app-client/store/tree`
- `https://www.247fitness.hk/app-api/app-client/store-equipment-inventory/clentList`

主資料由上述 GET 介面讀取，未使用使用者帳戶憑證。每間分店同時傳入 `storeId` 及 `club_id`，只保留 `storeId` 正好等於所選分店的列項；其他非空分店 ID 會報錯，不會混入別店器械。`storeId` 為空的 Nearest Store 項目全部排除。

器械按 App 相同規則排序：有 courseware 優先、`sortOrder` 升序、`createTime` 降序。保留同名但不同來源 ID 的列項。直接來源提供未經 UI 截短、亦不經 OCR 的完整名稱及多語名稱。五間已讀取的 UI 清單另外逐序比對名稱及列項數，結果見 `ui-source-validation.json`。

App 只請求 `pageNo=1&pageSize=100`，介面返回的是完整陣列。另以粉嶺第三分店 `pageNo=2&pageSize=1` 探測，返回相同 1,290 個 inventory/store 列項身份，並非每頁只取 100 項。該店其中 38 個本店列項，與連續滑動結果完全吻合。

公開 tree 有 162 個香港 store 記錄；其中 159 個與 App 分店選單一一對應。其餘三個未列於 App 選單，包括「香港VIP門店」、「香港市場部」及「Tsuen Wan」，列在 manifest 的 `excluded_not_in_app_selector`，不冒充 App 可選分店。

## 檔案

- `247-fitness-hk-manifest.json`：159 間分店的來源 ID、完整名稱、進度，以及未列於 App 的 store 記錄。
- `247-fitness-hk/<store-slug>.json`：各店器械，按 App All 順序保存完整名稱、多語名稱、品牌、型號、分類、封面圖片 URL、inventory ID 及來源列項 ID。
- `progress.json`：各狀態數量及總列項數。
- `collection-errors.json`：讀取失敗或未通過 UI 比對的分店；空陣列代表無此類錯誤。
- `ui-source-validation.json`：五間分店的 UI／直接來源核對結果。
- `ui-validation/`：五間分店先前用 ADB/OCR 完成的獨立讀取紀錄。
- `captures/`：上述 UI 讀取每一步的 OCR 原文、亮色卡片及截圖 SHA-256；截圖暫存在 `/private/tmp/gymory-collector`。

完整 API 回應可能含其他欄位；輸出僅保留器械相關白名單欄位，不保存來源資產金額等無關資料。每店記錄請求 URL、UTC `captured_at` 及回應 SHA-256。

## 完成狀態與限制

- `source_api_complete`：該店的公開來源清單成功讀取，並完成分店身份檢查。
- `empty_in_source`：介面未返回該店已指派器械；**不代表實際沒有器械**。
- `pending`／`needs_review`：尚未完成，或遇到錯誤，不能當成完整資料。

`row_count` 為來源列項數；`unique_equipment_count` 為品牌與名稱正規化後的不同組合數；`unique_inventory_count` 為不同 inventory ID 數。均不可直接當成實體器械部數，未根據列項推算實體數量。資料反映本次 App 來源狀態，未作現場查核，亦未自動寫入資料庫。

主資料 `text_verification: source_api_text` 表示直接來源文字。`ui-validation/` 的 `local_ocr_unreviewed` 與 `name_truncated` 僅描述先前 UI/OCR 讀取，不表示主資料有相同文字限制。

## 重讀與備用 UI 收集器

```sh
python3 scripts/equipments/collect-247-equipment-api.py --workers 3
python3 scripts/equipments/collect-247-equipment.py status
```

公開介面收集器保留 App 列舉的分店範圍，逐店重試，所有請求為 GET；錯誤會明確記錄。需要網路存取權限及 `curl`。

ADB/OCR 備用流程使用 `scripts/equipments/collect-247-equipment.py`、`scripts/equipments/equipment-screen-ocr.swift`，需要已授權的 `emulator-5554` 及 macOS Vision。每次約滑動一項高度（265 px / 1500 ms），要求前後畫面重疊；遇到錯店或缺少重疊即停止。主資料與 UI 備用資料的狀態不同，不應在未確認前以備用收集器覆蓋主資料。
