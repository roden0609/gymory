# Other equipment 分類審核

審核日期：2026-10-27（香港）。資料來源：apps/web/.env.local 指向的本機 Supabase，即時只讀查詢 equipment.equipment_type_code = other_equipment。共 295 款。未更改資料庫或程式。

## 結果

- 可用現有類型：111 款
- 缺少合適類型：84 款
- Other 暫時合理：2 款
- 需要核對型號：98 款

這是按現有名稱、型號及受控類型作的分類審核，未逐款查證廠商產品資料。「可用現有類型」是明確名稱對應；其餘不應直接批量改動。完整記錄含 ID，方便後續精確修正。

環境差異：遠端 dev 沒有 other_equipment 類型，亦沒有對應 equipment 記錄；prod 的 REST schema 未提供 equipment 資料表。本報告的 295 款僅代表本機資料。

## 分類規則問題

scripts/equipments/import-247-equipment.mjs 的 equipmentType() 在匹配動作前，會把名稱包含 /、|、and、dual、combo、3-way 的產品直接歸入 Other。因此 Dual Adjustable Pulley、Dual Cable Crossover、BIKE ROSSOPURO | TOUCH、SUPER LEG PRESS 45° DUAL SYSTEM 等被過早排除。

規則亦缺少 elliptical/cross trainer、reverse hyper、rotary torso、glute kickback、seated dip、multi press 等匹配，並無法處理部分大小寫以外的命名變體、連字號和拼字錯誤。收納架及沒有姿勢資訊的 leg curl 被刻意留在 Other；這些情況須新增類型或查證，不能靠放寬字串匹配解決。

## 可用現有類型

