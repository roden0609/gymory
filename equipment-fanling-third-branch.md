# 粉嶺第三分店器械讀取紀錄

來源：Android Emulator 內 Equipment Library，Fanling Third Branch；只用 All tab、All Brands、搜尋空白。讀取日期：2026-10-24。

## 方法與覆核範圍

使用 ADB，每次從 (700, 1700) 向上滑至 (700, 1435)，歷時 1500ms，約移動一項器械高度，每步截圖保留約五項重疊。從清單頂連續讀到本店區段末尾 EXCITE+ SYNCHRO，之後為虛線分界及灰色 Nearest Store 項目。分界後再滑動三步，新增的項目均為 Nearest Store，未計入。未掃描整個 Nearest Store 區段至全清單最底。

本店區段共 **38 個列項、32 個不同品牌／名稱組合**。同名重複列項按畫面保留，不代表實體機器數量。結果是 App 本次顯示內容，未與後台資料核對。

逐步截圖保存在 /private/tmp/gymory-adb-before.png、/private/tmp/gymory-adb-after.png，以及 /private/tmp/gymory-equipment-2.png 至 gymory-equipment-38.png。

## 按 All 顯示順序完整記錄本店區段

| 序號 | 品牌 | 畫面名稱 |
| --- | --- | --- |
| 1 | TechnoGym | Technogym Storage Universal |
| 2 | StairMaster | 8 Series Freeclimber w/LCD Console |
| 3 | HAMMER STRENGTH | Smith |
| 4 | HAMMER STRENGTH | Plate-loaded Hack Squat |
| 5 | HAMMER STRENGTH | Linear Leg Press |
| 6 | Life Fitness | Seated Leg Press |
| 7 | Life Fitness | Leg Extension |
| 8 | Life Fitness | Leg Curl |
| 9 | Life Fitness | MULTI-JUNGLE MJ8 |
| 10 | Life Fitness | Pectoral Fly/Rear Deltoid |
| 11 | Life Fitness | Abdominal |
| 12 | Life Fitness | Abdominal |
| 13 | Life Fitness | Lateral Raise |
| 14 | Life Fitness | Shoulder Press |
| 15 | Life Fitness | Hip Abduction/Adduction |
| 16 | Life Fitness | Seated Leg Press |
| 17 | Life Fitness | Leg Curl |
| 18 | Life Fitness | Leg Extension |
| 19 | HAMMER STRENGTH | Ground Base Squat Lunge |
| 20 | HAMMER STRENGTH | Chin/Dip/Leg Raise |
| 21 | HAMMER STRENGTH | Iso-Lateral Kneeling Leg Curl |
| 22 | HAMMER STRENGTH | Seated Calf Raise |
| 23 | HAMMER STRENGTH | Iso-Lateral Shoulder Press |
| 24 | Life Fitness | Mutil Junction-16 Stack |
| 25 | Life Fitness | CMS Dual Adjustable Pulley |
| 26 | Life Fitness | Pectoral Fly/Rear Deltoid |
| 27 | Life Fitness | Chest Press |
| 28 | Life Fitness | Lateral Raise |
| 29 | XMASTER | Multi-Angle Bench Press Rack |
| 30 | IRONWOD | Bulgarian Split Squat Stand |
| 31 | GLUTE BUILDER | 3D Smith Hip Thrust |
| 32 | GLUTE BUILDER | 45-Degree Hip Extension |
| 33 | InBody | InBody |
| 34 | TechnoGym | EXCITE+ CLIMB |
| 35 | TechnoGym | EXCITE+ BIKE |
| 36 | TechnoGym | EXCITE+ RECLINE |
| 37 | TechnoGym | Excite RunProfessional treadmill |
| 38 | TechnoGym | EXCITE+ SYNCHRO |

## 同名重複列項

| 品牌 | 名稱 | 列項數 |
| --- | --- | --- |
| Life Fitness | Seated Leg Press | 2 |
| Life Fitness | Leg Extension | 2 |
| Life Fitness | Leg Curl | 2 |
| Life Fitness | Pectoral Fly/Rear Deltoid | 2 |
| Life Fitness | Abdominal | 2 |
| Life Fitness | Lateral Raise | 2 |

本次比之前 28 款紀錄新增：Iso-Lateral Kneeling Leg Curl、Seated Calf Raise、CMS Dual Adjustable Pulley、InBody。Mutil Junction-16 Stack 按本次畫面拼字保留。
