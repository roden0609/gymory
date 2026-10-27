# 24/7 Fitness Hong Kong branch equipment

Scope: **159 Hong Kong branches** enumerated and reviewed page by page in the Android app's Equipment Library branch selector under **HK / All regions / ALL**. Only equipment assigned to the selected branch under **All / All Brands / an empty search** is included. Gray **Nearest Store** entries are excluded.

## Sources and validation

The initial collection used slow, incremental ADB scrolling and local OCR to enumerate all branches. Complete branch inventories were also read for Ma On Shan, Fanling Third Branch, Ma On Shan Second Branch, Sheung Shui, and Fanling. Public app installation assets subsequently revealed the unauthenticated, read-only endpoints used by the same page:

- `https://www.247fitness.hk/app-api/app-client/store/tree`
- `https://www.247fitness.hk/app-api/app-client/store-equipment-inventory/clentList`

The primary dataset comes from GET requests to these endpoints without user account credentials. Both `storeId` and `club_id` are sent for each branch. Only entries whose `storeId` exactly matches the selected branch are retained. Any other nonempty branch ID causes an error rather than mixing equipment from another branch. Nearest Store entries with an empty `storeId` are excluded.

Equipment follows the app's ordering: entries with courseware first, then ascending `sortOrder`, then descending `createTime`. Entries with the same name but different source IDs are retained. The direct source provides full names and multilingual names without UI truncation or OCR. Names and row counts from the five independently collected UI inventories were also compared in order; results are in `ui-source-validation.json`.

The app requests only `pageNo=1&pageSize=100`, but the endpoint returns the complete array. A separate probe for Fanling Third Branch using `pageNo=2&pageSize=1` returned the same 1,290 inventory/store row identities, rather than limiting the response to 100 entries per page. Of these, 38 entries belonged to that branch, matching the continuous scrolling results exactly.

The public tree contains 162 Hong Kong store records, of which 159 correspond directly to the app's branch selector. The remaining three records—Hong Kong VIP Store, Hong Kong Marketing Department, and Tsuen Wan—are listed under `excluded_not_in_app_selector` in the manifest and are excluded from the selectable app branches.

## Files

- `247-fitness-hk-manifest.json`: source IDs, full names, and progress for the 159 branches, plus store records absent from the app selector.
- `247-fitness-hk/<store-slug>.json`: each branch's equipment in the app's All ordering, including full names, multilingual names, brands, models, categories, cover image URLs, inventory IDs, and source row IDs.
- `progress.json`: counts by status and total row count.
- `collection-errors.json`: branches with collection failures or failed UI comparisons; an empty array indicates no such errors.
- `ui-source-validation.json`: comparisons between the UI and direct source for five branches.
- `ui-validation/`: independent inventories previously collected for those five branches using ADB/OCR.
- `captures/`: original OCR text, bright cards, and screenshot SHA-256 hashes for each UI collection step. Screenshots were temporarily stored in `/private/tmp/gymory-collector`.

Full API responses may contain additional fields. Outputs retain only an allowlist of equipment-related fields and omit unrelated data such as source asset values. Each branch records the request URL, UTC `captured_at`, and response SHA-256 hash.

## Completion statuses and limitations

- `source_api_complete`: the branch's public source inventory was retrieved successfully and passed branch identity checks.
- `empty_in_source`: the endpoint returned no equipment assigned to the branch; **this does not establish that the branch has no physical equipment**.
- `pending` / `needs_review`: collection is incomplete or encountered an error; do not treat it as complete data.

`row_count` counts source entries. `unique_equipment_count` counts distinct normalized brand/name combinations. `unique_inventory_count` counts distinct inventory IDs. None of these counts directly represents physical equipment quantities, and physical counts are not inferred from source rows. The dataset reflects the app source at collection time, has not been checked on site, and is not automatically written to the database.

In the primary dataset, `text_verification: source_api_text` indicates direct source text. The `local_ocr_unreviewed` and `name_truncated` fields in `ui-validation/` describe the earlier UI/OCR collection only; they do not imply the same text limitations in the primary dataset.

## Refreshing data and the fallback UI collector

```sh
python3 scripts/equipments/collect-247-equipment-api.py --workers 3
python3 scripts/equipments/collect-247-equipment.py status
```

The public endpoint collector preserves the branch scope enumerated from the app, retries each branch, and uses GET requests only. Errors are recorded explicitly. Network access and `curl` are required.

The fallback ADB/OCR workflow uses `scripts/equipments/collect-247-equipment.py` and `scripts/equipments/equipment-screen-ocr.swift`. It requires an authorized `emulator-5554` and macOS Vision. Each scroll moves approximately one item height (265 px / 1500 ms), with overlapping views required. Collection stops if the wrong branch is detected or overlap is missing. The primary dataset and fallback UI dataset have separate statuses; review them before using the fallback collector to overwrite primary data.