| 品牌 | 器材 | 型號 | 建議 | ID |
|---|---|---|---|---|
| XMASTER | 24/7 FITNESS Full Rack |  | rack | 8a2de32e-3014-4164-800e-fae48ec0445f |
| XMASTER | 24/7 FITNESS Half Rack |  | rack | e62a724d-a972-44ab-8f81-3f06244998ab |
| Panatta | Alternate arm extension | 1MTH057 | tricep_extension_machine | 9ba4010f-5e6d-4663-a46f-6dbed7bce4ad |
| Technogym | ARM EXTENSION | MNSP | tricep_extension_machine | bde98f55-598d-44e1-a0f5-eb4901d00678 |
| Life Fitness | Aspire SL Console Cross Trainer |  ASPX-SL  | elliptical_machine | 237393e9-79a9-4caf-ac93-e4a9518ff4aa |
| Assault Fitness | AssaultRunner Pro | AssaultRunner Pro | assault_runner | ec92954b-e473-4a8e-b310-c7a4fb1a148d |
| Panatta | BIKE ROSSOPURO \| TOUCH | 1RPT001 | exercise_bike | 5f5908a2-9c53-4bd8-887c-b899b016bc66 |
| Cybex | Bravo Advanced Cable | 8800 | cable_machine | 8cbd5ba7-13bc-48e3-ae51-20194138e675 |
| Panatta | CLIMBER \| FENIX TOUCH | 1FXT006 | climber | c7bdf3e0-7c74-4644-935f-c00396aef2b4 |
| Life Fitness | CMS Dual Adjustable Pulley | CMDAP | cable_machine | dfbd59ce-801d-4f0a-9694-984de559f212 |
| Concept2 | Country Ski Trainer | Skierg | ski_erg | 8efe7dfa-9887-4b45-8ca0-e90c2607cb90 |
| Cybex | Cybex V Series Cross Trainer with LED Console | CVCT-LED-E | elliptical_machine | fbd1de2a-4348-4198-ad9b-9328ca2f4867 |
| Arsenal | DB/Row Kickback Bench | ALPHA-DBROW | bench | c9031fb1-68e6-40d1-8550-8fbc75f3716c |
| Panatta | Dips press | 1FE038 | dip_machine | 6c54ee6d-5a8b-486d-bf91-476898e76bff |
| Panatta | DIPS PRESS DUAL SYSTEM | 1FW040 | dip_machine | 1dfec0bf-f2ef-4099-ad8d-d7a89a9e1897 |
| Panatta | DUAL ADJUSTABLE PULLEY FULL | 1FE123 | cable_machine | 1f908b32-54fe-4be6-9846-722dbead457a |
| Technogym | Dual Adjustable Pulley Performance | MB436N0 | cable_machine | 62fc8cc2-a51f-4fb2-b28d-c6b0ec9c2f85 |
| FREEMOTION | Dual Cable Crossover | G624 | cable_machine | 4ffb5136-e623-468a-bd58-004e67252dd8 |
| FREEMOTION | Dual Cable Crossover LITE | G424 | cable_machine | 74e851e8-5402-47d6-a609-39c712441948 |
| NEWTECH | Dual Pulley | NT-C-DP | cable_machine | bc84579f-b4cd-4771-ab38-f9604c0b0e35 |
| Panatta | Dual system horizontal leg press | 1FE095 | leg_press_machine | 9927aedd-fb26-4375-8ee3-f6e7653fdaf7 |
| SportsArt | E835 Elliptical | E835 | elliptical_machine | d6d1bc63-3bb7-4a66-8f08-d96a38561eeb |
| SportsArt | E845S Elliptical | E845S | elliptical_machine | af07d0c9-6717-4ed3-8b37-766ec4cd2e77 |
| SportsArt | E875 Elliptical | E875 | elliptical_machine | 2ff06130-1a06-43b3-bd04-fa187f1634d2 |
| Panatta | ELLIPTICAL \| FENIX TOUCH | 1FXT004 | elliptical_machine | 5dfe9e72-b764-4aa7-96d0-5c8491e044cb |
| Precor | Elliptical Fitness Crosstrainer® | EFX635 | elliptical_machine | b335a076-d169-4561-866c-582f01e5dfdc |
| Matrix Fitness | Endurance Climbmill with LED Console | C-ES-LED | climber | 7bf06006-d895-462a-b0b0-d54bc6036032 |
| Matrix Fitness | Endurance ClimbMill with LED Premium Console | C-ES-PLED | climber | d04facd4-d6d4-47ae-b4a1-35935b37b6e8 |
| Matrix Fitness | Endurance Suspension Elliptical with LED Console | E-ES-LED | elliptical_machine | 1ec17798-4c9c-45ad-bad8-93d5f0cd53e0 |
| Technogym | EXCITE+ CLIMB | DFEE | climber | 724b267b-4732-4240-851b-7fdb3390005d |
| Hammer Strength | Fixed Pad Glute/Ham Bench | BWGHF | glute_ham_developer | 809aa414-5221-4c36-84ca-188f964fe131 |
| Life Fitness | Flexibility Trainer | LBR-FS | stretching_machine | 341b590e-38d1-474e-81a3-a89c574a569b |
| SportsArt | G845 Elliptical | G845 | elliptical_machine | 431cbe43-46a9-4486-aa7b-7b098e87ec77 |
| SportsArt | G875 Elliptical | G875 | elliptical_machine | 20bc823c-5745-40ad-b793-60fc94bd0736 |
| XMASTER | GHD | GHD | glute_ham_developer | 4de3e046-51cd-4340-bc0b-aad00e22b8c3 |
| SportsArt | Glute | S955 | glute_extension_machine | 196a0e01-0dc0-4cda-9ed3-84e6d58656ac |
| Life Fitness | Glute | SS-GL（LP）Full | glute_extension_machine | 6accd7dd-5be8-4a96-8e0b-6c82b7577d4b |
| Life Fitness | Glute Bridge |  SS-GLD(SP)Full | hip_thrust_machine | 8737ac21-25e0-485a-93a7-3407e2ebb82c |
| Arsenal | Glute Isolator | M1-GI | glute_extension_machine | b7df2ffc-9fa2-4905-8202-482db30302d8 |
| Hammer Strength | Glute/Ham Bench | BWGH | glute_ham_developer | 182a90bd-4e2e-4572-921d-124c6bc798a9 |
| Panatta | Gluteus machine | 1FE088 | glute_extension_machine | b6b51c3e-51d0-46d9-8ad3-f059ca9f58aa |
| Hammer Strength | HALF-RACK | HDT-HR | rack | 10896415-632d-420b-8ded-21722aaa1da5 |
| Panatta | HORIZONTAL BIKE ROSSOPURO \| TOUCH | 1RPT002 | exercise_bike | 32274903-6b56-4153-aad9-e4ff28cead8d |
| Arsenal | Incline Fly | AR-FLY | chest_fly_machine | b2164c65-9b02-4962-94f0-bc1856bc942c |
| FREEMOTION | Incline Trainer | i10.9b | treadmill | d4cfd468-f2af-473f-8524-9126e73f4a5c |
| Life Fitness | Integrity SE3 HD樓梯機 | Integrity SE3 HD樓梯機 | climber | d9ebab67-c81f-440b-acd4-996aa34a0e22 |
| Life Fitness | Integrity Series Elliptical Cross-Trainer with SL Console | INX-SL | elliptical_machine | 4f060360-0ae8-40f5-be45-3d9c8643752d |
| Hammer Strength | Iso-Lateral Wide Chest | ILWC | iso_lateral_chest_press_machine | e668c26e-afb8-43e4-be27-2ca4eec5a430 |
| Hammer Strength | Iso-Lateral Wide Pull Down | ILWPD | lat_pulldown_machine | d78bd6c7-5f30-4a9d-8700-44cf9e961f84 |
| Booty Builder | KickBack | BB-KB | glute_extension_machine | a5512274-5df2-43f2-81fd-f857d52948ee |
| Life Fitness | LF PWR PLAY ADJUSTABLE 2:1 CABLE | LPP-AC | cable_machine | 0593a64d-af82-4d47-9a20-a13d13f655a0 |
| Life Fitness | LF PWR PLAY DUAL CABLE PULLDOWN | LPP-DP | lat_pulldown_cable | 316a996e-b8af-4981-9106-1483dab19a45 |
| Life Fitness | LF PWR PLAY DUAL CABLE ROW | LPP-DR | seated_row_cable | 98123135-5518-4866-8ba0-7f50c5910a64 |
| Life Fitness | Life Fitness Activate Series Elliptical Cross-Trainer | OSX | elliptical_machine | 79e0cfa2-16c7-482a-9d9a-3a7e2931e718 |
| Life Fitness | Life Fitness Axiom Series Leg Press (w/Full Shroud) | OP-LP-FS | leg_press_machine | 0420e88d-03f8-49b2-8e83-b4230e30ddf5 |
| Life Fitness | Life Fitness Powermill with SL Console | INP-SL | climber | 1808fd40-3f1b-4614-9fed-c543fbb5759e |
| Life Fitness | Life Fitness Signature Series MJ Station-Adjustable Cable... | MJAXO | cable_machine | 81b5b8d5-6d01-4a2f-8128-40d1b65cd4c5 |
| Life Fitness | Life Fitness Signature Series MJ Station-Dual Pulley Row | MJRWD | seated_row_cable | 6a55f16f-eced-4dec-ac87-fc57b263f682 |
| Life Fitness | Life Fitness Signature Series MJ Station-Dual Pulley... | MJLPD | lat_pulldown_cable | 8e930211-8124-4d26-93ce-490d85f0c2e9 |
| NEWTECH | Linear T-barrow | NT-T-LTB | t_bar_row_machine | a1608f13-5114-4109-afc8-d5f364aed4ee |
| Panatta | Master gluteus plus | 1FE094A | glute_extension_machine | 21d6f7b0-61e7-4dbb-84ed-fae75dfaa6e9 |
| Panatta | MULTI HIP | 1SC090 | multi_hip_machine | e4d47b7b-641f-4475-8e65-ad3674b6ae33 |
| Panatta | MULTI PRESS | 1SCD030 | multi_press_machine | c115905b-9f55-4737-8ada-6989494d8983 |
| NEWTECH | Multi Pully | NT-C-DPP-2 | cable_machine | c5bb3c95-f099-4853-ab5c-b1651314ea49 |
| SportsArt | Multi-Press | DF-208 | multi_press_machine | aa8c2cb4-0254-4dd3-a79c-15dd358c0998 |
| Panatta | Multipurpose press | 1FE118A | multi_press_machine | d37fe74f-cdc5-4fe6-af78-4720a0e21cfe |
| Nautilus | Nautilus Adjustable Abdominal / Decline Bench | 9NN-B7200 | ab_crunch_bench | 66098590-b2a6-4a74-961c-0e7058e9ddb7 |
| Nautilus | Nautilus Cross-Over Cables with Adj Pulleys | 9NP-M9201 | cable_machine | b041457a-85c3-4e70-a37d-afd64505e77b |
| Nautilus | Nautilus Impact Deltoid Fly | 9NA-S4304 | reverse_fly_machine | 0abf6a1b-347c-4a34-946f-3ddd23d5f23a |
| Nautilus | Nautilus Impact Deltoid Raise | 9NA-S4302 | lateral_raise_machine | 767187b3-150d-4c14-97e5-4132afaed806 |
| Nautilus | Nautilus Impact Dip Machine | 9NA-S5303 | dip_machine | b7947c64-a389-48b7-bff2-3055aa7ddaf1 |
| Nautilus | Nautilus Impact Seated Leg Curl W/O ROM | 9NA-S1314 | seated_leg_curl_machine | cc5376ca-2450-45ac-bea8-76b68b9f62f0 |
| Nautilus | Nautilus Inspiration Rotary Torso | 9-IPRT | torso_rotation_machine | 40803473-19d8-48f0-919c-c9d8746a035f |
| Nautilus | Nautilus Inspiration Strength Deltoid Raise | 9-IPDR | lateral_raise_machine | eb4e7e28-b4b5-45bf-a12d-e2572d79848e |
| Nautilus | Nautilus Inspiration Strength Dual Adjustable Pulley | 9NP-D9302 | cable_machine | a48a3251-dbb7-4b40-8d32-f7cfd482de9a |
| Nautilus | Nautilus Inspiration Strength Glute Press | 9-IPGM | glute_extension_machine | 2b6c5d37-f951-4fe7-8c21-600c91d2c8b6 |
| Panatta | OLYMPIC PLATFORM FOR HALF RACK \| 3X3 m | 1PWL302 | platform | 8784ba71-9a0f-40c4-803a-1bd2c41d0ee1 |
| NEWTECH | OnHim Glute Kick-Back | NT-OH-GH | glute_extension_machine | df20e891-7e87-49e5-af96-40624206f2ac |
| NEWTECH | OnHim Rotary Torso | NT-OH-RT | torso_rotation_machine | 3ebbb01b-5616-45db-9208-96864946a4d0 |
| GLUTE BUILDER | Pendulum Kickback (Plate Loaded) | GPL0617 | glute_extension_machine | 605ccded-ca9d-492c-9214-3018abdd01cd |
| Hammer Strength | Plate Loaded Pendulum-X Squat | PL-XSQ | squat_machine | 5b8000b7-b503-4d48-a94b-b745c7701105 |
| Technogym | PULL DOWN | MNVP | lat_pulldown_machine | 46e44466-bc51-4bc0-bb1b-658818671e94 |
| Technogym | Pure Biceps | MG6000-NBGJV0 | bicep_curl_machine | 8d0ebcf4-563b-450a-bb4b-1246e9fc98fb |
| Technogym | Pure Rear Kick | MG4000-NBGJV0 | glute_extension_machine | 64346b03-ea47-4ec6-846d-6000c480ad35 |
| Technogym | Pure Seated Dip | MG5500-NBGJV0 | dip_machine | ce16b1d4-0106-423f-be73-a7ac5388d5d5 |
| NEWTECH | Reverse Hyper | NT-OH-RH | reverse_hyper | 726a6e5b-6526-4813-a134-9495c830bcbd |
| SportsArt | Rotary Torso | P735 | torso_rotation_machine | e79d895b-4e3b-4631-9d1b-17acbd33997d |
| Panatta | RUNNER ROSSOPURO \| TOUCH | 1RPT003 | treadmill | 93ebb1a1-87b9-4954-a73b-12b62ad922a3 |
| Hammer Strength | Seated Biceps | PLBI | bicep_curl_machine | 860478de-acbd-459e-9a96-beb58f8c57d2 |
| NEWTECH | Seated Dip | NT-OH-SD | dip_machine | 167f92c4-7466-4df1-8424-98fb0e0a43d6 |
| Hammer Strength | Seated Dip | PLDIP | dip_machine | 1993f7ba-749c-4ae0-a1e4-05a47fc923dd |
| NEWTECH | Seated Lateal Raise | NT-OH-LR | lateral_raise_machine | 536edffa-65f2-4401-81e1-784ec90e74c0 |
| Technogym | Selection 900 Rotary Torso | MNYP | torso_rotation_machine | 35ac7bd8-b747-4c35-89b4-a0d18db139c5 |
| Panatta | Sissy squat | 1FE231A | squat_machine | 19d7d0c4-0bff-46a1-878c-a6f5732b71f6 |
| NEWTECH | Sit Up | NT-F-SU | ab_crunch_bench | ba320d99-f2f8-49f4-8f1e-1e95ba915f54 |
| STAR TRAC | Star Trac 8TR Commercial Treadmill w/ 22" LED | 9-9324-8TR22-LED | treadmill | c97602e7-0b4a-40ef-91cd-d460d9f05af2 |
| STAR TRAC | Star Trac Rear-Drive Elliptical | 8-RDE | elliptical_machine | f1e858f7-33eb-4bd8-a218-02f743b28787 |
| STAR TRAC | StarTrac 6CT Cross Trainer LCD | 9-6240-6CT-LCD | elliptical_machine | b64e6179-2cf4-4f97-84af-43ccb6d83e03 |
| STAR TRAC | StarTrac 8RDE Rear Drive Elliptical 16IN LED | 9-6180-8RDE-LED | elliptical_machine | 604b52c6-894d-4d1b-8033-c2525be67a88 |
| Panatta | SUPER HORIZONTAL LEG PRESS  DUAL SYSTEM | 1FW100 | leg_press_machine | 3626b04c-c54d-4b3f-9095-f87de61f476f |
| Panatta | SUPER HORIZONTAL MULTI PRESS | 1FW042 | multi_press_machine | f89cc36b-1fa0-4358-9d46-46e1b612ae18 |
| Panatta | SUPER LEG PRESS 45° DUAL SYSTEM | 1FW090 | leg_press_machine | c052af4b-dfd5-4ac6-8928-e0825f6e8479 |
| Panatta | SUPER VERTICAL MULTI PRESS | 1FW045 | multi_press_machine | 4e0ec070-f803-4159-b392-e80ef616593d |
| Panatta | THREE ANGLES BICEPS MACHINE | 1FW451 | bicep_curl_machine | 707079b4-eda5-4f66-8eab-3303220eadba |
| Life Fitness | Torso Rotation | SS-TR（LP）Full | torso_rotation_machine | 0375568a-3030-4c42-9c80-f459412f15a7 |
| NEWTECH | Torture Drop Squat(new) | NT-T-DS | squat_machine | 483d601b-eb88-4d31-957a-e2507902bb30 |
| NEWTECH | Torture Glute Ham | NT-T-GH | glute_ham_developer | 09e19afc-f3c0-42e6-aef1-3c704770fbb9 |
| NEWTECH | Torture Overhead Extension | NT-T-OHE | tricep_extension_machine | 1db33aeb-e1ea-4d5d-9f3f-6dbd397c0dc3 |
| Panatta | TOTAL CORE CRUNCH MACHINE | 1FW065 | ab_crunch_machine | b583bcd8-783e-4abd-b308-3de577cc1e06 |
| NEWTECH | Tri Cable | NT-C-TC | cable_machine | 084c83fe-e201-4d0d-8f0b-da960fb226c0 |
| Hammer Strength | V-Squat | PLVSQ | squat_machine | 479170fc-6a08-4d2c-a0d7-3ca433f24a89 |

## 缺少合適類型

| 品牌 | 器材 | 型號 | 建議 | ID |
|---|---|---|---|---|
| NEWTECH | 14-Pair Dumbbell Rack | NT-F-DBR | 建議新增 storage_rack / weight_tree | 2a5e8ba4-21ae-47eb-8601-f9bbcda962b0 |
| Hammer Strength | 4-Way Neck | PL4W | 頸部／握力／聳肩／脛前肌專用類型 | 776e1ab9-e9e1-4a39-bfa2-e9b2593ca483 |
| SportsArt | A994 VKR Chin Dip | A994 | 建議新增 pull_up_dip_station / leg_raise_station | a22329ed-0d0a-44f5-8ee3-57b87bf2dfd9 |
| SportsArt | Abdominal Crunch/ Back Extention | DF206 | 建議新增 abdominal_back_extension_machine | 9543b72d-04f0-4f5a-a078-6d2a4c45b262 |
| Panatta | ADDUCTOR/ ABDUCTOR MACHINE | 1FE093 | 建議新增 hip_abductor_adductor_machine | 52b6dcc5-fb2c-493a-91cc-4383462d1a2e |
| Panatta | ALTERNATE LEG CURLING | 1FW082 | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | bcf483ec-a2dc-446b-8cad-fb80f910770a |
| Hammer Strength | Assist Dip Chin | HS-ADC | 建議新增 assisted_pull_up_dip_machine | 9b64be04-3178-4f3e-844c-d1b0e684fe72 |
| Life Fitness | Assist Dip Chin | SS-ADC（LP）Full | 建議新增 assisted_pull_up_dip_machine | 11bae45d-2e13-4813-a595-b494760fa39f |
| SportsArt | Assisted Chin/ Dip | DF-207 | 建議新增 assisted_pull_up_dip_machine | 1a1fa4ba-ba0c-4ec9-a31b-f486a31937b7 |
| Life Fitness | Axiom Series Biceps / Triceps (w/Full Shroud) | OP-BT-FS | 建議新增 biceps_triceps_machine | fa5054c9-ca58-422b-9bed-6415d87a6d38 |
| Life Fitness | Axiom Series Dual Bicep/Tricep | PH-OPBT | 建議新增 biceps_triceps_machine | 54902419-5de6-460d-9fcf-a09c221a5ee1 |
| Life Fitness | Axiom Series Dual Leg Extension/Curl | PH-OPLCE | 建議新增 leg_extension_curl_machine | 56ed707c-c3c5-4efb-b5d8-152563845efa |
| Life Fitness | Axiom Series Dual Seated Leg Extension/Curl | PH-OPSLCE | 建議新增 leg_extension_curl_machine | 171ddc96-df3f-4dc5-b97d-78c06fabccfd |
| Life Fitness | Axiom Series Pec Fly and Rear Delt (w/Full Shroud) | OP-FLY-FS | 建議新增 pec_fly_rear_delt_machine | 1101a5d5-6182-49ff-8d4b-0a6edc9decf8 |
| Life Fitness | Axiom Series Seated Leg Curl/Extension (w/Full Shroud) | OP-SLCE-FS | 建議新增 leg_extension_curl_machine | 2d0d87d6-d7dd-4a52-a744-1887b206340f |
| Panatta | BARBELL RACK DOUBLE SIDED | 1FE254 | 建議新增 storage_rack / weight_tree | cf4cdc72-17b0-4774-b164-a2feb35fea93 |
| SportsArt | Biceps Curl/ Triceps Extention | DF-205 | 建議新增 biceps_triceps_machine | 0b6063ea-cafc-4edf-8c7c-1cb436d36288 |
| Panatta | Chin and dip | 1FE211 | 建議新增 pull_up_dip_station / leg_raise_station | dfadbb2a-9d5b-482f-ae8b-5e7f5212f9b5 |
| Panatta | CHIN AND DIP (CHIN OPTIONAL) | 1SC211 | 建議新增 pull_up_dip_station / leg_raise_station | ef21c207-4d20-48e4-b212-50a2bb1ca33d |
| Panatta | CHIN AND DIP COUNTERBALANCED | 1FE121 | 建議新增 assisted_pull_up_dip_machine | a7ec6085-631d-4cf0-ad8d-a54816cd294c |
| NEWTECH | Chin-Up, Dip Assist (THOMSON) | 5 NT-OH-CDA | 建議新增 assisted_pull_up_dip_machine | 4b71c1b6-ce08-4cf4-93a5-1525e0f27bb0 |
| Hammer Strength | Chin/Dip/Leg Raise | BWCDL | 建議新增 pull_up_dip_station / leg_raise_station | 33c617f2-3f62-443e-b7a8-0c3a77f34ef9 |
| NEWTECH | Dip & Leg Raise | NT-F-DLR | 建議新增 pull_up_dip_station / leg_raise_station | c7831038-1edb-4671-95e5-27fc8edfefb7 |
| NEWTECH | Discus Rack | NT-F-DR | 建議新增 storage_rack / weight_tree | 800a1414-acfc-471b-ae57-616ee610e6bf |
| Panatta | DISK RACK | 1FE252 | 建議新增 storage_rack / weight_tree | 0f83b7d7-be68-49c7-ad8b-f6f118e6a16f |
| SportsArt | Double-layer professional dumbbell rack | A901 | 建議新增 storage_rack / weight_tree | 2e4c13ff-2d15-4545-80d4-65260de8ad7f |
| Panatta | DUAL ABDOMINAL \| LOWER BACK | 1SCD060 | 建議新增 abdominal_back_extension_machine | 479cc748-3418-441e-be11-d2594e292ca7 |
| Panatta | DUAL CURLING \| TRICEPS MACHINE | 1SCD050 | 建議新增 biceps_triceps_machine | 7f01ff8c-78a0-48ba-9776-4379f05d1d6c |
| Panatta | DUAL LEG EXTENSION \| SEATED  LEG CURLING | 1SCD080 | 建議新增 leg_extension_curl_machine | c3d1f8d2-6c23-4f89-9434-3afc47259020 |
| FORWARD | DUMBBELL RACK | FWF-013-1 | 建議新增 storage_rack / weight_tree | 9a1f0e03-8688-4308-8305-46a0b2e4ea82 |
| SportsArt | EF202 Abductor/Adductor | DF202 | 建議新增 hip_abductor_adductor_machine | 3edb5151-2d4d-4842-b5c9-2ce31f762b93 |
| Hammer Strength | Fixed Barbell Rack | FWBAR | 建議新增 storage_rack / weight_tree | 26d9ac87-10ce-4690-af78-cd23f47f7c1c |
| NEWTECH | Fixed Barbell Rack | NT-F-FBR | 建議新增 storage_rack / weight_tree | 664003fc-4cf6-4c1d-ab22-3b7ef00ea7f0 |
| Hammer Strength | Glute Ham / Reverse Hyper Combo | PL-GHRH | 建議新增 glute_ham_reverse_hyper_machine | 7993ac15-3651-4ba4-9e5f-a9d8789b43af |
| Hammer Strength | Grip Strength Trainer | PLGRIP | 頸部／握力／聳肩／脛前肌專用類型 | c57271ad-85d0-4272-b084-f7a073a2c818 |
| NEWTECH | Handle Rack Pro | NT-F-HDR-P | 建議新增 storage_rack / weight_tree | c1cd7023-2a12-443e-86e5-2f2871243644 |
| Life Fitness | Hip Abduction/Adduction | SS-HAA（LP）Full | 建議新增 hip_abductor_adductor_machine | b275f341-44e5-4446-ac1b-952ff305a162 |
| NEWTECH | Hip Add/Abd Combo | NT-OH-ADDABD | 建議新增 hip_abductor_adductor_machine | 41d60a60-3535-4a2e-9dec-c52663229ad6 |
| FREEMOTION | Inner / Outer Thigh | ES809 | 建議新增 hip_abductor_adductor_machine | 92a7893c-8d42-4a11-a0ba-188247f26038 |
| Arsenal | Inner Outer Thigh | M1-IOT | 建議新增 hip_abductor_adductor_machine | d110fb9f-6730-4a50-8fc1-ac82cd20fee4 |
| Nautilus | INSTINCT® DUAL INNER/OUTER THIGH | 9NL-d1015 | 建議新增 hip_abductor_adductor_machine | 71d5368e-4544-4793-8e51-64b83722a9ea |
| Hammer Strength | Iso-Lateral Kneeling Leg Curl | ILKLC | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | 7615738e-8549-4826-8df6-e78dda9f2c48 |
| Technogym | Kneeling Easy Chin Dip |  | 建議新增 assisted_pull_up_dip_machine | f8ec8880-9195-4a3d-a1cf-2fa25888dce9 |
| Panatta | KNEELING LEG CURLING | 1FW094 | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | eea295bc-e0a3-4eae-b2f6-8bcefbcb0b02 |
| SportsArt | Leg Extention/ Leg Curl | DF-200 | 建議新增 leg_extension_curl_machine | 2b25af17-267e-460b-90a3-251a5091d91d |
| Life Fitness | LF PWR PLAY ASSIST DIP CHIN | LPP-DC | 建議新增 assisted_pull_up_dip_machine | aa43053e-9e99-4934-a55c-dac4cff901cc |
| Life Fitness | LF PWR PLAY CABLE STATION HANDLE STORAGE | LPP-HR | 建議新增 storage_rack / weight_tree | bc674a0f-e4d8-4eb7-92b9-eeac17aa77b2 |
| Life Fitness | Life Fitness Signature Series Barbell Rack | SBR | 建議新增 storage_rack / weight_tree | bd80aa93-817a-46dc-8de7-52610b5e6670 |
| Life Fitness | Life Fitness Signature Series MJ Handle / Accessory Rack | MJHAR | 建議新增 storage_rack / weight_tree | aceb201a-8c55-40f1-89f1-81572ba7241d |
| Life Fitness | Life Fitness Signature Series MJ Station-Assist Dip Chin | MJADC | 建議新增 assisted_pull_up_dip_machine | fa3a990a-43a4-44f0-92e2-b6f62c560988 |
| NEWTECH | Moving Leg Raise | 1 NT-F-MLR | 建議新增 leg_raise_station | f7a9c2f8-a5d0-4796-94a8-3519262c87a7 |
| Hammer Strength | MTS Kneeling Leg Curl | MTSKC | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | 1777a433-10b9-43db-9983-68b4a25eb6da |
| Nautilus | Nautilus 2 Sided Olympic Weight Tree | 9NP-R7512 | 建議新增 storage_rack / weight_tree | 8bd0abb8-2318-4b46-9bc4-2ced28601d9c |
| Nautilus | Nautilus Barbell Rack | 9NP-R8012 | 建議新增 storage_rack / weight_tree | 7c80d804-2065-4d7b-99d9-90de4134f9a0 |
| Nautilus | Nautilus Impact Chin Dip Assist | 9NA-S6334 | 建議新增 assisted_pull_up_dip_machine | 28332dd8-8857-43a7-adfa-e2891d8c2ca7 |
| Nautilus | Nautilus Inspiration Strength Abduction / Adduction | 9-IPAA | 建議新增 hip_abductor_adductor_machine | 3b5580a0-6ffb-4b5e-b2bc-f717719ace89 |
| Nautilus | Nautilus Inspiration Strength Pec Fly / Rear Deltoid | 9-IPPF | 建議新增 pec_fly_rear_delt_machine | 095c2d34-a352-466c-a10a-43a52a06466f |
| Nautilus | Nautilus Leg Raise / Dip | 9NP-B7517 | 建議新增 pull_up_dip_station / leg_raise_station | a7f73b91-5c04-46a9-be86-2ceb22b913fc |
| Nautilus | Nautilus Pull-up / Dip / Leg Raise | 9NP-B7511 | 建議新增 pull_up_dip_station / leg_raise_station | f7780b66-026a-4099-a1a7-f843345e32ec |
| Nautilus | Nautilus Single Dumbbell Rack | 9NP-R8009 | 建議新增 storage_rack / weight_tree | e3409d14-e075-4b3e-a44f-a65910d08928 |
| Nautilus | Nautilus Triple Dumbbell Rack | 9NP-R8023 | 建議新增 storage_rack / weight_tree | 2801f198-67b8-4c37-8c9d-25af8b96df39 |
| Hammer Strength | Olympic Bench Weight Storage | OBWS | 建議新增 storage_rack / weight_tree | 558be24b-5c7c-4b45-8c01-60c1eeaf84e9 |
| Life Fitness | Olympic Weight Tree | Olympic Weight Tree | 建議新增 storage_rack / weight_tree | 789487c2-75cc-4e5b-ba8d-96476b94c42f |
| Life Fitness | OP-DB3SS Optima 3 Tier Dumbbell Rack (10prs/rack) | OP-DB3SS | 建議新增 storage_rack / weight_tree | 70a6c33c-c81c-4f0c-90ff-5fae671f5233 |
| NEWTECH | Pec Dec Fly with Reverse | NT-OH-APFRD | 建議新增 pec_fly_rear_delt_machine | e6a74fc5-a316-416e-8236-cb6e289d5f45 |
| Panatta | Peck back | 1FE117 | 建議新增 pec_fly_rear_delt_machine | ecd11cba-f146-46b6-9da7-6a79d35280a8 |
| SportsArt | Pectoral Fly/ Rear Deltoid | DF-204 | 建議新增 pec_fly_rear_delt_machine | c82a6381-c0d9-4acc-9fda-d1c9f92327c4 |
| Life Fitness | Pectoral Fly/Rear Deltoid | SS-FLY（LP）Full | 建議新增 pec_fly_rear_delt_machine | a85e7c54-c93a-4bb5-a154-249fb03f1ea0 |
| Hammer Strength | Pectoral Fly/Rear Deltoid | HS-FLY | 建議新增 pec_fly_rear_delt_machine | d49fd8d5-3ead-497a-978c-9bf7b32e08c0 |
| Technogym | Pure Standing Leg Curl | MG7000-NBGJV0 | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | 4629cd6f-e0a1-493b-856f-c0aa1adcbb49 |
| Life Fitness | Saddle Dumbbell Rack | LBR-DS | 建議新增 storage_rack / weight_tree | 247772c3-060d-4fd2-b953-80274a52b96c |
| Hammer Strength | Seated/Standing Shrug | PLSH | 頸部／握力／聳肩／脛前肌專用類型 | f3689c37-96e2-4ec8-b2f4-9006951ba26a |
| Life Fitness | Signature Series Leg Raise | SLR（LBR-LR） | 建議新增 leg_raise_station | 27b13f06-21f0-463c-9fae-c3e463978ff4 |
| SKELCORE | Skelcore Classic Reformer - Oak | SK-PL-CC1 | Pilates reformer / spine_corrector / wunda_chair | 95f50482-03be-4713-a068-498c2d1cb134 |
| SKELCORE | Spine Corrector | SK-PL-SC1 | Pilates reformer / spine_corrector / wunda_chair | fbfcd8a6-1550-4914-9e26-bb51039e7683 |
| NEWTECH | Standing Fly Chest & Back | NT-OH-SBF | 建議新增 pec_fly_rear_delt_machine | e8993e55-4fcc-4eee-b19e-e4622987c7de |
| Arsenal | Standing Leg Curl | M1-SLC | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | 282cc254-f0b8-4a24-9699-c25ec793b36b |
| Panatta | STANDING LEG CURLING | 1FE084 | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | e82aaa3d-a22f-4c9c-99ae-c4d5461bbf1d |
| Panatta | SUPER PECK BACK | 1FW117 | 建議新增 pec_fly_rear_delt_machine | e3668be0-832c-40a9-a3ca-ab5562736cca |
| Technogym | Technogym Storage Universal | A0001014 | 建議新增 storage_rack / weight_tree | 4786d556-ac06-438d-a7c2-7011f2dfcf02 |
| Hammer Strength | Tibia Dorsi Flexion | PLTIB | 頸部／握力／聳肩／脛前肌專用類型 | c93fc2f4-35d2-488b-9749-90508698aba3 |
| NEWTECH | Torture Kneeling Leg Curl | NT-T-KLC | 建議新增 standing_leg_curl_machine / kneeling_leg_curl_machine | 72603589-9abb-494e-9ac1-920223c6858d |
| NEWTECH | Torture Peck Deck fly with reverse(new) | NT-T-PFRD | 建議新增 pec_fly_rear_delt_machine | 718c267f-5978-4ab7-8831-b9c6f729a0f7 |
| SKELCORE | Wunda Chair | SK-PL-FX1 | Pilates reformer / spine_corrector / wunda_chair | aadec459-4e6c-4d1c-b44e-81746576fb2a |

## Other 暫時合理

| 品牌 | 器材 | 型號 | 建議 | ID |
|---|---|---|---|---|
| HOWBODY | HOWBODY | - | 身體測量／分析設備 | f9a1a58a-2cfd-4027-b988-7b3db2bdca11 |
| InBody | InBody | - | 身體測量／分析設備 | bac5a3eb-422b-4824-9c42-1dfaffa6d4ad |

## 需要核對型號

| 品牌 | 器材 | 型號 | 建議 | ID |
|---|---|---|---|---|
| StairMaster | 10 Series 10G w/LCD | H-9-5295-10G-LCD | 待確認 | 82985eca-746b-434d-9cad-e83cabd7b0a0 |
| FREEMOTION | 14ft / 4.2m Premium 4.5 | FMDY14XRG | 待確認 | 948d07b2-fca4-46d6-9c2d-cf12485a91c1 |
| Nautilus | 16 Stack Multi Stations | 9NP-M96 | 待確認 | 6eec122d-24cb-4f5d-82ea-37507580749d |
| Nautilus | 32 Stack Multi-Stations |  | 待確認 | 441ae1eb-d356-4b69-8bab-266bebb439c3 |
| GLUTE BUILDER | 45-Degree Hip Extension | GPL0724 | 待確認 | af6daf1f-9f02-47f9-bd90-c4f2e4b24e73 |
| Life Fitness | 4合1MJ | 4合1MJ | 待確認 | f7ddb9a5-08a9-4c94-9e24-a962a79d15e9 |
| StairMaster | 8 Series Freeclimber w/LCD Console | 9-5260-8FC-LCD-60 | 待確認 | 49bb25d2-355c-477d-929b-3e01d09c497e |
| Arsenal | 8 Station Basic Trainer | M1-8BT | 待確認 | dfffa54c-5964-4d62-911c-570d6761bea0 |
| ABS | AB COASTER® CS3000 | ABS1003B - CS3000 | 待確認 | 317f15b9-0a98-4205-93c4-dfd1bc8ad18d |
| Hammer Strength | Abdominal / Oblique Crunch | PLAB | 待確認 | 1bd1e9c3-5a4e-4d95-9b7f-034529084750 |
| ABS | ABSOLO® | ABS1008-01B | 待確認 | f8cbfe02-b6fd-4ca7-bad1-d47a833b560c |
| Precor | Adaptive Motion Trainer® | AMT835 | 待確認 | 7a927181-7d0e-427d-9e3b-8fd5f52f0d8f |
| NEWTECH | Adjustable Low Pulley | NT-OH-ALP | 待確認 | 047d50a3-9315-4b3f-9697-4a3a1b4d33b0 |
| Technogym | Artis Synchro | DBH0 | 待確認 | 5b780632-620e-4c4f-b9ba-aab80071976d |
| Panatta | BACK DELTOIDS | 1FW026 | 待確認 | 566ff1a0-9f3a-4f2e-a0ff-e1c6ea288954 |
| IRONWOD | Bulgarian Split Squat Stand |  | 待確認 | ddf91ca6-b6d9-4989-8bc7-2b4e7cbfcb67 |
| Panatta | Calf machine | 1FE089 | 待確認 | 9a82d919-e975-41f2-a5b7-6086c8ebf5b2 |
| XMASTER | Combo Rack | Combo Rack | 待確認 | 723400c5-091c-43ec-bb99-05a07be3038f |
| Panatta | DORSY BAR | 1HP505 | 待確認 | ce46bc2d-81f4-4351-8b10-73e931bb6579 |
| Eleiko | Eleiko Training combo rack | Eleiko Training combo rack | 待確認 | f0976ce0-e460-45fa-9251-414868a746f3 |
| Technogym | EXCITE+ RECLINE | DFDE | 待確認 | 26924289-8e5d-4fd8-94d6-1ccfd079cf3f |
| Technogym | EXCITE+ SYNCHRO | DF5E | 待確認 | 5c358e12-b1de-41e4-bdb2-84fe1cab6ca3 |
| Technogym | Excite+ Vario | DFFG | 待確認 | 6c6c7b9c-8b50-4868-af9a-85442676083a |
| Panatta | FRONT DORSY BAR | 1FW105 | 待確認 | 33d838c2-a473-47c7-a77a-5ef2ebbb5b03 |
| Hammer Strength | Ground Base Combo Incline | GBCI | 待確認 | ad5190bf-7dd2-418a-9e35-9823f86df1ac |
| Hammer Strength | Ground Base Combo Twist | GBCT | 待確認 | 9ab096a0-f03d-4e20-9415-af9d10c5344a |
| Hammer Strength | Ground Base Jammer | GBJ | 待確認 | 82389a89-99e6-42d1-8a9d-641d5ad009bf |
| Hammer Strength | Ground Base Multi Squat | GB-MSQ | 待確認 | b1f38551-b653-40bc-9872-72c0834bc85c |
| Hammer Strength | Ground Base Squat Lunge | GBSL | 待確認 | 76d19884-40fb-4f84-a811-a0e7927d1f6a |
| Hammer Strength | HD ATHLETIC | HDW-HR-STRD | 待確認 | 4cab8914-71e7-4e52-9697-0f912bbb39c3 |
| Hammer Strength | HD Tread | PT-ST-01 | 待確認 | dabcd578-520f-4eb2-8f83-8e692182c124 |
| THROWDOWN | Hiitmill X | 9-4880 | 待確認 | 61bbb97c-11fd-4332-aa6a-c8d7ae84c208 |
| StairMaster | HIITMill X | 9-4880-KINTP0 | 待確認 | c9c8063b-7303-4442-bfbd-a4bc20fed5a6 |
| Hammer Strength | Hip and Glute | HS-HG | 待確認 | a7106b3f-3e0e-4d15-8afb-2a53527b3ed1 |
| Eleiko | IPF Competition Combo Rack | 3085921-060 | 待確認 | 3d3884e3-810f-4c09-9aba-08f4f2ac7c8f |
| Hammer Strength | Iso-Lateral Chest Back | ILCB | 待確認 | 291edeed-115b-436f-818c-98a0450301e0 |
| Hammer Strength | Iso-Lateral Leg Curl | ILLC | 待確認 | 6e39428b-042b-4159-b6b7-2cbfa0701029 |
| StairMaster | JACOB'S-LADDER 2 | JACOB'S-LADDER 2 | 待確認 | 63c3efad-f4c1-4749-8089-fb0f1bc4c80f |
| Panatta | JUNGLE MACHINE | 1SC115 | 待確認 | 15fb5d53-daa9-4d41-9e34-abc67cf4033f |
| Panatta | JUNGLE MACHINE HLP | 1FE120 | 待確認 | 492cf802-2d4d-4a68-b8b5-47b0b6bb75d5 |
| NEWTECH | Kneeling Hip Raises、 | NT-OH-SHR | 待確認 | 66faeb9b-0aa7-4949-8a18-20c5f3283aab |
| SportsArt | Lat Pull Down/ Mid Row/ Chest Press | DF-203 | 待確認 | d2e0e515-3751-4895-8279-42f3a719b347 |
| Life Fitness | Leg Curl |  SS-LC(SP)Full | 待確認 | 08c699e7-b63d-4fc1-a7c1-7658d806b2b2 |
| Hammer Strength | Leg Curl | HS-LC | 待確認 | 5d08a72c-89db-440e-8b97-d372430a6088 |
| NEWTECH | Leg Curl | 2 NT-OH-LC | 待確認 | e6fd1b44-dda2-4fbf-ac15-672653c55ddc |
| Panatta | LEG CURLING | 1FW182 | 待確認 | c9937b04-fb1f-4a02-a286-10f6d598e2d0 |
| Technogym | LEGCURL | MNIC | 待確認 | fa503058-9807-415d-a9ca-4d932dd6d42a |
| Life Fitness | LF PWR PLAY CORE | LPP-CORE | 待確認 | 29268d78-85d2-4dd7-aff6-25acba6faa63 |
| Life Fitness | Life Fitness Signature Series MJ Core | MJSCOR22510592 | 待確認 | 506ed7dc-7448-47da-a059-ac5e017a6a7c |
| Hammer Strength | Linear Hack Press | PLLHS | 待確認 | 07ca93be-2b84-4e27-bb93-c1ee793cd8ce |
| NEWTECH | Multi Gym Pro (8Station) | NT-C-MP8ST | 待確認 | c3631ebf-bd34-41c1-a92a-bcbf6caac4fe |
| GLUTE BUILDER | Multi-Function Deadlift Trainer | GPL0551 | 待確認 | ee481f42-e605-4008-8e6c-e889af20fae0 |
| Life Fitness | MULTI-JUNGLE MJ8 |  | 待確認 | 618ce86a-77fb-4d25-b2bb-7f85173fea11 |
| Arsenal | Multiflex | AR-MTFX | 待確認 | 0ee9a1f4-a893-4e9d-94d7-26dce11fc343 |
| KAYAKPRO | Multistroke Ergometer 龍舟 | D1X | 待確認 | 6b8f0492-0062-4dcc-ba1a-df2cb3fff070 |
| Life Fitness | Mutil Junction-16 Stack | Adj-16 | 待確認 | 8d6a75e1-3166-4b07-aed1-b026af9fc4d1 |
| Nautilus | Nautilus 14 Station | 9NP-M9620 | 待確認 | b1224db2-c4f6-4eb6-8707-f72bfce39885 |
| Nautilus | Nautilus 4 Station | 9NP-M9601 | 待確認 | 64f67a8e-18f1-4389-b7e9-a58ce179f98e |
| Nautilus | Nautilus 5 Station with Adj Pulley | 9NP-M9605 | 待確認 | 76e73932-e7b9-4652-951f-600fd68409ec |
| Nautilus | Nautilus Freedom Rack | 9NP-L8507 | 待確認 | f36e37e6-0709-4ec0-bad7-3addcb15e3f4 |
| Nautilus | Nautilus HumanSport Freedom Trainer | 9-HSFT | 待確認 | 7f0c6411-5d21-4d80-910d-0e7972d828c4 |
| Nautilus | Nautilus HumanSport Pull Lift | 9-HSPL | 待確認 | 6757bac6-7fdb-4314-8292-cc4b8dbea407 |
| Nautilus | Nautilus Impact Leg Curl | 9NA-S1301 | 待確認 | 05023ba0-ca86-452e-98d4-e0d0afc0f05d |
| Nautilus | Nautilus Inspiration Strength Leg Curl | 9-IPLC | 待確認 | ac4bf5e5-c1db-407a-bab5-866185f41164 |
| Nautilus | Nautilus Inspiration Strength Tricep Press | 9-IPTD | 待確認 | 43023a45-3546-4532-8eb0-2b3259fd693b |
| Nautilus | Nautilus Plate Loaded Tilt Seat Calf | 9NP-L1110 | 待確認 | 69213cbe-0340-4d46-ac60-4eea0425c836 |
| ROGERS | Pendulum Performance 3-Way Row |  | 待確認 | eca32084-0455-4a00-88fa-2ab469792cf8 |
| Matrix Fitness | Performance Ascent Trainer with LED Premium Console | A-PS-PLED | 待確認 | 331236a1-a47b-4015-9eba-bec970903b3b |
| Hammer Strength | PLATE LOADED ASSISTED NORDIC HAM | PL-ANH | 待確認 | 45fcbc08-7e70-4ac9-961e-b6f6b80d767a |
| Hammer Strength | PLATE LOADED SUPER SQUAT PRESS | PL-SSP | 待確認 | 9b3c7116-7a44-4975-8209-6212d60f25fd |
| Panatta | POWER SMITH DUAL SYSTEM UPPER | 1FW122 | 待確認 | 1038d14b-ad76-49de-8d80-da7014f2973d |
| Panatta | POWER SMITH MACHINE DUAL SYSTEM | 1HP121 | 待確認 | c9b31f7c-86ce-4e91-b895-b5a1cdb201d5 |
| Technogym | PULLEY | MNWP | 待確認 | b5927856-a845-49c6-b7db-eb12857d7652 |
| Technogym | Pure Deadlift | MG87 | 待確認 | a9dc72b9-640c-4e5b-a4be-e7297df0bcf8 |
| NEWTECH | R Low Cable | NT-OH-VR | 待確認 | ab75c050-0ca8-4b74-bd9f-73aec2a4ef23 |
| Arsenal | RELOADED MULTI FLEX | AR-FLEX | 待確認 | 91cdb576-ab3f-4c1d-8930-b01f9ad6d2ff |
| Booty Builder | Reverse Lunge | BB-RSL | 待確認 | e20f311f-c5ef-4108-b31a-d266f5d2d440 |
| Technogym | SELECTION700 | MNOC | 待確認 | 9f8be57c-c925-48ec-9e11-f92094ca0c96 |
| SKELCORE | SK-GHDM001 | SK-GHDM001 | 待確認 | 5adf2d6d-d2a8-47a9-bac9-0afc0ea50062 |
| Technogym | Skillmill | DJK0 | 待確認 | d659096e-192c-4cb4-a477-bedeaf93d3dc |
| Booty Builder | Split Squat | BB-SSS | 待確認 | ee5d09f0-7f83-4582-bee9-665cb9d6f039 |
| Panatta | SQUAT LUNGE | 1HP590 | 待確認 | 76898878-dde8-46c4-8d34-ed2ee00987d3 |
| Panatta | SQUAT MACHINE AND CALF | 1FO091 | 待確認 | c03c05c3-78a4-477e-b62a-01c3f82315eb |
| Panatta | Standing Multi Flight | 1FE028 | 待確認 | d6a4a5c8-51ad-43e5-883e-855e316f64f3 |
| Panatta | Standing Total Arms | 1FE055A | 待確認 | ccded809-44e6-4b2b-b192-b2285bf371d8 |
| Life Fitness | SYNERGY360 | SYNERGY360 | 待確認 | 7aac7398-b09e-4a9c-9f79-8bf105f3eb03 |
| ABS | TIREFLIP 180® SYSTEM | ABS4005-02 | 待確認 | 2885b3ae-275f-4c1a-98a4-d2ed8e068767 |
| Panatta | Torsion machine | 1FE066 | 待確認 | 18bb347f-c96b-415e-94a6-0e648c3d5530 |
| NEWTECH | Torture Hack Press (THOMSON) | NT-T-HP | 待確認 | e05951dd-9ce5-4497-a082-740e41f82aed |
| NEWTECH | Torture Squat & Caf Raise(new) | NT-T-SCR | 待確認 | 29d852d5-aefc-43c8-b392-e077a9659e48 |
| NEWTECH | Torture Standing & Seated Row Combo (New) | N. T(R)-SSRC | 待確認 | 4a5c24b2-0a8e-4580-b582-0d1693961a53 |
| Panatta | Total Back | 1FE008 | 待確認 | 697d0faf-d2fd-46e9-9b13-0bc3c80e2aac |
| Life Fitness | Triceps Press | SS-TP（LP）Full | 待確認 | e65500bd-53ec-4310-9688-518218f77ae4 |
| Technogym | UPPER BACK | MN1P | 待確認 | e7e09514-475a-4b25-a4fe-e465801f2712 |
| Technogym | VERTICAL TRACTION | MNGC | 待確認 | e5cf18d9-3e2c-49dc-8a60-d5430d581d8e |
| Panatta | VIKING PRESS AND CALF | 1FW029 | 待確認 | 8e92a317-3c05-4417-9b53-48a7f5bc5bbd |
| Cybex | 太空漫步 | CVX600537 | 待確認 | c92810cf-a562-4d6d-aacf-25fa58ed9e30 |
| Hammer Strength | 练习椅 | SUB | 待確認 | 7256f006-e389-4505-a2bf-d83962950590 |
