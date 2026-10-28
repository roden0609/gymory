# 24/7 Fitness HK official equipment research

Research date: 2026-10-28 (Hong Kong). All 159 branch JSON files are preserved.

The cross-reference covers all 833 unique inventory IDs. It records manufacturer names and image URLs separately from the original 24/7 data. No database changes or image substitutions were made.

## Interpretation

- `model_verified`: a manufacturer SKU, product title or relevant product description matches the source model. When image checks are enabled, the image URL returns an image content type.
- `model_verified_image_missing` / `model_verified_image_unavailable`: model evidence exists, but the official image is absent or could not be retrieved.
- `name_indexed_image_missing`: exact model/name found in the search index of the manufacturer catalog; direct access and official image remain unverified.
- `candidate_requires_review`: an official candidate exists, but model, generation or configuration is not established.
- `ambiguous_model`: multiple different official products or bundles refer to the source model.
- `unresolved`: no usable match found in this pass; this does not mean the product has no official source.

Images are manufacturer catalog images, not visual confirmation of the physical machine installed in a branch. Colors, upholstery, console configuration and revisions may differ. Image URLs are supplied as research references; no local photo library was downloaded.

## Totals

| Status | Count |
| --- | ---: |
| ambiguous_model | 16 |
| candidate_requires_review | 208 |
| model_verified | 279 |
| name_indexed_image_missing | 155 |
| unresolved | 175 |

## Coverage by brand

| Brand | Total | Model + image | Model, image missing/unavailable | Indexed name only | Candidates / ambiguous | Unresolved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ABS | 4 | 1 | 0 | 0 | 2 | 1 |
| ASSAULT FITNESS | 3 | 1 | 0 | 0 | 1 | 1 |
| Arsenal | 25 | 7 | 0 | 0 | 16 | 2 |
| BOLT FITNESS | 2 | 2 | 0 | 0 | 0 | 0 |
| BOOTY BUILDER | 16 | 0 | 0 | 0 | 11 | 5 |
| Concept 2 | 3 | 0 | 0 | 0 | 2 | 1 |
| Cybex | 14 | 2 | 0 | 0 | 3 | 9 |
| ELEIKO | 5 | 1 | 0 | 0 | 3 | 1 |
| Escape Fitness | 1 | 0 | 0 | 0 | 1 | 0 |
| FORWARD | 2 | 0 | 0 | 0 | 0 | 2 |
| FREEMOTION | 8 | 4 | 0 | 0 | 2 | 2 |
| GLUTE BUILDER | 9 | 8 | 0 | 0 | 1 | 0 |
| HAMMER STRENGTH | 106 | 74 | 0 | 0 | 22 | 10 |
| HOWBODY | 1 | 0 | 0 | 0 | 0 | 1 |
| IRONWOD | 1 | 0 | 0 | 0 | 0 | 1 |
| InBody | 1 | 0 | 0 | 0 | 0 | 1 |
| KAYAKPRO | 1 | 0 | 0 | 0 | 0 | 1 |
| Life Fitness | 112 | 21 | 0 | 0 | 62 | 29 |
| MATRIX | 11 | 0 | 0 | 0 | 6 | 5 |
| NAUTILUS | 74 | 37 | 0 | 0 | 31 | 6 |
| NEWTECH | 93 | 69 | 0 | 0 | 20 | 4 |
| PANATTA | 176 | 0 | 0 | 155 | 7 | 14 |
| PRECOR | 9 | 8 | 0 | 0 | 1 | 0 |
| ROGERS | 3 | 0 | 0 | 0 | 1 | 2 |
| ROGUE | 1 | 0 | 0 | 0 | 1 | 0 |
| Repcon | 1 | 1 | 0 | 0 | 0 | 0 |
| SCHWINN | 1 | 0 | 0 | 0 | 0 | 1 |
| SKELCORE | 5 | 3 | 0 | 0 | 0 | 2 |
| STAR TRAC | 18 | 0 | 0 | 0 | 13 | 5 |
| SportArt | 46 | 39 | 0 | 0 | 6 | 1 |
| StairMaster | 10 | 0 | 0 | 0 | 3 | 7 |
| THROWDOWN | 1 | 1 | 0 | 0 | 0 | 0 |
| TechnoGym | 59 | 0 | 0 | 0 | 3 | 56 |
| Torque Fitness | 1 | 0 | 0 | 0 | 1 | 0 |
| XMASTER | 8 | 0 | 0 | 0 | 3 | 5 |
| ZIVA | 2 | 0 | 0 | 0 | 2 | 0 |

## Known discrepancies requiring care

- NEWTECH `NT-OH-SLC`: the source says Leg Extension; the manufacturer identifies OnHim Seated Leg Curl.
- NEWTECH `NT-T-SDCP`: the source says Seated Incline Chest Press; the manufacturer catalog identifies Torture Chest & Decline Combo.
- A model mention in a kit description does not prove the kit image depicts the standalone component. Such ambiguity is retained.
- Missing models, generic brand-only entries (such as InBody) and custom 24/7 racks cannot be assigned an exact manufacturer image from their names alone.

## Full inventory cross-reference

| Inventory ID | Brand | Source model | Source name | Official name | Status | Official source | Official image | First candidate |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1140 | ABS | ABS1003B - CS3000 | AB COASTER® CS3000 | — | candidate_requires_review | — | — | [Ab Coaster® CS3000](https://theabscompany.com/products/ab-coaster-cs3000) |
| 1141 | ABS | ABS1008-01B | ABSOLO® | — | unresolved | — | — | — |
| 1142 | ABS | ABS4005-02 | TIREFLIP 180® SYSTEM | TireFlip 180® XL System | model_verified | [source](https://theabscompany.com/products/tireflip-180-xl-system) | [image](https://cdn.shopify.com/s/files/1/0554/7792/8041/files/TFXLBundle.png?v=1747404435) | — |
| 1143 | ABS | ABS1014B-X3 | THE ABS BENCH™ X3 | — | candidate_requires_review | — | — | [The Abs Bench™ X3](https://theabscompany.com/products/the-absbench-x3) |
| 1098 | ASSAULT FITNESS | AS-ABPX Bike Pro X | AIR BIKE | — | unresolved | — | — | — |
| 1099 | ASSAULT FITNESS | AssaultRunner Pro | AssaultRunner Pro | AssaultRunner Pro | model_verified | [source](https://shop.assaultfitness.com/treadmills/assault-runner-pro/) | [image](https://shop.assaultfitness.com/_astro/assault_runner_pro_1_2x_61e19690-ea36-4fe3-94af-e7ed669f8d6d.DPCL6yUh_124t1o.webp) | — |
| 1492 | ASSAULT FITNESS | ASSAULT AIRBIKE CLASSIC | ASSAULT AIRBIKE CLASSIC | — | candidate_requires_review | — | — | [AssaultRunner Classic – Assault Fitness](https://shop.assaultfitness.com/treadmills/assault-runner-classic/) |
| 1190 | Arsenal | AR-PNDLM | Pendulum Squat | — | candidate_requires_review | — | — | [RELOADED PENDULUM SQUAT](https://www.myarsenalstrength.com/strength-equipment/reloaded/featured-reloaded/reloaded-pendulum-squat) |
| 1191 | Arsenal | AR-BLP | Bilateral Leg Press | — | candidate_requires_review | — | — | [RELOADED BILATERAL LEG PRESS](https://www.myarsenalstrength.com/strength-equipment/reloaded/lower-body-reloaded/reloaded-bilateral-leg-press) |
| 1192 | Arsenal | AR-HS | Hack Squat | — | candidate_requires_review | — | — | [RELOADED LINEAR HACK SQUAT](https://www.myarsenalstrength.com/strength-equipment/reloaded/lower-body-reloaded/reloaded-linear-hack-squat) |
| 1193 | Arsenal | AR-PS | Power Squat | — | candidate_requires_review | — | — | [RELOADED POWER SQUAT](https://www.myarsenalstrength.com/strength-equipment/reloaded/lower-body-reloaded/reloaded-power-squat/) |
| 1195 | Arsenal | AR-TBAR | T Bar Row | RELOADED T BAR ROW | model_verified | [source](https://www.myarsenalstrength.com/strength-equipment/reloaded/upper-body-reloaded/reloaded-t-bar-row) | [image](https://www.myarsenalstrength.com/hubfs/My_Arsenal_Strength_2022/Hero%20Images/9009-AR-TBAR.png) | — |
| 1196 | Arsenal | AR-LP | Iso Lat Pulldown | — | candidate_requires_review | — | — | [RELOADED ISO LAT PULLDOWN](https://www.myarsenalstrength.com/strength-equipment/reloaded/upper-body-reloaded/reloaded-iso-lat-pulldown) |
| 1197 | Arsenal | AR-LR | Lever Row | — | candidate_requires_review | — | — | [RELOADED LEVER ROW](https://www.myarsenalstrength.com/strength-equipment/reloaded/upper-body-reloaded/reloaded-lever-row) |
| 1198 | Arsenal | AR-CP | Flat Chest Press | — | candidate_requires_review | — | — | [FORGEX CONVERGING CHEST PRESS](https://www.myarsenalstrength.com/forgex-converging-chest-press-arsenal-strength-equipment) |
| 1199 | Arsenal | AR-IP | Incline Chest Press | — | candidate_requires_review | — | — | [FORGEX CONVERGING CHEST PRESS](https://www.myarsenalstrength.com/forgex-converging-chest-press-arsenal-strength-equipment) |
| 1200 | Arsenal | AR-FLY | Incline Fly | — | candidate_requires_review | — | — | [RELOADED INCLINE FLY](https://www.myarsenalstrength.com/strength-equipment/reloaded/featured-reloaded/reloaded-incline-fly/) |
| 1201 | Arsenal | AR-SP | Iso Shoulder Press | — | candidate_requires_review | — | — | [RELOADED ISO CONV SHOULDER PRESS](https://www.myarsenalstrength.com/strength-equipment/reloaded/upper-body-reloaded/reloaded-shoulder-press) |
| 1202 | Arsenal | AR-MR | Multi Row | — | candidate_requires_review | — | — | [RELOADED ISO MULTI ROW](https://www.myarsenalstrength.com/strength-equipment/reloaded/upper-body-reloaded/reloaded-multi-row) |
| 1206 | Arsenal | AR-VCP | Vertical Chest Press | RELOADED VERTICAL CHEST PRESS | model_verified | [source](https://www.myarsenalstrength.com/strength-equipment/reloaded/upper-body-reloaded/reloaded-vertical-chest-press) | [image](https://www.myarsenalstrength.com/hubfs/2026%20Product%20Updates/9010/9010_Hero.png) | — |
| 1208 | Arsenal | M1-8BT | 8 Station Basic Trainer | — | unresolved | — | — | — |
| 1209 | Arsenal | M1-SLR | Standing Lateral Raise | — | candidate_requires_review | — | — | [M-1 SELECTORIZED STANDING LATERAL RAISE](https://www.myarsenalstrength.com/strength-equipment/m-1/featured-m-1/m1-standing-lateral-raise) |
| 1211 | Arsenal | M1-SLC | Standing Leg Curl | M1 SELECTORIZED STANDING LEG CURL | model_verified | [source](https://www.myarsenalstrength.com/strength-equipment/m-1/lower-body-m-1/m1-standing-leg-curl/) | [image](https://www.myarsenalstrength.com/hubfs/My_Arsenal_Strength_2022/Hero%20Images/9001-M1-SLC.png) | — |
| 1218 | Arsenal | M1-GI | Glute Isolator | — | candidate_requires_review | — | — | [M1 SELECTORIZED GLUTE ISOLATOR](https://www.myarsenalstrength.com/strength-equipment/m-1/featured-m-1/m1-glute-isolator/) |
| 1219 | Arsenal | M1-IOT | Inner Outer Thigh | M1 SELECTORIZED INNER/OUTER THIGH | model_verified | [source](https://www.myarsenalstrength.com/strength-equipment/m-1/lower-body-m-1/m1-inner-outer-thigh/) | [image](https://www.myarsenalstrength.com/hubfs/My_Arsenal_Strength_2022/Hero%20Images/9004-M1-IOT.png) | — |
| 1231 | Arsenal | ALPHA-OFB | Olympic Flat Bench | — | candidate_requires_review | — | — | [ALPHA OLYMPIC FLAT BENCH](https://www.myarsenalstrength.com/strength-equipment/alpha/benches-and-storage-alpha/alpha-olympic-flat-bench/) |
| 1232 | Arsenal | ALPHA-CFB | Competition Flat Bench | — | candidate_requires_review | — | — | [ALPHA FLAT BENCH](https://www.myarsenalstrength.com/strength-equipment/alpha/benches-and-storage-alpha/alpha-flat-bench/) |
| 1237 | Arsenal | ALPHA-UB | Fixed Upright Bench | — | candidate_requires_review | — | — | [ALPHA UPRIGHT UTILITY BENCH](https://www.myarsenalstrength.com/strength-equipment/alpha/benches-and-storage-alpha/alpha-fixed-upright-bench/) |
| 1238 | Arsenal | ALPHA-ADB | Adjustable Decline Bench | ALPHA ADJUSTABLE DECLINE BENCH | model_verified | [source](https://www.myarsenalstrength.com/strength-equipment/alpha/benches-and-storage-alpha/alpha-adjustable-decline-bench/) | [image](https://www.myarsenalstrength.com/hubfs/My_Arsenal_Strength_2022/Hero%20Images/9043-ALPHA-ADB.png) | — |
| 1240 | Arsenal | ALPHA-DBROW | DB/Row Kickback Bench | ALPHA DUMBBELL/ROW KICKBACK BENCH | model_verified | [source](https://www.myarsenalstrength.com/strength-equipment/alpha/benches-and-storage-alpha/alpha-db-row-kickback-bench/) | [image](https://www.myarsenalstrength.com/hubfs/My_Arsenal_Strength_2022/Hero%20Images/9044-ALPHA-DBROW.png) | — |
| 1294 | Arsenal | AR-MTFX | Multiflex | — | unresolved | — | — | — |
| 1360 | Arsenal | AR-FLEX | RELOADED MULTI FLEX | RELOADED MULTI FLEX | model_verified | [source](https://www.myarsenalstrength.com/strength-equipment/reloaded/featured-reloaded/reloaded-multi-flex/) | [image](https://www.myarsenalstrength.com/hubfs/My_Arsenal_Strength_2022/Hero%20Images/9063-AR-FLEX.png) | — |
| 1185 | BOLT FITNESS | ATTILA | CLASSIC SERIES ATTILA PLATE LOADED CHEST PRESS | CLASSIC SERIES ATTILA PLATE LOADED CHEST PRESS | model_verified | [source](https://www.boltfitnesssupply.com/products/classic-series-attila-plate-loaded-chest-press) | [image](https://cdn.shopify.com/s/files/1/0561/2214/6950/files/45copy_129ffcd7-9476-4f75-9320-e9807f6d3258.webp?v=1770055334) | — |
| 1186 | BOLT FITNESS | RONIN | ADJUSTABLE BILATERAL PLATE LOADED LAT PULLDOWN | RONIN ADJUSTABLE BILATERAL PLATE LOADED LAT PULLDOWN | model_verified | [source](https://www.boltfitnesssupply.com/products/ronin-adjustable-bilateral-plate-loaded-lat-pulldown) | [image](https://cdn.shopify.com/s/files/1/0561/2214/6950/files/Ronin45.webp?v=1774561927) | — |
| 749 | BOOTY BUILDER | BB-SSS | Split Squat | — | candidate_requires_review | — | — | [Split Squat Programming](https://bootybuilder.com/exercises/split-squat/programming/) |
| 750 | BOOTY BUILDER | BB-SHT | Standing Hip Thrust | — | candidate_requires_review | — | — | [Booty Builder Standing Hip Thrust](https://bootybuilder.com/product/booty-builder-standing-hip-thrust/) |
| 751 | BOOTY BUILDER | BB-SA | Standing Hip Abductor | — | candidate_requires_review | — | — | [Booty Builder Standing Abductor](https://bootybuilder.com/product/booty-builder-standing-abductor/) |
| 752 | BOOTY BUILDER | BB-SADM | Standing Adductor | — | unresolved | — | — | — |
| 753 | BOOTY BUILDER | BB-BS | Belt Squat | — | candidate_requires_review | — | — | [Booty Builder Belt Squat](https://bootybuilder.com/product/booty-builder-belt-squat/) |
| 754 | BOOTY BUILDER | BB-DHP | Hip Press | — | unresolved | — | — | — |
| 755 | BOOTY BUILDER | BB-RSL | Reverse Lunge | — | candidate_requires_review | — | — | [Booty Builder Reverse Lunge Machine](https://bootybuilder.com/product/booty-builder-reverse-lunge-machine/) |
| 756 | BOOTY BUILDER | BB-V4 | Platinum V4 Hip Thrust | — | candidate_requires_review | — | — | [Hip thrust machines](https://bootybuilder.com/product-category/machines/hip-thrust-machines/) |
| 757 | BOOTY BUILDER | BB-HS/VSM | Hack Squat | — | unresolved | — | — | — |
| 758 | BOOTY BUILDER | BB-SHTS/SHM | Standing Hip Thrust | — | candidate_requires_review | — | — | [Booty Builder Standing Hip Thrust](https://bootybuilder.com/product/booty-builder-standing-hip-thrust/) |
| 759 | BOOTY BUILDER | BB-SAS | Standing Abductor | — | candidate_requires_review | — | — | [Booty Builder Standing Abductor](https://bootybuilder.com/product/booty-builder-standing-abductor/) |
| 760 | BOOTY BUILDER | BB-SSADM | Standing Adductor | — | unresolved | — | — | — |
| 761 | BOOTY BUILDER | BB-V8 | Platinum V8 Hip Thrust | — | candidate_requires_review | — | — | [Hip thrust machines](https://bootybuilder.com/product-category/machines/hip-thrust-machines/) |
| 762 | BOOTY BUILDER | BB-BE | Back Extension | — | candidate_requires_review | — | — | [Booty Builder Selectorized Back Extension](https://bootybuilder.com/product/booty-builder-selectorized-back-extension/) |
| 764 | BOOTY BUILDER | BB-S3DMA | 3D Multi-Abductor | — | candidate_requires_review | — | — | [Booty Builder Selectorized 3D Multi-Abductor](https://bootybuilder.com/product/booty-builder-3d-multi-abductor/) |
| 765 | BOOTY BUILDER | BB-KB | KickBack | — | unresolved | — | — | — |
| 1096 | Concept 2 | Skierg | Country Ski Trainer | — | ambiguous_model | — | — | [Concept2 SkiErg Cross-Country Ski Trainer](https://www.concept2.com/ergs/skierg) |
| 1097 | Concept 2 | Rowerg | Row Machine | — | ambiguous_model | — | — | [Dynamic RowErg](https://www.concept2.com/ergs/dynamic-rowerg) |
| 1365 | Concept 2 | CONPII-ROW ERG STANDARD CONCEPT 2 PM 5 INDOOR POWER | CONPII-ROW ERG STANDARD CONCEPT 2 PM 5 INDOOR POWER | — | unresolved | — | — | — |
| 1347 | Cybex | CVTH-LED-E | Cybex V Series Treadmill with LED Console | — | candidate_requires_review | — | — | [V Series Treadmill \| Cybex](https://locator.lifefitness.com/products/treadmills/v-series-treadmill-specs.aspx) |
| 1348 | Cybex | CVCT-LED-E | Cybex V Series Cross Trainer with LED Console | — | unresolved | — | — | — |
| 1349 | Cybex | CVRB-LED-E | Cybex V Series Recumbent Bike with LED Console | — | candidate_requires_review | — | — | [V Series Recumbent Bike](https://www.lifefitness.com/en-us/catalog/cybex/cybex-products/cybex-v-series-recumbent-bike) |
| 1350 | Cybex | CVUB-LED-E | Cybex V Series Upright Bike with LED Console | — | unresolved | — | — | — |
| 1351 | Cybex | 8810 | Cybex Bravo Functional Trainer (tall chin-up) | — | candidate_requires_review | — | — | [Bravo Advanced All-in-One Functional Trainer \| Cybex](https://locator.lifefitness.com/functional-trainer-bravo-specs.aspx) |
| 1352 | Cybex | 16200 | Plate Loaded Hack Squat | Hack Squat Plate Loaded | model_verified | [source](https://www.lifefitness.com/fr-fr/catalog/cybex/cybex-products/hack-squat-plate-loaded-cybex-4c488001845ab790a19100a9639da5ec) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/MediaSync/259-082-plate-loaded-hack-squat-1-1-.png?h=630&w=1200) | — |
| 1353 | Cybex | 8800 | Bravo Advanced Cable | — | unresolved | — | — | — |
| 1354 | Cybex | 16120 | Cybex Plate Loaded Smith Press | Plate Loaded Smith Press | model_verified | [source](https://www.lifefitness.com/en-eu/catalog/cybex/cybex-products/cybex-plate-loaded-smith-press) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/MediaSync/366-03-plate-loaded-smith-press-1-1-.png?h=630&w=1200) | — |
| 1479 | Cybex | CVC | 單車機 | — | unresolved | — | — | — |
| 1480 | Cybex | CVX-TWNXX-2401 | 交叉训练机 | — | unresolved | — | — | — |
| 1481 | Cybex | CVSTRMX | 跑步机 | — | unresolved | — | — | — |
| 1497 | Cybex | CVC500363 | 單車機 | — | unresolved | — | — | — |
| 1498 | Cybex | CVX600537 | 太空漫步 | — | unresolved | — | — | — |
| 1499 | Cybex | CVSTRMX23060011 | 跑步機 | — | unresolved | — | — | — |
| 1179 | ELEIKO | 3085921-060 | IPF Competition Combo Rack | — | candidate_requires_review | — | — | [IPF Competition Combo Rack, Skai Charcoal](https://eleiko.com/en-ca/equipment/benches/competitionbenches/3085921-060-eleiko-ipf-competition-combo-rack-skai-charcoal) |
| 1298 | ELEIKO | 3085550-03 | Eleiko Prestera Power Rack Frame with Insert Platform | — | unresolved | — | — | — |
| 1299 | ELEIKO | 3062962-03 | Eleiko Adjustable Bench | — | candidate_requires_review | — | — | [Adjustable Bench Black/PUR](https://eleiko.com/de/equipment/benches/workoutbenches/3062962-03-eleiko-adjustable-bench-black-pur) |
| 1300 | ELEIKO | 3065208-03 | Eleiko Prestera Squat Rack - Stainless | — | candidate_requires_review | — | — | [Prestera Squat Rack Stainless](https://eleiko.com/de/equipment/racksandrigs/racks/3065208-03-eleiko-prestera-squat-rack-stainless) |
| 1367 | ELEIKO | Eleiko Training combo rack | Eleiko Training combo rack | Training Combo Rack | model_verified | [source](https://eleiko.com/en-us/equipment/racksandrigs/racks/3065459-eleiko-training-combo-rack) | [image](https://media.eleiko.com/images/upload/4x5/3065459_10.jpg) | — |
| 1357 | Escape Fitness | — | Quad Sled | — | candidate_requires_review | — | — | [Quad Sled \| Escape Fitness](https://escapefitness.com/us/quad-sled) |
| 1040 | FORWARD | FWF-013-1 | DUMBBELL RACK | — | unresolved | — | — | — |
| 1041 | FORWARD | FWF-013-2 | DUMBBELL RACK | — | unresolved | — | — | — |
| 449 | FREEMOTION | i22.9 | Incline Trainer | i22.9 INCLINE TRAINER | model_verified | [source](https://home.freemotionfitness.com/incline-trainers/i22-9-incline-trainer) | [image](https://home.freemotionfitness.com/cmsstatic/i22-9-Freemotion-Incline-Trainer_iFit-Powered-1-850x850-c.png) | — |
| 450 | FREEMOTION | i10.9b | Incline Trainer | i10.9b Incline Trainer | model_verified | [source](https://home.freemotionfitness.com/incline-trainers/i109b-incline-trainer) | [image](https://home.freemotionfitness.com/cmsstatic/i10.9b_3Q.png) | — |
| 452 | FREEMOTION | t10.9b | REFLEX Treadmill | t10.9b Reflex™ Treadmill | model_verified | [source](https://home.freemotionfitness.com/treadmills/t109b-treadmill) | [image](https://home.freemotionfitness.com/cmsstatic/t10.9b-Reflex_3Q.png) | — |
| 458 | FREEMOTION | r10.9b | Recumbent Bike | r10.9b Recumbent Bike | model_verified | [source](https://home.freemotionfitness.com/exercise-bikes/r109b-recumbent-bike) | [image](https://home.freemotionfitness.com/cmsstatic/r10.9b-Recumbent_3Q.png) | — |
| 461 | FREEMOTION | G624 | Dual Cable Crossover | — | candidate_requires_review | — | — | [Genesis™ - Dual Cable Cross](https://home.freemotionfitness.com/dual-cable-cross/genesis-dual-cable) |
| 474 | FREEMOTION | G424 | Dual Cable Crossover LITE | — | candidate_requires_review | — | — | [Genesis™ - Dual Cable Cross Lite](https://home.freemotionfitness.com/dual-cable-cross/genesis-lite) |
| 515 | FREEMOTION | FMDY14XRG | 14ft / 4.2m Premium 4.5 | — | unresolved | — | — | — |
| 523 | FREEMOTION | ES809 | Inner / Outer Thigh | — | unresolved | — | — | — |
| 779 | GLUTE BUILDER | GPL0363 | Kneeling Glute Thrust | Kneeling Glute Isolator | model_verified | [source](https://files.precor.com/en-US/strength/glutebuilder/kneeling-glute-isolator) | [image](https://images.ctfassets.net/5bv2a78ngtvd/50mszTsyK5MHys4BN2996k/a70e53b193911d8fd9c5e5214107a84c/GB-Kneeling-Blurred-Background.png) | — |
| 780 | GLUTE BUILDER | GPL0551 | Multi-Function Deadlift Trainer | DEADLIFT ELITE | model_verified | [source](https://www.precor.com/en-US/products/GPL0551) | [image](https://images.ctfassets.net/5bv2a78ngtvd/1if4ra6zdSKTVUlzAdcrCY/c81de3dd6417240b580e32d03112f65b/DeadliftElite2048x1423.png?fm=webp&w=3840&q=70) | — |
| 783 | GLUTE BUILDER | GPL0609 | Pendulum Squat Pro | Pendulum Squat Pro | model_verified | [source](https://files.precor.com/en-US/products/GPL0609) | [image](https://images.ctfassets.net/5bv2a78ngtvd/6bwS5e1vaU5TtpCgNJOBJB/d2aae07d30fd85cde52abc4354aab543/GPL0609.png?fm=webp&w=3840&q=70) | — |
| 784 | GLUTE BUILDER | GPL0612 | 3D Smith Hip Thrust | HIP THRUST ELITE | model_verified | [source](https://www.precor.com/en-US/products/GPL0612) | [image](https://images.ctfassets.net/5bv2a78ngtvd/69Hkpo1z6PHEAAHqFfJXF2/7fe9cbeb7de570844e77e056942f9a8b/Glutebuilder_Hip_Thrust_Elite.png?fm=webp&w=3840&q=70) | — |
| 785 | GLUTE BUILDER | GPL0617 | Pendulum Kickback (Plate Loaded) | PENDULUM KICKBACK | model_verified | [source](https://www.precor.com/en-US/products/GPL0617) | [image](https://images.ctfassets.net/5bv2a78ngtvd/Y06FYn4ZFeLd7ISGSFUu4/1b5531ef102138bf9db8271649f9aa34/PendulumKickBack2048x1423__2_.png?fm=webp&w=3840&q=70) | — |
| 786 | GLUTE BUILDER | GPL0622 | 3D Multi-Angle Hip Abductor | 3D Multi-Abductor | model_verified | [source](https://files.precor.com/en-US/strength/glutebuilder/3d-multi-abductor) | [image](https://images.ctfassets.net/5bv2a78ngtvd/4tn6tWWbvgyB8wE7jv4Q1t/8a134244fbed00c694d60eb693c16ec3/GPL_Abductor_3429_FINAL-1920x1080.png) | — |
| 788 | GLUTE BUILDER | GPL0627 | Glute & Leg Hack Squat | Glute Squat | model_verified | [source](https://www.precor.com/en-US/strength/glutebuilder/glute-squat) | [image](https://images.ctfassets.net/5bv2a78ngtvd/1mLdyEqKhHxb1li6zDCrzg/6ec5738053c8bec1169c1085b11ea441/Glute-Squat.png) | — |
| 789 | GLUTE BUILDER | GPL0724 | 45-Degree Hip Extension | Dual 45 Hip Extension | model_verified | [source](https://files.precor.com/en-US/strength/glutebuilder/dual-45-hip-extension) | [image](https://images.ctfassets.net/5bv2a78ngtvd/6HPYe7k1KRPJe3y8k4ptP2/6399e088c5abc6f51fe7a8c25a22d838/Dual_45_Hip_Extension_333x250.png) | — |
| 792 | GLUTE BUILDER | GSL0622 | 3D Multi-Abductor Pro | — | ambiguous_model | — | — | [Selectorized 3D-Multi Abductor Pro](https://www.precor.com/en-US/products/GSL0622) |
| 2 | HAMMER STRENGTH | HS-ADC | Assist Dip Chin | Hammer Strength Select Assist Dip Chin | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-assist-dip-chin) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-select-dip-chin-machine-charcoal-black-1000x1000.jpg?v=1748945293) | — |
| 3 | HAMMER STRENGTH | HS-BC | Biceps Curl | Hammer Strength Select Biceps Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-biceps-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-selectbiceps-curl-charcoal-black-1000x1000.jpg?v=1748945074) | — |
| 4 | HAMMER STRENGTH | HS-CP | Chest Press | Hammer Strength Select Chest Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-chest-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-selectchest-press-charcoal-black-1000x1000.jpg?v=1748945070) | — |
| 5 | HAMMER STRENGTH | HS-FPD | Fixed Pulldown | Hammer Strength Select Fixed Pulldown | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-fixed-pulldown) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-fixed-pulldown-charcoal-black-1000x1000.jpg?v=1748945069) | — |
| 6 | HAMMER STRENGTH | HS-PD | Lat Pulldown | Hammer Strength Select Lat Pulldown | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-lat-pulldown) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-lat-pulldown-charcoal-black-1000x1000.jpg?v=1748945131) | — |
| 7 | HAMMER STRENGTH | HS-LR | Lateral Raise | Hammer Strength Select Lateral Raise | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-lateral-raise) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-selectlateral-raisebase_charcoalframe_blackuph_1000x1000_392bf7fc-4400-4c3d-b056-b9847b89dacf.jpg?v=1748945066) | — |
| 8 | HAMMER STRENGTH | HS-PEC | Pectoral Fly | Hammer Strength Select Pectoral Fly | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-pectoral-fly) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-selectpectoral-flybase_charcoalframe_blackuph_1000x1000_f03bfdfd-af28-4b12-b79f-cb9089223fd7.jpg?v=1748945077) | — |
| 9 | HAMMER STRENGTH | HS-FLY | Pectoral Fly/Rear Deltoid | Hammer Strength Select Pectoral Fly / Rear Deltoid | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-pectoral-fly-rear-deltoid) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-select-pectoral-fly-rear-deltoid-charcoal-black-1000x1000.jpg?v=1748945069) | — |
| 10 | HAMMER STRENGTH | HS-RW | Seated Row | Hammer Strength Select Seated Row | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-seated-row) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-seated-row-charcoal-black-1000x1000.jpg?v=1746126337) | — |
| 11 | HAMMER STRENGTH | HS-SP | Shoulder Press | Hammer Strength Select Shoulder Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-shoulder-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-shoulder-press-charcoal-black-1000x1000.jpg?v=1748945064) | — |
| 12 | HAMMER STRENGTH | HS-TE | Triceps Extension | Hammer Strength Select Triceps Extension | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-triceps-extension) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-charcoal-black-1000x1000.jpg?v=1748945063) | — |
| 13 | HAMMER STRENGTH | HS-HAB | Hip Abduction | Hammer Strength Select Hip Abduction | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-hip-abduction) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-hip-abduction-charcoal-black-1000x01000.jpg?v=1748945068) | — |
| 14 | HAMMER STRENGTH | HS-HAD | Hip Adduction | Hammer Strength Select Hip Adduction | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-hip-adduction) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-hip-adduction-charcoal-black-1000x01000.jpg?v=1748945067) | — |
| 15 | HAMMER STRENGTH | HS-HG | Hip and Glute | Hammer Strength Select Hip and Glute | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-hip-and-glute) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-selecthip-and-glutebase-charcoal-black-1000x1000.jpg?v=1748945072) | — |
| 17 | HAMMER STRENGTH | HS-LC | Leg Curl | Hammer Strength Select Leg Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-leg-curl-charcoal-black-1000x1000.jpg?v=1746125128) | — |
| 18 | HAMMER STRENGTH | HS-LE | Leg Extension | Hammer Strength Select Leg Extension | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-leg-extension) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-select-leg-extension-charcoal-black-1000x1000.jpg?v=1748945140) | — |
| 19 | HAMMER STRENGTH | HS-SLC | Seated Leg Curl | Hammer Strength Select Seated Leg Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-seated-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-selectseated-leg-curlbase_charcoalframe_blackuph_1000x1000_142fbee1-487a-4f8d-b616-4b5f53d23d8b.jpg?v=1748945139) | — |
| 20 | HAMMER STRENGTH | HS-SLP | Seated Leg Press | Hammer Strength Select Seated Leg Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-seated-leg-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-selectseated-leg-pressbase-black-black-1000x1000.jpg?v=1748945064) | — |
| 21 | HAMMER STRENGTH | HS-SC | Standing Calf | Hammer Strength Select Standing Calf | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-standing-calf) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-select-standing-calf-charcoal-black-1000x1000.jpg?v=1748945065) | — |
| 22 | HAMMER STRENGTH | HS-ABC | Abdominal Crunch | — | candidate_requires_review | — | — | [Select Abdominal Crunch](https://www.lifefitness.com/es-la/equipamientos/fuerza/selectorizado/hammer-strength-select-abdominal-crunch) |
| 23 | HAMMER STRENGTH | HS-BE | Back Extension | Hammer Strength Select Back Extension | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-select-back-extension) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-selectback-extension-charcoal-black-1000x1000.jpg?v=1748945071) | — |
| 24 | HAMMER STRENGTH | PT-ST-01 | HD Tread | Hammer Strength HD Tread | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-hd-tread) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/products/hammer-strength-hd-tread-main-1000x1000.jpg?v=1748945272) | — |
| 26 | HAMMER STRENGTH | PT-AB-01 | HD Airbike | Hammer Strength HD Air Bike | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-hd-air-bike) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/products/hammer-strength-hd-air-bike-1000x1000.jpg?v=1748945270) | — |
| 27 | HAMMER STRENGTH | ILHBP | Iso-Lateral Horizontal Bench Press | Hammer Strength Plate Loaded Iso-Lateral Horizontal Bench Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-horizontal-bench-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/horizontal-bench-charcoal-black-1000x1000.jpg?v=1748945123) | — |
| 28 | HAMMER STRENGTH | ILBPH | Iso-Lateral Bench Press (Horizontal) | — | candidate_requires_review | — | — | [Iso-Lateral Bench Press](https://www.lifefitness.com/en-eu/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-bench-press) |
| 29 | HAMMER STRENGTH | ILBPV | Iso-Lateral Bench Press (Vertical) | — | candidate_requires_review | — | — | [Iso-Lateral Bench Press](https://www.lifefitness.com/en-eu/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-bench-press) |
| 30 | HAMMER STRENGTH | ILWC | Iso-Lateral Wide Chest | Hammer Strength Plate Loaded Iso-Lateral Wide Chest | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-wide-chest) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-iso-lateral-wide-chest-charcoal-black-1000x1000.jpg?v=1748945089) | — |
| 31 | HAMMER STRENGTH | ILIPH | Iso-Lateral Incline Press (Horizontal) | — | candidate_requires_review | — | — | [Iso-Lateral Incline Press](https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-incline-press) |
| 32 | HAMMER STRENGTH | ILFMP | Iso-Lateral Super Incline Press | Hammer Strength Plate Loaded Iso-Lateral Super Incline Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-super-incline-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loadediso-lateral-super-incline-pressbase-charcoal-black.jpg?v=1748945091) | — |
| 33 | HAMMER STRENGTH | ILDCP | Decline Chest Press | Hammer Strength Plate Loaded Iso-Lateral Decline Chest Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-decline-chest-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-decline-bench-charcoal-black-1000x1000.jpg?v=1748945093) | — |
| 34 | HAMMER STRENGTH | ILSP | Iso-Lateral Shoulder Press | Hammer Strength Plate Loaded Iso-Lateral Shoulder Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-shoulder-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loaded-iso-lateral-shoulder-press-charcoal-black-1000x1000.jpg?v=1748945153) | — |
| 35 | HAMMER STRENGTH | ILROW | Iso-Lateral Rowing | — | candidate_requires_review | — | — | [Iso-Lateral Row](https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-row) |
| 36 | HAMMER STRENGTH | ILPD | Iso-Lateral Front Lat Pulldown | Hammer Strength Plate Loaded Iso-Lateral Front Lat Pulldown | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-front-lat-pulldown) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-iso-lateral-front-lat-pulldown-charcoal-black-1000x1000.jpg?v=1748945158) | — |
| 37 | HAMMER STRENGTH | ILHR | Iso-Lateral High Row | Hammer Strength Iso-Lateral High Row | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-iso-lateral-high-row) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loadediso-lateral-high-row-1000x1000.jpg?v=1748945111) | — |
| 38 | HAMMER STRENGTH | ILLR | Iso-Lateral Low Row | Hammer Strength Plate Loaded Iso-Lateral Low Row | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-low-row) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loadediso-lateral-low-rowbase_charcoalframe_blackupholstery_1000x1000_e9b98d8f-ee20-42dc-8804-2e663223b79d.jpg?v=1748945107) | — |
| 39 | HAMMER STRENGTH | ILWPD | Iso-Lateral Wide Pull Down | Hammer Strength Plate Loaded Iso-Lateral Wide Pulldown | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-wide-pulldown) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/Plate-Loaded-Isolateral-WidePullDown_charcoal-black-1000x1000.jpg?v=1748945087) | — |
| 40 | HAMMER STRENGTH | ILDRW | Iso-Lateral DY Row | Hammer Strength Plate Loaded Iso-Lateral D.Y. Row | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-d-y-row) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-plate-loaded-iso-lateral-low-row-charcoal-black-1000x1000.jpg?v=1748945109) | — |
| 41 | HAMMER STRENGTH | ILCB | Iso-Lateral Chest Back | Hammer Strength Plate Loaded Iso-Lateral Chest/Back | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-chest-back) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loadediso-lateral-chest-backbase_charcoalframe_blackuph_1000x1000_97c9a42a-b377-4631-9a5c-fa1c64579d76.jpg?v=1748945169) | — |
| 42 | HAMMER STRENGTH | ILLE | Iso-Lateral Leg Extension | Hammer Strength Plate Loaded Iso-Lateral Leg Extension | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-leg-extension) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-iso-lateral-leg-extension-charcoal-black-1000x1000.jpg?v=1748945129) | — |
| 43 | HAMMER STRENGTH | ILKLC | Iso-Lateral Kneeling Leg Curl | Hammer Strength Plate Loaded Iso-Lateral Kneeling Leg Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-kneeling-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/products/hammer-strength-plate-loaded-iso-lateral-kneeling-leg-curl-charcoal-black-1000x1000.jpg?v=1748945082) | — |
| 44 | HAMMER STRENGTH | ILLC | Iso-Lateral Leg Curl | Hammer Strength Plate Loaded Iso-Lateral Leg Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-plate-loaded-iso-lateral-leg-curl-midnightmetallic-black-1000x1000.jpg?v=1748945127) | — |
| 45 | HAMMER STRENGTH | ILLP | Iso-Lateral Leg Press | — | candidate_requires_review | — | — | [Iso-Lateral Bench Press](https://www.lifefitness.com/en-eu/catalog/strength-training/plate-loaded/plate-loaded-iso-lateral-bench-press) |
| 46 | HAMMER STRENGTH | PLGRIP | Grip Strength Trainer | — | unresolved | — | — | — |
| 47 | HAMMER STRENGTH | PLSH | Seated/Standing Shrug | Hammer Strength Plate Loaded Seated/Standing Shrug | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-seated-standing-shrug) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loaded-seated-shrug-charcoal-black-1000x1000.jpg?v=1748945084) | — |
| 48 | HAMMER STRENGTH | PLDIP | Seated Dip | Hammer Strength Plate Loaded Seated Dip | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-seated-dip) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loadedseated-dip-charcoal-black-1000x1000.jpg?v=1748945085) | — |
| 49 | HAMMER STRENGTH | PLBI | Seated Biceps | Hammer Strength Plate Loaded Seated Biceps | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-seated-biceps) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/plate-loaded-biceps-charcoal-black-1000x1000.jpg?v=1748945168) | — |
| 50 | HAMMER STRENGTH | PLLR | Lateral Raise | Hammer Strength Plate Loaded Lateral Raise | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-lateral-raise) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-plate-loaded-lateral-raise-midnightmetallic-black-1000x1000.jpg?v=1748945085) | — |
| 51 | HAMMER STRENGTH | PLAB | Abdominal / Oblique Crunch | Hammer Strength Plate Loaded Abdominal Oblique Crunch | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-abdominal-oblique-crunch-1) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loadedabdominal-oblique-crunch-charcoal-black-1000x1000.jpg?v=1748945121) | — |
| 52 | HAMMER STRENGTH | PLTBR | T-Bar Row | — | candidate_requires_review | — | — | [T-Bar Row](https://www.lifefitness.com/en-gb/catalog/strength-training/plate-loaded/hammer-strength-plate-loaded-t-bar-row) |
| 53 | HAMMER STRENGTH | PLPO | Pullover | Hammer Strength Plate Loaded Pullover | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-pullover) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loadedpullover-charcoal-1000x1000.jpg?v=1748945095) | — |
| 54 | HAMMER STRENGTH | PLTIB | Tibia Dorsi Flexion | — | candidate_requires_review | — | — | [Hammer Strength Plate Loaded Tibia Dorsi Flexion](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-tibia-dorsi-flexion) |
| 55 | HAMMER STRENGTH | PLCALF | Seated Calf Raise | — | candidate_requires_review | — | — | [Hammer Strength Plate Loaded Seated Calf Raise](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-seated-calf-raise) |
| 56 | HAMMER STRENGTH | PL4W | 4-Way Neck | — | candidate_requires_review | — | — | [Hammer Strength Plate Loaded 4 Way Neck](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-4-way-neck) |
| 61 | HAMMER STRENGTH | HSSM | Smith | Hammer Strength Smith Machine | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-smith-machine-1) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-benches-and-rackssmith-machine-charcoal1000x1000.jpg?v=1748945163) | — |
| 62 | HAMMER STRENGTH | HSSMV | Smith | Hammer Strength Plate Loaded Vertical Smith Machine | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-vertical-smith-machine) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loaded-vertical-smith-machine-charcoal-1000x1000_81d642c2-60f4-48e8-bbce-e1dfb0af30f7.jpg?v=1748945162) | — |
| 63 | HAMMER STRENGTH | HSLLP | Linear Leg Press | Plate Loaded Linear Leg Press | model_verified | [source](https://www.lifefitness.com/en-gb/catalog/strength-training/plate-loaded/plate-loaded-linear-leg-press) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/Equipment/Strength/Plate-Loaded/Linear%20Leg%20Press/Strength-PlateLoaded-LinearLegPress-Thumbnail-1.png?h=630&w=1200) | — |
| 64 | HAMMER STRENGTH | PLVSQ | V-Squat | Hammer Strength Plate Loaded V-Squat | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-v-squat) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loaded-v-squat-charcoal-black-1000x1000.jpg?v=1748945083) | — |
| 65 | HAMMER STRENGTH | PLLHS | Linear Hack Press | — | unresolved | — | — | — |
| 66 | HAMMER STRENGTH | PL-HSQ | Plate-loaded Hack Squat | — | candidate_requires_review | — | — | [Hammer Strength Plate Loaded Hack Squat](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-hack-squat) |
| 67 | HAMMER STRENGTH | PLGLD | Glute Drive | — | unresolved | — | — | — |
| 68 | HAMMER STRENGTH | PLBSQ | Belt Squat | — | unresolved | — | — | — |
| 69 | HAMMER STRENGTH | PLBSQ-DH | Belt Squat with Dip Handles | — | unresolved | — | — | — |
| 70 | HAMMER STRENGTH | PL-GHRH | Glute Ham / Reverse Hyper Combo | Hammer Strength Glute Ham Reverse Hyper Combo | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-glute-ham-reverse-hyper-combo) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/CrunchHammerStrengthGluteHamReverseHyperCombocharcoal-black-1000x1000.jpg?v=1748945141) | — |
| 72 | HAMMER STRENGTH | GBCI | Ground Base Combo Incline | — | candidate_requires_review | — | — | [Produkt eingestellt: Ground Base Combo Incline](https://www.lifefitness.com/de-de/produkte/strength-training/stationen-mit-gewichtsscheiben/ground-base-combo-incline) |
| 73 | HAMMER STRENGTH | GBCT | Ground Base Combo Twist | Hammer Strength Plate Loaded Combo Twist | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-combo-twist) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loaded-combo-twist-charcoal-1000x1000.jpg?v=1748945145) | — |
| 74 | HAMMER STRENGTH | GBJ | Ground Base Jammer | — | candidate_requires_review | — | — | [Ground Base® Jammer](https://www.lifefitness.com/de-de/produkte/strength-training/stationen-mit-gewichtsscheiben/ground-base-jammer) |
| 75 | HAMMER STRENGTH | GBSL | Ground Base Squat Lunge | — | candidate_requires_review | — | — | [Hammer Strength Ground Base Multi-Squat](https://shop.lifefitness.com/products/hammer-strength-ground-base-multi-squat) |
| 79 | HAMMER STRENGTH | OBWS | Olympic Bench Weight Storage | — | candidate_requires_review | — | — | [Olympic Incline Bench](https://www.lifefitness.com/de-de/produkte/strength-training/benches/olympic-incline-bench) |
| 80 | HAMMER STRENGTH | OFB | Olympic Flat Bench | — | candidate_requires_review | — | — | [Life Fitness Olympic Flat Bench](https://shop.lifefitness.com/products/signature-series-olympic-flat-bench) |
| 81 | HAMMER STRENGTH | FWBAR | Fixed Barbell Rack | — | candidate_requires_review | — | — | [Barbell Rack](https://www.lifefitness.com/en-us/catalog/strength-training/storage-racks/hammer-strength-barbell-rack) |
| 82 | HAMMER STRENGTH | FWAC | Arm Curl, Seated | Hammer Strength Seated Arm Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-seated-arm-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-arm-curl-bench-charcoal-black-1000x1000.jpg?v=1748945172) | — |
| 83 | HAMMER STRENGTH | BWBE | BW Back Extensionb | Hammer Strength Back Extension | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-back-extension) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-back-extensions-charcoal-black-1000x1000.jpg?v=1748945081) | — |
| 84 | HAMMER STRENGTH | ODB | Olympic Decline Bench | — | candidate_requires_review | — | — | [Olympic Decline Bench](https://www.lifefitness.com/en-eu/catalog/strength-training/benches/life-fitness-olympic-decline-bench) |
| 85 | HAMMER STRENGTH | OIB | Olympic Incline Bench | — | candidate_requires_review | — | — | [Olympic Incline Bench](https://www.lifefitness.com/de-de/produkte/strength-training/benches/olympic-incline-bench) |
| 86 | HAMMER STRENGTH | OMB | Olympic Military Bench | — | candidate_requires_review | — | — | [Signature Series Olympic Military Bench - Outlet](https://shop.lifefitness.com/products/signature-series-olympic-military-bench-outlet) |
| 87 | HAMMER STRENGTH | OSR | Olympic Squat Rack | — | candidate_requires_review | — | — | [Signature Series Olympic Squat Rack - Outlet](https://shop.lifefitness.com/products/signature-series-olympic-squat-rack) |
| 88 | HAMMER STRENGTH | BWCDL | Chin/Dip/Leg Raise | Hammer Strength Chin/Dip/Leg Raise | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-chin-dip-leg-raise) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-benches-and-rackschin-dip-leg-raisebase_charcoal-black_1000x1000_de8f3b47-a050-4bdd-9063-52f9174eeabe.jpg?v=1748945155) | — |
| 89 | HAMMER STRENGTH | BWGH | Glute/Ham Bench | — | unresolved | — | — | — |
| 90 | HAMMER STRENGTH | BWGHF | Fixed Pad Glute/Ham Bench | Hammer Strength Fixed Pad Glute/Ham | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-fixed-pad-glute-ham-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/glute-ham-bodyweight-charcoal-black-1000x1000.jpg?v=1748945080) | — |
| 91 | HAMMER STRENGTH | FWMAB | Adjustable Pro Bench | Hammer Strength Multi-Adjustable Bench | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-multi-adjustable-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-multi-adjustable-bench-charcoal-black-1000x1000.jpg?v=1769619719) | — |
| 92 | HAMMER STRENGTH | FWDB | Decline Bench | — | candidate_requires_review | — | — | [Olympic Decline Bench](https://www.lifefitness.com/en-eu/catalog/strength-training/benches/life-fitness-olympic-decline-bench) |
| 93 | HAMMER STRENGTH | FWUB75 | Utility Bench -75 | Hammer Strength Utility Bench - 75 Degree | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-utility-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-utility-bench-charcoal-black-outlet-1000x1000.jpg?v=1748945236) | — |
| 94 | HAMMER STRENGTH | FWFB | Flat Bench | Hammer Strength Flat Bench | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-flat-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-benches-and-racksflat-bench-charcoal-black-1000x1000.jpg?v=1748945116) | — |
| 95 | HAMMER STRENGTH | MTSFP | MTS Front Pulldown | Hammer Strength MTS Iso-Lateral Front Pulldown | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-front-pulldown) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/HS-MTS-Iso-Lateral-Front-Pulldown-charcoal-black-1000x1000.jpg?v=1754596855) | — |
| 96 | HAMMER STRENGTH | MTSKC | MTS Kneeling Leg Curl | Hammer Strength MTS Kneeling Leg Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-kneeling-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/MTSkneeling-leg-curl-charcoal-black-1000x1000.jpg?v=1754587301) | — |
| 97 | HAMMER STRENGTH | MTSCP | MTS Chest Press | Hammer Strength MTS Iso-Lateral Chest Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-chest-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-motion-technology-selectorizediso-lateral-chest-press-charcoal-black-1000x1000.jpg?v=1754588952) | — |
| 98 | HAMMER STRENGTH | MTSBC | MTS Biceps Curl | Hammer Strength MTS Iso-Lateral Biceps Curl | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-biceps-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-motion-technology-selectorizediso-lateral-biceps-curl-charcoal-black.jpg?v=1758651813) | — |
| 99 | HAMMER STRENGTH | MTSSP | MTS Shoulder Press | Hammer Strength MTS Iso-Lateral Shoulder Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-shoulder-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-mts-shoulder-press-charcoal-black-1000x1000.jpg?v=1758657260) | — |
| 100 | HAMMER STRENGTH | MTSRW | MTS Row | Hammer Strength MTS Iso-Lateral Row | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-row-1) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-motion-technology-selectorizediso-lateral-rowbase-charcoal-black.jpg?v=1774898265) | — |
| 101 | HAMMER STRENGTH | MTSLE | Leg Extension | Hammer Strength MTS Leg Extension | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-leg-extension) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/MTSiso-lateral-leg-extensionbase.jpg?v=1770230566) | — |
| 102 | HAMMER STRENGTH | MTSAB | MTS Abdominal Crunch | Hammer Strength MTS Abdominal Crunch | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-abdominal-crunch) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-motion-technology-selectorizedabdominal-crunch-charcoal-black-1000x1000.jpg?v=1754588519) | — |
| 103 | HAMMER STRENGTH | MTSIP | MTS Incline Press | Hammer Strength MTS Iso-Lateral Incline Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-incline-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-mts-incline-press-black-black-1000x1000.jpg?v=1700084962) | — |
| 104 | HAMMER STRENGTH | MTSDP | MTS Decline Press | Hammer Strength MTS Iso-Lateral Decline Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-decline-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-mts-decline-press-black-black-1000x1000.jpg?v=1700084060) | — |
| 105 | HAMMER STRENGTH | MTSHR | MTS High Row | Hammer Strength MTS Iso-Lateral High Row | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-mts-iso-lateral-high-row) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/outlet-hammer-strength-mts-high-row-platinum-royalblue-1000x1000_044132d3-deec-4ec0-be4d-5ce40e7f7521.jpg?v=1754597627) | — |
| 157 | HAMMER STRENGTH | HDW-PR-STRD | HD ATHLETIC | Hammer Strength HD Athletic NX Power Rack | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-hd-athletic-nx-power-rack) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/HD_Athletic_NX_-_Standard_Power_Rack_-_Iso-charcoal-1000x1000.jpg?v=1748945132) | — |
| 158 | HAMMER STRENGTH | HDW-HR-STRD | HD ATHLETIC | — | unresolved | — | — | — |
| 1100 | HAMMER STRENGTH | PL-ANH | PLATE LOADED ASSISTED NORDIC HAM | Hammer Strength Assisted Nordic Ham | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-assisted-nordic-ham) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/Strength-PlateLoaded-AssistedNordicHam-black-black-1000x1000.jpg?v=1748945099) | — |
| 1101 | HAMMER STRENGTH | PL-XSQ | Plate Loaded Pendulum-X Squat | Hammer Strength Plate Loaded Pendulum-X Squat | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-pendulum-x-squat-1) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/Hammer_Strength_-_Plate_Loaded_-_Pendulum-X_Squat_PL-XSQ_-_Render.jpg?v=1748945058) | — |
| 1158 | HAMMER STRENGTH | PL-SSP | PLATE LOADED SUPER SQUAT PRESS | Hammer Strength Plate Loaded Super Squat Press | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-squat-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/HammerStrength-PlateLoaded-SuperSquatPress_PL-SSP_-Render01.jpg?v=1752091934) | — |
| 1301 | HAMMER STRENGTH | GB-MSQ | Ground Base Multi Squat | Hammer Strength Ground Base Multi-Squat | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-ground-base-multi-squat) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/hammer-strength-plate-loaded-ground-base-multi-squat-1000x1000.jpg?v=1748945137) | — |
| 1345 | HAMMER STRENGTH | HDU-MAB | Multi-Adjustable Bench | Multi-Adjustable Bench | model_verified | [source](https://www.lifefitness.com/en-us/catalog/strength-training/benches/multi-adjustable-bench) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/MediaSync/160-994-athleticseries-multi-adjustable-bench-l-1-.png?h=630&w=1200) | — |
| 1368 | HAMMER STRENGTH | HDT-HR-TS | Standard Power Rack | — | unresolved | — | — | — |
| 1463 | HAMMER STRENGTH | Hammer Strength Impact Suppression Platform | Hammer Strength Impact Suppression Platform | Hammer Strength Impact Suppression Platform | model_verified | [source](https://shop.lifefitness.com/products/hammer-strength-impact-suppression-platform) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/296-819-hs-lifting-platform-45-left-v2.jpg?v=1781632206) | — |
| 1484 | HAMMER STRENGTH | HDT-HR | HALF-RACK | PRODUCT DISCONTINUED: HD Athletic Pro Half Rack | model_verified | [source](https://www.lifefitness.com/en-eu/catalog/strength-training/racks-rigs/hammer-strength-hd-athletic-half-rack) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/MediaSync/159-517-hd-athletic-half-rack.png?h=630&w=1200) | — |
| 1485 | HAMMER STRENGTH | SUB | 练习椅 | — | unresolved | — | — | — |
| 1486 | HAMMER STRENGTH | SFB | 练习椅 | — | unresolved | — | — | — |
| 1072 | HOWBODY | - | HOWBODY | — | unresolved | — | — | — |
| 1154 | IRONWOD | — | Bulgarian Split Squat Stand | — | unresolved | — | — | — |
| 1073 | InBody | - | InBody | — | unresolved | — | — | — |
| 1102 | KAYAKPRO | D1X | Multistroke Ergometer 龍舟 | — | unresolved | — | — | — |
| 107 | Life Fitness | SS-BC（LP）Full | Biceps Curl | — | candidate_requires_review | — | — | [Axiom Series Biceps Curl](https://shop.lifefitness.com/products/axiom-series-biceps-curl) |
| 108 | Life Fitness | SS-FLY（LP）Full | Pectoral Fly/Rear Deltoid | — | candidate_requires_review | — | — | [Insignia Series Pectoral Fly/Rear Deltoid](https://shop.lifefitness.com/products/insignia-series-pectoral-fly-rear-deltoid) |
| 109 | Life Fitness | SS-PD（LP）Full | Pulldown | — | unresolved | — | — | — |
| 110 | Life Fitness | SS-CP（LP）Full | Chest Press | — | candidate_requires_review | — | — | [Axiom Series Chest Press](https://shop.lifefitness.com/products/axiom-series-chest-press) |
| 111 | Life Fitness | SS-LR（LP）Full | Lateral Raise | — | candidate_requires_review | — | — | [Insignia Series Lateral Raise](https://shop.lifefitness.com/products/insignia-series-lateral-raise) |
| 112 | Life Fitness | SS-ADC（LP）Full | Assist Dip Chin | — | candidate_requires_review | — | — | [Dip/Chin Assist](https://www.lifefitness.com/en-gb/catalog/cybex/cybex-products/cybex-dip-chin-assist) |
| 113 | Life Fitness | SS-PEC（LP）Full | Pectoral Fly | — | candidate_requires_review | — | — | [Insignia Series Pectoral Fly/Rear Deltoid](https://shop.lifefitness.com/products/insignia-series-pectoral-fly-rear-deltoid) |
| 114 | Life Fitness | SS-RW（LP）Full | Row | — | unresolved | — | — | — |
| 115 | Life Fitness | SS-SP（LP）Full | Shoulder Press | — | candidate_requires_review | — | — | [Axiom Series Shoulder Press](https://shop.lifefitness.com/products/axiom-series-shoulder-press) |
| 116 | Life Fitness | SS-TP（LP）Full | Triceps Press | — | candidate_requires_review | — | — | [Insignia Series Triceps Press](https://shop.lifefitness.com/products/insignia-series-triceps-press) |
| 118 | Life Fitness | SS-GL（LP）Full | Glute | — | unresolved | — | — | — |
| 119 | Life Fitness | SS-SLC（LP）Full | Seated Leg Curl | — | candidate_requires_review | — | — | [Insignia Series Seated Leg Curl](https://shop.lifefitness.com/products/insignia-series-seated-leg-curl) |
| 120 | Life Fitness | SS-LE（LP）Full | Leg Extension | — | candidate_requires_review | — | — | [Axiom Series Leg Extension](https://shop.lifefitness.com/products/axiom-series-leg-extension) |
| 121 | Life Fitness | SS-LC（LP）Full | Leg Curl | — | candidate_requires_review | — | — | [Axiom Series Leg Curl](https://shop.lifefitness.com/products/axiom-series-leg-curl) |
| 122 | Life Fitness | SS-SLP（LP）Full | Seated Leg Press | — | candidate_requires_review | — | — | [Hammer Strength Select Seated Leg Press](https://shop.lifefitness.com/products/hammer-strength-select-seated-leg-press) |
| 123 | Life Fitness | SS-AB（LP）Full | Abdominal | — | unresolved | — | — | — |
| 124 | Life Fitness | SS-BE（LP）Full | Back Extension | — | candidate_requires_review | — | — | [Back Extension](https://shop-eu.lifefitness.com/ch/back-extension-ph-lbrbe) |
| 125 | Life Fitness | SS-TR（LP）Full | Torso Rotation | — | candidate_requires_review | — | — | [Insignia Series Torso Rotation](https://shop.lifefitness.com/products/insignia-series-torso-rotation) |
| 126 | Life Fitness | SS-HAB（LP）Full | Hip Abduction | — | candidate_requires_review | — | — | [Insignia Series Hip Abduction / Adduction](https://shop.lifefitness.com/products/insignia-series-hip-abductor-adductor-outlet) |
| 127 | Life Fitness | SS-HAD（LP）Full | Hip Adduction | — | candidate_requires_review | — | — | [Insignia Series Hip Adduction](https://shop.lifefitness.com/products/insignia-series-hip-adduction) |
| 128 | Life Fitness | SS-BCD （LP）Full | Biceps Curl - Dependent | — | candidate_requires_review | — | — | [Insignia Series Biceps Curl - Dependent](https://shop.lifefitness.com/products/insignia-series-biceps-curl-dependent) |
| 129 | Life Fitness | SS-TE （LP）Full | Triceps Extension | — | candidate_requires_review | — | — | [Axiom Series Triceps Extension](https://shop.lifefitness.com/products/axiom-series-triceps-extension) |
| 130 | Life Fitness | SS-GLD（LP）Full | Seated Leg Press | — | candidate_requires_review | — | — | [Hammer Strength Select Seated Leg Press](https://shop.lifefitness.com/products/hammer-strength-select-seated-leg-press) |
| 131 | Life Fitness | SS-HAA（LP）Full | Hip Abduction/Adduction | — | candidate_requires_review | — | — | [Insignia Series Hip Abduction / Adduction](https://shop.lifefitness.com/products/insignia-series-hip-abductor-adductor-outlet) |
| 132 | Life Fitness | SS-AB（SP）Full | Abdominal | — | unresolved | — | — | — |
| 134 | Life Fitness | SS-CP(SP)Full | Chest Press | — | candidate_requires_review | — | — | [Axiom Series Chest Press](https://shop.lifefitness.com/products/axiom-series-chest-press) |
| 135 | Life Fitness |  SS-LR(SP)Full | Lateral Raise | — | candidate_requires_review | — | — | [Insignia Series Lateral Raise](https://shop.lifefitness.com/products/insignia-series-lateral-raise) |
| 136 | Life Fitness | SS-PEC(SP)Full | Pectoral Fly | — | candidate_requires_review | — | — | [Insignia Series Pectoral Fly/Rear Deltoid](https://shop.lifefitness.com/products/insignia-series-pectoral-fly-rear-deltoid) |
| 137 | Life Fitness | SS-FLY(SP)Full | Pectoral Fly/Rear Deltoid | — | candidate_requires_review | — | — | [Insignia Series Pectoral Fly/Rear Deltoid](https://shop.lifefitness.com/products/insignia-series-pectoral-fly-rear-deltoid) |
| 138 | Life Fitness | SS-PD(SP)Full | Lat Pulldown | — | candidate_requires_review | — | — | [Axiom Series Lat Pulldown](https://shop.lifefitness.com/products/axiom-series-pulldown) |
| 140 | Life Fitness | SS-SP(SP)Full | Shoulder Press | — | candidate_requires_review | — | — | [Axiom Series Shoulder Press](https://shop.lifefitness.com/products/axiom-series-shoulder-press) |
| 142 | Life Fitness | SS-GL(SP)Full | Glute | — | unresolved | — | — | — |
| 143 | Life Fitness | SS-SLC(SP)Full | Seated Leg Curl | — | candidate_requires_review | — | — | [Insignia Series Seated Leg Curl](https://shop.lifefitness.com/products/insignia-series-seated-leg-curl) |
| 144 | Life Fitness |  SS-LC(SP)Full | Leg Curl | — | candidate_requires_review | — | — | [Axiom Series Leg Curl](https://shop.lifefitness.com/products/axiom-series-leg-curl) |
| 145 | Life Fitness | SS-LE(SP)Full | Leg Extension | — | candidate_requires_review | — | — | [Axiom Series Leg Extension](https://shop.lifefitness.com/products/axiom-series-leg-extension) |
| 146 | Life Fitness | SS-SLP(SP)Full | Seated Leg Press | — | candidate_requires_review | — | — | [Hammer Strength Select Seated Leg Press](https://shop.lifefitness.com/products/hammer-strength-select-seated-leg-press) |
| 148 | Life Fitness | SS-TR(SP)Full | Torso Rotation | — | candidate_requires_review | — | — | [Insignia Series Torso Rotation](https://shop.lifefitness.com/products/insignia-series-torso-rotation) |
| 149 | Life Fitness |  SS-HAB(SP)Full | Hip Abduction | — | candidate_requires_review | — | — | [Insignia Series Hip Abduction / Adduction](https://shop.lifefitness.com/products/insignia-series-hip-abductor-adductor-outlet) |
| 150 | Life Fitness |  SS-HAD(SP)Full | Hip Adduction | — | candidate_requires_review | — | — | [Insignia Series Hip Adduction](https://shop.lifefitness.com/products/insignia-series-hip-adduction) |
| 151 | Life Fitness | SS-BC(SP)Full | Biceps Curl | — | candidate_requires_review | — | — | [Axiom Series Biceps Curl](https://shop.lifefitness.com/products/axiom-series-biceps-curl) |
| 153 | Life Fitness |  SS-BCD(SP)Full | Biceps Curl - Dependent | — | candidate_requires_review | — | — | [Insignia Series Biceps Curl - Dependent](https://shop.lifefitness.com/products/insignia-series-biceps-curl-dependent) |
| 154 | Life Fitness |  SS-TE(SP)Full | Triceps Extension | — | candidate_requires_review | — | — | [Axiom Series Triceps Extension](https://shop.lifefitness.com/products/axiom-series-triceps-extension) |
| 155 | Life Fitness |  SS-GLD(SP)Full | Glute Bridge | — | candidate_requires_review | — | — | [Insignia Series Glute Bridge](https://shop.lifefitness.com/products/insignia-series-glute-bridge) |
| 156 | Life Fitness | SS-HAA(SP)Full | Hip Abduction/Adduction | — | candidate_requires_review | — | — | [Insignia Series Hip Abduction / Adduction](https://shop.lifefitness.com/products/insignia-series-hip-abductor-adductor-outlet) |
| 159 | Life Fitness | ASPT-SL | Aspire SL Console Treadmill | — | unresolved | — | — | — |
| 160 | Life Fitness |  ASPX-SL  | Aspire SL Console Cross Trainer | — | candidate_requires_review | — | — | [Life Fitness Aspire Cross Trainer – Life Fitness Support Hub](https://support.lifefitness.com/hc/en-us/articles/10249296323223-Life-Fitness-Aspire-Cross-Trainer) |
| 161 | Life Fitness | ASPR-SL | Aspire SL Console Recumbent Bike | — | unresolved | — | — | — |
| 162 | Life Fitness | ASPC-SL | Aspire SL Console Upright Bike | — | unresolved | — | — | — |
| 442 | Life Fitness | — | MULTI-JUNGLE MJ8 | — | candidate_requires_review | — | — | [Product Discontinued: Signature Series Multi-Jungle MJ8](https://www.lifefitness.com/en-eu/catalog/strength-training/cable-machines-functional-trainers/signature-series-multi-jungle-mj8) |
| 1152 | Life Fitness | SLR（LBR-LR） | Signature Series Leg Raise | — | candidate_requires_review | — | — | [Life Fitness Leg Raise](https://shop.lifefitness.com/products/signature-series-leg-raise) |
| 1153 | Life Fitness | SYNERGY360 | SYNERGY360 | — | unresolved | — | — | — |
| 1166 | Life Fitness | CMDAP | CMS Dual Adjustable Pulley | — | candidate_requires_review | — | — | [Axiom Dual Adjustable Pulley](https://shop.lifefitness.com/products/axiom-dual-adjustable-pulley) |
| 1169 | Life Fitness | SPLIP | Plate Loaded Incline Press | Plate Loaded Incline Press | model_verified | [source](https://www.lifefitness.com/en-hk/catalog/strength-training/plate-loaded/life-fitness-incline-press) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/MediaSync/202-833-plateloaded-inclinepress.png?h=630&w=1200) | — |
| 1184 | Life Fitness | Adj-16 | Mutil Junction-16 Stack | — | unresolved | — | — | — |
| 1334 | Life Fitness | OP-BT-FS | Axiom Series Biceps / Triceps (w/Full Shroud) | — | unresolved | — | — | — |
| 1335 | Life Fitness | PH-OPBT | Axiom Series Dual Bicep/Tricep | Axiom Series Dual Bicep/Tricep | model_verified | [source](https://shop-eu.lifefitness.com/ch/axiom-series-dual-bicep-tricep-ph-opbt) | [image](https://shop-eu.lifefitness.com/media/b8/91/30/1791527880/ph-opbt_bild03_ph-opbt_axiom_series_dual_biceptricep.jpg?ts=1791527880) | — |
| 1336 | Life Fitness | PH-OPLP | Axiom Series Leg Press | Axiom Series Leg Press | model_verified | [source](https://shop-eu.lifefitness.com/ch/axiom-series-leg-press-ph-oplp) | [image](https://shop-eu.lifefitness.com/media/ff/c8/d8/1791528208/ph-oplp_bild01_axiom_leg_press.jpg?ts=1791528208) | — |
| 1337 | Life Fitness | OP-LP | Life Fitness Axiom Series Leg Press | Axiom Series Leg Press | model_verified | [source](https://shop.lifefitness.com/products/axiom-series-leg-press) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/axiom-series-leg-press-charcoal-black-1000x1000.jpg?v=1748945177) | — |
| 1338 | Life Fitness | OSX | Life Fitness Activate Series Elliptical Cross-Trainer | — | candidate_requires_review | — | — | [E3 Elliptical Cross-Trainer](https://shop.lifefitness.com/products/e3-elliptical-cross-trainer) |
| 1339 | Life Fitness | INP-SL | Life Fitness Powermill with SL Console | — | unresolved | — | — | — |
| 1340 | Life Fitness | OP-LP-FS | Life Fitness Axiom Series Leg Press (w/Full Shroud) | — | candidate_requires_review | — | — | [Axiom Series Leg Press](https://shop.lifefitness.com/products/axiom-series-leg-press) |
| 1341 | Life Fitness | INR-SL | Integrity Series Cycle | — | unresolved | — | — | — |
| 1342 | Life Fitness | INT-SL | Integrity Series Treadmill with Integrity SL Console | — | unresolved | — | — | — |
| 1343 | Life Fitness | OP-FLY-FS | Axiom Series Pec Fly and Rear Delt (w/Full Shroud) | — | unresolved | — | — | — |
| 1344 | Life Fitness | INX-SL | Integrity Series Elliptical Cross-Trainer with SL Console | — | unresolved | — | — | — |
| 1346 | Life Fitness | — | Heat Row | — | candidate_requires_review | — | — | [Life Fitness Heat Row](https://shop.lifefitness.com/products/heat-row) |
| 1369 | Life Fitness | Integrity SE3 HD樓梯機 | Integrity SE3 HD樓梯機 | — | unresolved | — | — | — |
| 1370 | Life Fitness | LBR-DB | Adjustable Decline Bench | Life Fitness Adjustable Decline Bench | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-adjustable-decline-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/new-lifefitness-decline-bench-charcoal-black-1000x1000.jpg?v=1748945297) | — |
| 1371 | Life Fitness | LBR-BC | Arm Curl Bench | Life Fitness Arm Curl Bench | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-arm-curl-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/signature-series-arm-curl-bench-life-fitness-charcoal-black-1000x1000.jpg?v=1748945295) | — |
| 1372 | Life Fitness | LBR-DS | Saddle Dumbbell Rack | Saddle Dumbbell Rack | model_verified | [source](https://www.lifefitness.com/en-us/catalog/strength-training/storage-racks/life-fitness-saddle-dumbbell-racks) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/Equipment/Strength/Storage%20Racks/Storage-Rack-Life-Fitness-Saddle-Dumbbell-Rack-Short.png?h=630&w=1200) | — |
| 1373 | Life Fitness | LBR-FS | Flexibility Trainer | Life Fitness Flexibility Trainer | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-flexibility-trainer-outlet-copy) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/LF-optima-flexibility-trainer-charcoal-1000x1000.jpg?v=1748945198) | — |
| 1374 | Life Fitness | OP-SLCE-FS | Axiom Series Seated Leg Curl/Extension (w/Full Shroud) | — | candidate_requires_review | — | — | [Axiom Series Seated Leg Curl / Extension](https://shop.lifefitness.com/products/axiom-series-seated-leg-curl-extension) |
| 1375 | Life Fitness | PH-OPLCE | Axiom Series Dual Leg Extension/Curl | — | candidate_requires_review | — | — | [Axiom Series Dual Seated Leg Extension/Curl](https://shop-eu.lifefitness.com/ch/axiom-series-dual-seated-leg-extension-curl-ph-opslce) |
| 1376 | Life Fitness | PH-OPSLCE | Axiom Series Dual Seated Leg Extension/Curl | Axiom Series Dual Seated Leg Extension/Curl | model_verified | [source](https://shop-eu.lifefitness.com/ch/axiom-series-dual-seated-leg-extension-curl-ph-opslce) | [image](https://shop-eu.lifefitness.com/media/6f/3e/3d/1791528711/ph-opslce_bild01_ph-opslce_axiom_series_dual_seated_leg_extensioncurl-1.jpg?ts=1791528711) | — |
| 1378 | Life Fitness | OST | Activate Series Treadmill | — | unresolved | — | — | — |
| 1379 | Life Fitness | SAC | Life Fitness Signature Series Arm Curl Bench | — | candidate_requires_review | — | — | [Life Fitness Arm Curl Bench](https://shop.lifefitness.com/products/life-fitness-arm-curl-bench) |
| 1380 | Life Fitness | OSC | Life Fitness Activate Series Upright Lifecycle Bike | — | candidate_requires_review | — | — | [Club Series+ Upright Lifecycle® Bike](https://shop.lifefitness.com/products/club-series-plus-upright-lifecycle-bike) |
| 1381 | Life Fitness | SBR | Life Fitness Signature Series Barbell Rack | — | candidate_requires_review | — | — | [Life Fitness Barbell Rack](https://shop.lifefitness.com/products/life-fitness-barbell-rack) |
| 1382 | Life Fitness | op-bc | Life fitness bicep curl | Axiom Series Biceps Curl | model_verified | [source](https://shop.lifefitness.com/products/axiom-series-biceps-curl) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/axiom-series-biceps-curl1000x1000-charcoal-black.jpg?v=1767809132) | — |
| 1383 | Life Fitness | OP-DB3SS | OP-DB3SS Optima 3 Tier Dumbbell Rack (10prs/rack) | — | unresolved | — | — | — |
| 1384 | Life Fitness | LBRUB | life fitness Utility Bench | Life Fitness Utility Bench | model_verified | [source](https://shop.lifefitness.com/products/signature-series-utility-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/signature-series-utility-bench-charcoal-black-life-fitness-1000x1000.jpg?v=1748945288) | — |
| 1385 | Life Fitness | LBROI | Olympic Incline Bench | Life Fitness Olympic Incline Bench | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-olympic-incline-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/life-fitness-olympic-incline-bench-charcoal-black-1000x1000.jpg?v=1786110859) | — |
| 1386 | Life Fitness | LBR-OF | Olympic Flat Bench | Olympic Flat Bench | model_verified | [source](https://www.lifefitness.com/en-us/catalog/strength-training/benches/life-fitness-olympic-flat-bench) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/MediaSync/190-764-download-copy.png?h=630&w=1200) | — |
| 1387 | Life Fitness | LBRBC | life fitness Arm Curl Bench | Life Fitness Arm Curl Bench | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-arm-curl-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/signature-series-arm-curl-bench-life-fitness-charcoal-black-1000x1000.jpg?v=1748945295) | — |
| 1388 | Life Fitness | LBRDB | Adjustable Decline Bench | Life Fitness Adjustable Decline Bench | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-adjustable-decline-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/new-lifefitness-decline-bench-charcoal-black-1000x1000.jpg?v=1748945297) | — |
| 1389 | Life Fitness | LBRMA | Multi-Adjustable Bench | Life Fitness Multi-Adjustable Bench | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-multi-adjustable-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/new-lifefitness-multi-adjustable-bench-platinum-charcoal-1000x1000.jpg?v=1748945292) | — |
| 1392 | Life Fitness | MJLP | Life Fitness Signature Series MJ Station-Lat Pulldown | — | unresolved | — | — | — |
| 1393 | Life Fitness | MJRW | Life Fitness Signature Series MJ Station-Row | — | unresolved | — | — | — |
| 1394 | Life Fitness | MJRWD | Life Fitness Signature Series MJ Station-Dual Pulley Row | — | unresolved | — | — | — |
| 1395 | Life Fitness | MJADC | Life Fitness Signature Series MJ Station-Assist Dip Chin | — | candidate_requires_review | — | — | [Dip/Chin Assist](https://www.lifefitness.com/en-gb/catalog/cybex/cybex-products/cybex-dip-chin-assist) |
| 1396 | Life Fitness | MJHAR | Life Fitness Signature Series MJ Handle / Accessory Rack | — | candidate_requires_review | — | — | [Life Fitness Accessory Rack](https://shop.lifefitness.com/products/life-fitness-accessory-rack) |
| 1468 | Life Fitness | Olympic Weight Tree | Olympic Weight Tree | Life Fitness Olympic Weight Tree | model_verified | [source](https://shop.lifefitness.com/products/olympic-weight-tree) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/life-fitness-signature-seriesolympic-weight-treebase-charcoal-1000x1000.jpg?v=1748945299) | — |
| 1470 | Life Fitness | PowerMill Climber + SE4 | PowerMill Climber + SE4 | — | candidate_requires_review | — | — | [PowerMill Climber](https://www.lifefitness.com/de-de/produkte/cardio/climbers/powermill-climber) |
| 1472 | Life Fitness | 4合1MJ | 4合1MJ | — | unresolved | — | — | — |
| 1482 | Life Fitness | PRF-ROW-LCD-01 | ROW MACHINE | Life Fitness Heat Row | model_verified | [source](https://shop.lifefitness.com/products/heat-row) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/products/life-fitness-heat-row-full-1000x1000.jpg?v=1748945315) | — |
| 1487 | Life Fitness | LBR-UB | Utility Bench | Life Fitness Utility Bench | model_verified | [source](https://shop.lifefitness.com/products/signature-series-utility-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/signature-series-utility-bench-charcoal-black-life-fitness-1000x1000.jpg?v=1748945288) | — |
| 1500 | Life Fitness | MJSCOR22510592 | Life Fitness Signature Series MJ Core | — | unresolved | — | — | — |
| 1501 | Life Fitness | LBR-BE | BACK EXTENSION | Back Extension | model_verified | [source](https://www.lifefitness.com/en-us/catalog/strength-training/benches/life-fitness-back-extension) | [image](https://www.lifefitness.com/Kentico13CoreBase/media/LFMedia/LifeFitnessImages/MediaSync/190-735-signature-series-back-extension-image.png?h=630&w=1200) | — |
| 1502 | Life Fitness | LBR-AC | AB CRUNCH BENCH | Life Fitness Ab Crunch Bench | model_verified | [source](https://shop.lifefitness.com/products/life-fitness-ab-crunch-bench) | [image](https://cdn.shopify.com/s/files/1/0538/8307/6805/files/signature-series-ab-crunch-bench-charcoal-black-1000x1000.jpg?v=1748945286) | — |
| 1503 | Life Fitness | MJAXO | Life Fitness Signature Series MJ Station-Adjustable Cable... | — | ambiguous_model | — | — | [生産終了製品: SIGNATURE SERIES CABLE MOTION マルチジャングル MJ4](https://www.lifefitness.com/ja-jp/catalog/strength-training/cable-machines-functional-trainers/signature-series-multi-jungle-mj4) |
| 1504 | Life Fitness | MJAP | Life Fitness Signature Series MJ Station-Adjustable Pulley | — | candidate_requires_review | — | — | [Life Fitness Dual Adjustable Pulley](https://shop.lifefitness.com/products/life-fitness-dual-adjustable-pulley) |
| 1505 | Life Fitness | MJLPD | Life Fitness Signature Series MJ Station-Dual Pulley... | — | candidate_requires_review | — | — | [Life Fitness Dual Adjustable Pulley](https://shop.lifefitness.com/products/life-fitness-dual-adjustable-pulley) |
| 1510 | Life Fitness | LPP-CORE | LF PWR PLAY CORE | — | ambiguous_model | — | — | [Life Fitness PWR Play - 3 Stations](https://shop.lifefitness.com/products/life-fitness-power-play-3-stations) |
| 1511 | Life Fitness | LPP-CX | LF PWR PLAY CORE CONNECTOR - ADJUSTABLE CABLE CROSSOVER | — | unresolved | — | — | — |
| 1512 | Life Fitness | LPP-AC | LF PWR PLAY ADJUSTABLE 2:1 CABLE | — | ambiguous_model | — | — | [Life Fitness PWR Play - 3 Stations](https://shop.lifefitness.com/products/life-fitness-power-play-3-stations) |
| 1513 | Life Fitness | LPP-PD | LF PWR PLAY PULLDOWN | — | ambiguous_model | — | — | [Life Fitness PWR Play - 3 Stations](https://shop.lifefitness.com/products/life-fitness-power-play-3-stations) |
| 1514 | Life Fitness | LPP-RW | LF PWR PLAY ROW | — | ambiguous_model | — | — | [Life Fitness PWR Play - 3 Stations](https://shop.lifefitness.com/products/life-fitness-power-play-3-stations) |
| 1515 | Life Fitness | LPP-DP | LF PWR PLAY DUAL CABLE PULLDOWN | — | unresolved | — | — | — |
| 1516 | Life Fitness | LPP-DR | LF PWR PLAY DUAL CABLE ROW | — | unresolved | — | — | — |
| 1517 | Life Fitness | LPP-DC | LF PWR PLAY ASSIST DIP CHIN | — | candidate_requires_review | — | — | [Dip/Chin Assist](https://www.lifefitness.com/en-gb/catalog/cybex/cybex-products/cybex-dip-chin-assist) |
| 1518 | Life Fitness | LPP-HR | LF PWR PLAY CABLE STATION HANDLE STORAGE | — | unresolved | — | — | — |
| 1520 | Life Fitness | SSM | Life Fitness Smith Machine | — | candidate_requires_review | — | — | [Life Fitness Smith Machine](https://shop.lifefitness.com/products/life-fitness-smith-machine) |
| 1302 | MATRIX | C-ES-LED | Endurance Climbmill with LED Console | — | unresolved | — | — | — |
| 1303 | MATRIX | T-ES-LED | Endurance Treadmill with LED Console | — | ambiguous_model | — | — | [Matrix Endurance LED Tread Graphite – Refurbished](https://cpo.matrixfitness.com/products/cardio/treadmills/matrix-endurance-led-tread-graphite-refurbished/) |
| 1304 | MATRIX | E-ES-LED | Endurance Suspension Elliptical with LED Console | — | unresolved | — | — | — |
| 1305 | MATRIX | U-ES-LED | Endurance Upright Cycle with LED Console | — | ambiguous_model | — | — | [Matrix Endurance LED Upright Cycle Graphite – Refurbished](https://cpo.matrixfitness.com/products/cardio/cycles/matrix-endurance-led-upright-cycle-graphite-refurbished/) |
| 1306 | MATRIX | S-ES-LED | Endurance Stepper with LED Console | — | ambiguous_model | — | — | [Matrix Endurance LED Stepper Black Matte Boxed Unit](https://cpo.matrixfitness.com/products/cardio/steppers/matrix-endurance-led-stepper-black-matte-boxed-unit-10/) |
| 1307 | MATRIX | R-ES-PLED | Endurance Recumbent Cycle with LED Premium Console | — | unresolved | — | — | — |
| 1308 | MATRIX | T-ES-PLED | Endurance Treadmill with LED Premium Console | — | ambiguous_model | — | — | [Matrix Endurance Premium LED Treadmill Refurbished](https://cpo.matrixfitness.com/products/cardio/treadmills/matrix-endurance-premium-led-treadmill-refurbished-2/) |
| 1309 | MATRIX | S-ES-PLED | Endurance Stepper with LED Premium Console | — | unresolved | — | — | — |
| 1310 | MATRIX | C-ES-PLED | Endurance ClimbMill with LED Premium Console | — | unresolved | — | — | — |
| 1311 | MATRIX | U-ES-PLED | Endurance Upright Cycle with LED Premium Console | — | ambiguous_model | — | — | [Matrix Endurance Premium LED Upright Cycle Black Matte Built](https://cpo.matrixfitness.com/products/cardio/cycles/mx-endurance-premium-led-upright-cycle-built/) |
| 1312 | MATRIX | A-PS-PLED | Performance Ascent Trainer with LED Premium Console | — | ambiguous_model | — | — | [Matrix Performance PLED Ascent Trainer Black Matte – Refurbished](https://cpo.matrixfitness.com/products/cardio/ascent-trainers/matrix-performance-led-ascent-trainer-black-matte-refurbished/) |
| 925 | NAUTILUS | 9NA-S1309 | Nautilus Impact Standing Calf | Impact® Standing Calf | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-standing-calf) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Standing-Calf-9NA-S1309-7-Product-Image-Web-e1655754254709.png?v=1731874851) | — |
| 963 | NAUTILUS | 9NN-L8506 | Nautilus Instinct Smith Machine | — | unresolved | — | — | — |
| 964 | NAUTILUS | 9NA-S1301 | Nautilus Impact Leg Curl | Impact® Leg Curl | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Leg-Curl-9NA-S1301-2-Product-Image-Web-e1655755616876.png?v=1731874814) | — |
| 965 | NAUTILUS | 9NA-S1305 | Nautilus Impact Seated Leg Press | Impact® Seated Leg Press | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-seated-leg-press) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Seated-Leg-Press-9NA-S1305-17-Product-Image-Web-e1656443223312.png?v=1731874789) | — |
| 968 | NAUTILUS | 9NA-S1312 | Nautilus Impact Leg Extension | Impact® Leg Extension | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-leg-extension) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Leg-Extension-9NA-S1312-7-Product-Image-Web-e1655753972660.png?v=1731874798) | — |
| 969 | NAUTILUS | 9NA-S1313 | Nautilus Impact Seated Leg Curl | Impact® Seated Leg Curl | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-seated-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Seated-Leg-Curl-9NA-S1313-7-Product-Image-Web-e1655756265531.png?v=1731874806) | — |
| 970 | NAUTILUS | 9NA-S1314 | Nautilus Impact Seated Leg Curl W/O ROM | — | candidate_requires_review | — | — | [Impact® Seated Leg Curl](https://www.corehandf.com/products/nautilus-impact-seated-leg-curl) |
| 971 | NAUTILUS | 9NA-S2301 | Nautilus Impact Incline Press | Impact® Incline Press | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-incline-press) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Incline-Press-9NA-S2301-1-Product-Image-Web-e1655747666242.png?v=1731874868) | — |
| 972 | NAUTILUS | 9NA-S3301 | Nautilus Impact Vertical Row | Impact® Vertical Row | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-vertical-row) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Vertical-Row-9NA-S3301-5-Product-Image-Web-e1655749237777.png?v=1731874901) | — |
| 973 | NAUTILUS | 9NA-S3302 | Nautilus Impact Low Back | Impact® Low Back | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-low-back) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Low-Back-9NA-S3302-7-Product-Image-Web-e1655746509926.png?v=1731874967) | — |
| 974 | NAUTILUS | 9NA-S3303 | Nautilus Impact Fixed Lat Pull Down | Impact® Fixed Lat Pull Down | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-fixed-lat-pull-down) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-FixedLatPullDown-9NA-S3303-3-Product-Image-Web-e1655748503737.png?v=1731874885) | — |
| 977 | NAUTILUS | 9NA-S4301 | Nautilus Impact Chest Press | Impact® Chest Press | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-chest-press) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Chest-Press-NA-S4301-2-Product-Image-Web-e1655754946259.png?v=1731874860) | — |
| 978 | NAUTILUS | 9NA-S4302 | Nautilus Impact Deltoid Raise | Impact® Deltoid Raise | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-deltoid-raise) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Deltoid-Raise-9NA-S4302-3-Product-Image-Web-e1655752783890.png?v=1731874925) | — |
| 979 | NAUTILUS | 9NA-S4304 | Nautilus Impact Deltoid Fly | Impact® Deltoid Fly | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-deltoid-fly) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Deltoid-Fly-9NA-S4304-2-Product-Image-Web-e1655748180126.png?v=1731874876) | — |
| 980 | NAUTILUS | 9NA-S4307 | Nautilus Impact Shoulder Press | Impact® Shoulder Press | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-shoulder-press) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Shoulder-Press-9NA-S4307-6-Product-Image-Web-e1655751434414.png?v=1731874917) | — |
| 981 | NAUTILUS | 9NA-S5301 | Nautilus Impact Biceps Curl | Impact® Biceps Curl | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-biceps-curl) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Biceps-Curl-9NA-S5301-2-Product-Image-Web-e1655753291524.png?v=1731874934) | — |
| 982 | NAUTILUS | 9NA-S5303 | Nautilus Impact Dip Machine | Impact® Dip Machine | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-dip-machine) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-TricepDip-9NA-S5303-6-Product-Image-Web-e1655747063746.png?v=1731874951) | — |
| 983 | NAUTILUS | 9NA-S6301 | Nautilus Impact Abdominal Machine | Impact® Abdominal | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-abdominal) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Abdominal-9NA-S6301-4-Product-Image-Web-e1655742130906.png?v=1731874976) | — |
| 984 | NAUTILUS | 9NA-S6334 | Nautilus Impact Chin Dip Assist | Impact® Chin Dip Assist | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-chin-dip-assist) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-Chin-Dip-Assist-9NA-S6334-3-Product-Image-Web-e1655755895542.png?v=1731874959) | — |
| 985 | NAUTILUS | 9-IPAC | Nautilus Inspiration Abdominal Crunch Gen3 | — | candidate_requires_review | — | — | [Inspiration® Abdominal Crunch](https://www.corehandf.com/products/nautilus-inspiration-abdominal-crunch) |
| 986 | NAUTILUS | 9-IPRT | Nautilus Inspiration Rotary Torso | — | candidate_requires_review | — | — | [Inspiration® Rotary Torso](https://www.corehandf.com/products/inspiration-rotary-torso) |
| 987 | NAUTILUS | 9-IPAA | Nautilus Inspiration Strength Abduction / Adduction | — | candidate_requires_review | — | — | [Inspiration® Abduction/ Adduction](https://www.corehandf.com/products/nautilus-inspiration-abduction-adduction) |
| 988 | NAUTILUS | 9-IPBA | Nautilus Inspiration Strength Bilateral Arm Curl | — | candidate_requires_review | — | — | [Inspiration® Bilateral Arm Curl](https://www.corehandf.com/products/nautilus-inspiration-bilateral-arm-curl) |
| 991 | NAUTILUS | 9-IPDR | Nautilus Inspiration Strength Deltoid Raise | — | candidate_requires_review | — | — | [Inspiration® Deltoid Raise](https://www.corehandf.com/products/nautilus-inspiration-deltoid-raise) |
| 992 | NAUTILUS | 9-IPGM | Nautilus Inspiration Strength Glute Press | — | candidate_requires_review | — | — | [Inspiration® Glute Press](https://www.corehandf.com/products/nautilus-inspiration-glute-press) |
| 993 | NAUTILUS | 9-IPLC | Nautilus Inspiration Strength Leg Curl | — | candidate_requires_review | — | — | [Inspiration® Leg Curl](https://www.corehandf.com/products/nautilus-inspiration-leg-curl) |
| 997 | NAUTILUS | 9-IPPF | Nautilus Inspiration Strength Pec Fly / Rear Deltoid | — | candidate_requires_review | — | — | [Inspiration® Pec Fly/Rear Deltoid](https://www.corehandf.com/products/nautilus-inspiration-pec-fly-rear-deltoid) |
| 998 | NAUTILUS | 9-IPPO | Nautilus Inspiration Strength Pullover Gen3 | — | unresolved | — | — | — |
| 999 | NAUTILUS | 9-IPSP | Nautilus Inspiration Strength Shoulder Press | — | candidate_requires_review | — | — | [Inspiration® Shoulder Press](https://www.corehandf.com/products/nautilus-inspiration-shoulder-press) |
| 1000 | NAUTILUS | 9-IPTD | Nautilus Inspiration Strength Tricep Press | — | unresolved | — | — | — |
| 1002 | NAUTILUS | 9-IPVP | Nautilus Inspiration Strength Chest Press | — | candidate_requires_review | — | — | [Inspiration® Chest Press](https://www.corehandf.com/products/nautilus-inspiration-chest-press) |
| 1006 | NAUTILUS | 9-HSLP | Nautilus HumanSport Lat Pulley | — | candidate_requires_review | — | — | [HumanSport® Lat Pulley](https://www.corehandf.com/products/nautilus-humansport-lat-pulley) |
| 1008 | NAUTILUS | 9-HSPL | Nautilus HumanSport Pull Lift | — | candidate_requires_review | — | — | [HumanSport® Pull Lift](https://www.corehandf.com/products/nautilus-humansport-pull-lift) |
| 1009 | NAUTILUS | 9-HSFT | Nautilus HumanSport Freedom Trainer | — | candidate_requires_review | — | — | [HumanSport® Freedom Trainer](https://www.corehandf.com/products/nautilus-humansport-freedom-trainer) |
| 1010 | NAUTILUS | 9NP3-L2002 | Nautilus Leverage Chest Press | — | candidate_requires_review | — | — | [Leverage Chest Press](https://www.corehandf.com/products/nautilus-leverage-chest-press) |
| 1011 | NAUTILUS | 9NP3-L2003 | Nautilus Leverage Incline Press | — | candidate_requires_review | — | — | [Leverage Incline Press](https://www.corehandf.com/products/nautilus-leverage-incline-press) |
| 1012 | NAUTILUS | 9NP3-L2004 | Nautilus Leverage Decline Press | — | candidate_requires_review | — | — | [Leverage Decline Press](https://www.corehandf.com/products/nautilus-leverage-decline-press) |
| 1014 | NAUTILUS | 9NP3-L3004 | Nautilus Leverage Row | — | candidate_requires_review | — | — | [Leverage Low Row](https://www.corehandf.com/products/nautilus-leverage-low-row) |
| 1015 | NAUTILUS | 9NP3-L3005 | Nautilus Leverage High Row | — | candidate_requires_review | — | — | [Leverage High Row](https://www.corehandf.com/products/nautilus-leverage-high-row) |
| 1017 | NAUTILUS | 9NP3-L4002 | Nautilus Leverage Shoulder Press | — | candidate_requires_review | — | — | [Leverage Shoulder Press](https://www.corehandf.com/products/nautilus-leverage-shoulder-press) |
| 1018 | NAUTILUS | 9NP3-L5002 | Nautilus Leverage Biceps Curl | — | candidate_requires_review | — | — | [Leverage Biceps Curl](https://www.corehandf.com/products/nautilus-leverage-biceps-curl) |
| 1019 | NAUTILUS | 9NP3-L5003 | Nautilus Leverage Abdominal Crunch | — | candidate_requires_review | — | — | [Leverage Abdominal Crunch](https://www.corehandf.com/products/nautilus-leverage-abdominal-crunch) |
| 1020 | NAUTILUS | 9NP-L1110 | Nautilus Plate Loaded Tilt Seat Calf | — | candidate_requires_review | — | — | [Tilt Seat Calf](https://www.corehandf.com/products/nautilus-plate-loaded-tilt-seat-calf) |
| 1022 | NAUTILUS | 9NP-L1130 | Nautilus Plate Loaded Hack Squat | — | candidate_requires_review | — | — | [Hack Squat](https://www.corehandf.com/products/nautilus-plate-loaded-hack-squat) |
| 1024 | NAUTILUS | 9NP-L1141 | Nautilus Plate Loaded Angled Leg Press | — | candidate_requires_review | — | — | [Angled Leg Press](https://www.corehandf.com/products/nautilus-plate-loaded-angled-leg-press) |
| 1025 | NAUTILUS | 9NP-L3140 | Nautilus Plate Loaded Incline Lever Row | — | candidate_requires_review | — | — | [Leverage Incline Lever Row](https://www.corehandf.com/products/nautilus-plate-loaded-incline-lever-row) |
| 1026 | NAUTILUS | 9NP-L8507 | Nautilus Freedom Rack | — | candidate_requires_review | — | — | [Freedom Rack](https://www.corehandf.com/products/nautilus-plate-loaded-freedom-rack) |
| 1027 | NAUTILUS | 9NP-L8500 | Nautilus Smith Machine | — | unresolved | — | — | — |
| 1028 | NAUTILUS | 9NP-M9201 | Nautilus Cross-Over Cables with Adj Pulleys | Cable Cross Over | model_verified | [source](https://www.corehandf.com/products/nautilus-multi-stations-cable-cross-over-exercise-tower) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Multistation-Cable-Cross-Over-6-Transparent-Product-Image-Web.png-Web.jpg?v=1761687878) | — |
| 1029 | NAUTILUS | 9NP-M9601 | Nautilus 4 Station | 4 Station | model_verified | [source](https://www.corehandf.com/products/nautilus-multi-stations-4-station) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Multistation-4-Station-1-Transparent-Product-Image-Web.png-Web.jpg?v=1761687733) | — |
| 1030 | NAUTILUS | 9NP-M9605 | Nautilus 5 Station with Adj Pulley | 5 Station | model_verified | [source](https://www.corehandf.com/products/nautilus-multi-stations-5-station-exercise-tower) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Multistation-5-Station-5-Transparent-Product-Image-Web.jpg?v=1761687831) | — |
| 1032 | NAUTILUS | 9NP-M9620 | Nautilus 14 Station | 14 Station | model_verified | [source](https://www.corehandf.com/products/nautilus-multi-stations-14-station-exercise-tower) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Multistation-14-Station-6-Transparent-Product-Image-Web.jpg?v=1761687765) | — |
| 1103 | NAUTILUS | 731-9092-KT | Nautilus SVA Platform Retro-Fit Kit | — | candidate_requires_review | — | — | [Nautilus SVA Platform](https://www.corehandf.com/products/nautilus-sva-platform) |
| 1104 | NAUTILUS | 9-HDHR2 | Nautilus Half Rack | — | ambiguous_model | — | — | [Half Rack Download Spec Sheet](https://www.corehandf.com/products/nautilus-benches-racks-half-rack) |
| 1105 | NAUTILUS | 9NA-S5302 | Nautilus Impact Triceps Extension | Impact® Triceps Extension | model_verified | [source](https://www.corehandf.com/products/nautilus-impact-triceps-extension) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Impact-TricepExtension-9NA-S5302-5-Product-Image-Web-e1655756510137.png?v=1731874943) | — |
| 1106 | NAUTILUS | 9NN-B7200 | Nautilus Adjustable Abdominal / Decline Bench | Instinct® Adjustable Abdominal Decline Bench | model_verified | [source](https://www.corehandf.com/products/nautilus-instinct-adjustable-abdominal-decline-bench) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Benches-Racks-Instinct-Adjustable-Decline-Bench-9NN-B7200-60AR.png?v=1761683413) | — |
| 1110 | NAUTILUS | 9NN-B7505 | Nautilus Abdominal Bench | Instinct® Ab Bench | model_verified | [source](https://www.corehandf.com/products/nautilus-instinct-ab-bench) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Nautilus-Benches-Racks-Ab-Bench-9NN-B7505-60AR.png?v=1761683526) | — |
| 1116 | NAUTILUS | 9NP-B7506 | Nautilus Multi Adjustable Bench | Multi-Adjustable Bench | model_verified | [source](https://www.corehandf.com/products/nautilus-benchesandracks-multi-adjustable-bench) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_Multi_Adjust_Bench-60.png?v=1731875126) | — |
| 1120 | NAUTILUS | 9NP-B7510 | Nautilus Adjustable Abdominal Bench | Adjustable Abdominal Bench | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-adjustable-abdominal-bench) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks__Adjustable_Abdominal_Decline_Bench-60-1.png?v=1731875179) | — |
| 1121 | NAUTILUS | 9NP-B7511 | Nautilus Pull-up / Dip / Leg Raise | Pull-Up/Dip/Leg Raise | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-pull-up-dip-leg-raise) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_PullUp_Dip_LegRaise-60.png?v=1731875212) | — |
| 1122 | NAUTILUS | 9NP-B7514 | Nautilus Adjustable Back Extension | Adjustable Back Extension | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-adjustable-back-extension) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_45_Back_Extention-60.png?v=1731875170) | — |
| 1123 | NAUTILUS | 9NP-B7515 | Nautilus Standing Preacher Curl | Standing Preacher Curl | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-standing-preacher-curl) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_Standing_Preacher_Curl-60.png?v=1731875198) | — |
| 1125 | NAUTILUS | 9NP-B7517 | Nautilus Leg Raise / Dip | Leg Raise/Dip | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-leg-raise-dip) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_Leg_Raise_Dip-60.png?v=1731875221) | — |
| 1128 | NAUTILUS | 9NP-B7524 | Nautilus Stretch Bench | Stretch Bench | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-stretch-bench) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches-Racks-Stretch-Bench-9NP-B7524-60.png?v=1731875704) | — |
| 1129 | NAUTILUS | 9NP-D9302 | Nautilus Inspiration Strength Dual Adjustable Pulley | — | candidate_requires_review | — | — | [Inspiration® Dual Adjustable Pulley](https://www.corehandf.com/products/nautilus-inspiration-dual-adjustable-pulley) |
| 1130 | NAUTILUS | 9NP-L1131 | Nautilus Glute Drive | — | candidate_requires_review | — | — | [Glute Drive](https://www.corehandf.com/products/nautilus-plate-loaded-glute-drive) |
| 1131 | NAUTILUS | 9NP-R7512 | Nautilus 2 Sided Olympic Weight Tree | 2-Sided Olympic Weight Tree | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-2-sided-olympic-weight-tree) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_2_Sided_Olympic_Weight_Tree-26.png?v=1731875410) | — |
| 1133 | NAUTILUS | 9NP-R8005 | Nautilus Power Cage | Power Cage SVA Combo | model_verified | [source](https://www.corehandf.com/products/nautilus-power-cage-sva-combo) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Power-Cage-with-6ft-SVA-Platform-9NP-R8005-9-HDP6D-BB2-5.jpg?v=1732692331) | — |
| 1135 | NAUTILUS | 9NP-R8009 | Nautilus Single Dumbbell Rack | Single Dumbbell Rack | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-single-dumbbell-rack) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_Single_Dumbbell_Rack-60.png?v=1731875284) | — |
| 1136 | NAUTILUS | 9NP-R8012 | Nautilus Barbell Rack | Barbell Rack | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-barbell-rack) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_Barbell_Rack-60.png?v=1731875393) | — |
| 1139 | NAUTILUS | 9NP-R8023 | Nautilus Triple Dumbbell Rack | Triple Dumbbell Rack | model_verified | [source](https://www.corehandf.com/products/nautilus-benches-racks-triple-dumbbell-rack) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/Benches__Racks_Triple_Dumbbell_Rack-60.png?v=1731875374) | — |
| 1170 | NAUTILUS | 9NL-d1015 | INSTINCT® DUAL INNER/OUTER THIGH | Instinct® Dual Inner/Outer Thigh | model_verified | [source](https://www.corehandf.com/products/nautilus-instinct-dual-inner-outer-thigh) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/nautilus-instinct-dual-inner-outer-thigh-9nl-d1015-06-product-image-1.webp?v=1731874598) | — |
| 1182 | NAUTILUS | 9NP-M96 | 16 Stack Multi Stations | — | unresolved | — | — | — |
| 1183 | NAUTILUS | — | 32 Stack Multi-Stations | — | unresolved | — | — | — |
| 172 | NEWTECH | NT-OH-APFRD | Pec Dec Fly with Reverse | — | candidate_requires_review | — | — | [OnHim Pec Dec Fly (With Reverse)](https://newtechworldwide.com/products/pec-dec-fly-with-reverse) |
| 173 | NEWTECH | NT-OH-SBF | Standing Fly Chest & Back | OnHim Standing Fly Chest & Back | model_verified | [source](https://newtechworldwide.com/products/standing-fly-chest-back) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/4c7fc01d22ca6.png?v=1732069188) | — |
| 174 | NEWTECH | NT-OH-LPD | Lat Pulldown (High Pulley) | OnHim Lat Pulldown (High Pulley) | model_verified | [source](https://newtechworldwide.com/products/lat-pulldown-high-pulley) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/fe457a5afaa18.png?v=1732070133) | — |
| 175 | NEWTECH | NT-OH-ALP | Adjustable Low Pulley | OnHim Adjustable Low Pulley | model_verified | [source](https://newtechworldwide.com/products/adjustable-low-pulley) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/0ac1f0e6814dd_7bae1e13-4d69-498f-9395-71171d5aab9d.png?v=1732071087) | — |
| 176 | NEWTECH | 5 NT-OH-CDA | Chin-Up, Dip Assist (THOMSON) | OnHim Chin-Up, Dip Assist (Thomson) | model_verified | [source](https://newtechworldwide.com/products/chin-up-dip-assist) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/f9d11c56ae218.png?v=1732071138) | — |
| 177 | NEWTECH | NT-OH-SP | Shoulder Press | OnHim Shoulder Press | model_verified | [source](https://newtechworldwide.com/products/shoulder-press) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/7bbc36f2b6708.png?v=1732071179) | — |
| 178 | NEWTECH | NT-OH-LR | Seated Lateal Raise | OnHim Seated Lateral Raise | model_verified | [source](https://newtechworldwide.com/products/lateral-raise) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/7f85e60994a98.png?v=1732071219) | — |
| 179 | NEWTECH | NT-OH-SLR | Standing Lateral Raise | OnHim Standing Lateral Raise | model_verified | [source](https://newtechworldwide.com/products/standing-lateral-raise) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/cef87581efb74.png?v=1732071296) | — |
| 180 | NEWTECH | NT-OH-AC | Arm Curl | OnHim Arm Curl | model_verified | [source](https://newtechworldwide.com/products/arm-curl) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/7195546d82d32.png?v=1732077498) | — |
| 181 | NEWTECH | NT-OH-SD | Seated Dip | OnHim Seated Dip | model_verified | [source](https://newtechworldwide.com/products/seated-dip) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/8b477a968e551.png?v=1732077515) | — |
| 182 | NEWTECH | 1 NT-OH-LE | Leg Extension | OnHim Leg Extension | model_verified | [source](https://newtechworldwide.com/products/leg-extension) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/cc2cf6b1a882e.png?v=1732077596) | — |
| 183 | NEWTECH | 2 NT-OH-LC | Leg Curl | OnHim Leg Curl | model_verified | [source](https://newtechworldwide.com/products/leg-curl) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/0d25ee5ba4882.png?v=1732077615) | — |
| 184 | NEWTECH | NT-OH-ADDABD | Hip Add/Abd Combo | OnHim Hip Adduction/Abduction Combo | model_verified | [source](https://newtechworldwide.com/products/hip-adduction-abduction-combo) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/0a343d654654c.png?v=1732077657) | — |
| 185 | NEWTECH | NT-OH-( R )-SCP S | Seated Chest Press (Rotary) | — | candidate_requires_review | — | — | [Torture Seated Chest Press (Rotary)](https://newtechworldwide.com/products/seated-chest-press-2) |
| 186 | NEWTECH | NT-OH-( R )-SR-I | Seated Row - Internal | — | candidate_requires_review | — | — | [Torture Seated Row](https://newtechworldwide.com/products/seated-row-2) |
| 187 | NEWTECH | NT-OH-( R )-SR-O | Seated Row - External | — | candidate_requires_review | — | — | [Torture Seated Row](https://newtechworldwide.com/products/seated-row-2) |
| 188 | NEWTECH | 7 NT-OH-SR | Seated Row | OnHim Seated Row | model_verified | [source](https://newtechworldwide.com/products/seated-row) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/af5a488624e7a_2255ae17-e043-4af2-b032-9b39717b9218.png?v=1732070338) | — |
| 189 | NEWTECH | NT-OH-SMABD | Hip Abduction (Single Move) 、 | OnHim Hip Abduction (Single Move) (New) | model_verified | [source](https://newtechworldwide.com/products/hip-abduction-single-move) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/418643e8feafe.png?v=1732077643) | — |
| 190 | NEWTECH | NT-OH-VR | R Low Cable | OnHim Multi Low Cable (NEW) | model_verified | [source](https://newtechworldwide.com/products/low-cable-new) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/Low_Cable_New.jpg?v=1763595548) | — |
| 191 | NEWTECH | NT-OH-SHR | Kneeling Hip Raises、 | OnHim Kneeling Hip Raise | model_verified | [source](https://newtechworldwide.com/products/onhim-kneeling-hip-raise) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/Kneeling_Hip_Raise_new.jpg?v=1763595720) | — |
| 192 | NEWTECH | NT-OH-RH | Reverse Hyper | OnHim Reverse Hyper (NEW) | model_verified | [source](https://newtechworldwide.com/products/onhim-reverse-hyper-new) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/Reverse_Hyper_New.jpg?v=1763595965) | — |
| 193 | NEWTECH | NT-OH-LPD（N) | Double Pulley Pulldown | — | unresolved | — | — | — |
| 194 | NEWTECH | NT-OH-SLC | Leg Extension | OnHim Seated Leg Curl (NEW) | model_verified | [source](https://newtechworldwide.com/products/onhim-seated-leg-curl-new) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/seatedlegcurl.png?v=1764115231) | — |
| 195 | NEWTECH | NT-T-(R)-LR | Torture Low Row (Rotary) | — | candidate_requires_review | — | — | [Torture Low Row (Rotary) (NEW)](https://newtechworldwide.com/products/low-row-2-r) |
| 196 | NEWTECH | NT-T-(R)-SR | R Torture Seated Row (Rotary) | — | candidate_requires_review | — | — | [Torture Seated Row](https://newtechworldwide.com/products/seated-row-2) |
| 197 | NEWTECH | 3 NT-T-(R)-HTT | Torture Hip Thrust (Rotary) | — | candidate_requires_review | — | — | [Torture Hip Thrust (Rotary) (NEW)](https://newtechworldwide.com/products/hip-thrust-1) |
| 198 | NEWTECH | NT-T-HS-(P) | Torture Hack Squat (thomson) (Rotary) | — | candidate_requires_review | — | — | [Torture Hack Squat (Thomson)](https://newtechworldwide.com/products/hack-squat) |
| 199 | NEWTECH | NT-T-PLP-(P) | Torture Power Leg Press Premium (THOMSON ) | — | candidate_requires_review | — | — | [Torture Power Leg Press Premium (Thomson) (NEW)](https://newtechworldwide.com/products/toture-power-leg-press-premium-thomsonnew) |
| 200 | NEWTECH | NT-T-FR2 | Torture Front Row | Torture Front Row | model_verified | [source](https://newtechworldwide.com/products/front-row) | [image](http://newtechworldwide.com/cdn/shop/files/56ef0d04f3ddf.png?v=1732085963) | — |
| 201 | NEWTECH | NT-T-WP(R)-2 | Torture Wide Pulldown Rear2 | Torture Wide Pulldown Rear 2 | model_verified | [source](https://newtechworldwide.com/products/wide-pulldown-rear-2) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/72458547bdbe1.png?v=1732086060) | — |
| 202 | NEWTECH | NT-T-2WR | Torture Two Way Row (new) | Torture 2 Way Row | model_verified | [source](https://newtechworldwide.com/products/two-way-row) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/b3d53672ffb9f.png?v=1732086211) | — |
| 203 | NEWTECH | NT-T-WCP | Torture Wide Chest Press | Torture Wide Chest Press | model_verified | [source](https://newtechworldwide.com/products/wide-chest-press) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/d852b1c7e8cd9.png?v=1732086337) | — |
| 204 | NEWTECH | NT-T-ICP | Torture Incline Chest Press | Torture Incline Chest Press | model_verified | [source](https://newtechworldwide.com/products/incline-chest-press-1) | [image](http://newtechworldwide.com/cdn/shop/files/16b8574493280.png?v=1732086335) | — |
| 205 | NEWTECH | NT-T-SDCP | Seated Incline Chest Press | Torture Chest & Decline Combo | model_verified | [source](https://newtechworldwide.com/products/chest-decline-combo) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/02e790ae82f67.png?v=1732086396) | — |
| 206 | NEWTECH | NT-T-PFRD | Torture Peck Deck fly with reverse(new) | Torture Pec Dec Fly | model_verified | [source](https://newtechworldwide.com/products/pec-dec-fly) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/8541193e3056d.png?v=1732086455) | — |
| 207 | NEWTECH | NT-T-SP | Torture Shoulder Press | Torture Shoulder Press | model_verified | [source](https://newtechworldwide.com/products/shoulder-press-2) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/e5e9c3ee0013c.png?v=1732086451) | — |
| 208 | NEWTECH | NT-T-LTR | Torture Lateral Raise | Torture Lateral Raise | model_verified | [source](https://newtechworldwide.com/products/lateral-raise-1) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/5c0faa10222d9.png?v=1732086448) | — |
| 209 | NEWTECH | NT-T-AC | Torture Arm Curl | Torture Arm Curl | model_verified | [source](https://newtechworldwide.com/products/arm-curl-2) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/d45d43e330971.png?v=1732086639) | — |
| 210 | NEWTECH | NT-T-OHE | Torture Overhead Extension | Torture Overhead Extension | model_verified | [source](https://newtechworldwide.com/products/over-head-extension) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/035b1f6d00222.png?v=1732086636) | — |
| 211 | NEWTECH | NT-T-SCR | Torture Squat & Caf Raise(new) | Torture Squat & Calf Raise | model_verified | [source](https://newtechworldwide.com/products/squat-calf-raise) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/6bc4d2c8f21ab.png?v=1732087058) | — |
| 212 | NEWTECH | NT-T-DS | Torture Drop Squat(new) | Torture Drop Squat | model_verified | [source](https://newtechworldwide.com/products/drop-squat) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/f69d627a2dc7a.png?v=1732087055) | — |
| 213 | NEWTECH | NT-T-HP | Torture Hack Press (THOMSON) | Torture Hack Press (Thomson) | model_verified | [source](https://newtechworldwide.com/products/hack-press) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/06820a7feadf0.png?v=1732087049) | — |
| 214 | NEWTECH | NT-T-KLC | Torture Kneeling Leg Curl | Torture Kneeling Leg Curl | model_verified | [source](https://newtechworldwide.com/products/kneeling-leg-curl) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/cd61000e7f267.png?v=1732087229) | — |
| 215 | NEWTECH | NT-T-HR | High Row | Torture High Row | model_verified | [source](https://newtechworldwide.com/products/high-row) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/0998a66f7fe3d.png?v=1732086103) | — |
| 216 | NEWTECH | NT-T-VPD | Vertical Pulldown | Torture Vertical Pull Down | model_verified | [source](https://newtechworldwide.com/products/vertical-pull-down) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/576e3e12f9f37.png?v=1732086103) | — |
| 217 | NEWTECH | — | Torture Belt Squat | — | candidate_requires_review | — | — | [Torture Belt Squat (NEW)](https://newtechworldwide.com/products/torture-belt-squat-new) |
| 218 | NEWTECH | NT-T-LTB | Linear T-barrow | — | unresolved | — | — | — |
| 219 | NEWTECH | 1 NT-P-3DHS | 3D + Smith + Half Rack | — | candidate_requires_review | — | — | [3D + Smith + Half Rack (Thomson)](https://newtechworldwide.com/products/3d-smith-half-rack) |
| 220 | NEWTECH | NT-P-SHR (SLING) | Smith + Half Rack (THOMSON) | — | candidate_requires_review | — | — | [Smith Machine & Half Rack (Thomson)](https://newtechworldwide.com/products/smith-half-rack) |
| 221 | NEWTECH | NT-P-A20 | Smith Machine (Angle) (THOMSON) | — | candidate_requires_review | — | — | [Smith Machine (Angle) (Thomson)](https://newtechworldwide.com/products/smith-angle-2000) |
| 222 | NEWTECH | NT-F-SR | Squat Rack | Squat Rack | model_verified | [source](https://newtechworldwide.com/products/squat-rack) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/Squat_rack.jpg?v=1764119251) | — |
| 223 | NEWTECH | NT-P-FBP | Plate Flat Bench | Plate Flat Press | model_verified | [source](https://newtechworldwide.com/products/plate-flat-press) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/08052bf3babf9_1.png?v=1732083714) | — |
| 224 | NEWTECH | NT-P-IBP | Plate Incline Bench | Plate Incline Press | model_verified | [source](https://newtechworldwide.com/products/plate-incline-press) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/7ad59bd579375_1.png?v=1732083662) | — |
| 226 | NEWTECH | NT-P-SP | P Plate Shoulder Press | Plate Shoulder Press | model_verified | [source](https://newtechworldwide.com/products/plate-shouldwe-press) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/e2270cb06fa32_1.png?v=1732083559) | — |
| 227 | NEWTECH | NT-F-MOB | MV MV Olympic Bench | MV Olympic Bench | model_verified | [source](https://newtechworldwide.com/products/mv-olympic-bench) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/c3543371f7061_1.png?v=1732083509) | — |
| 228 | NEWTECH | NT-F-O | Olympic Bench | — | candidate_requires_review | — | — | [Olympic Bench](https://newtechworldwide.com/products/olympic-bench) |
| 229 | NEWTECH | NT-F-OIB | Incline Bench Press | Olympic Incline Bench | model_verified | [source](https://newtechworldwide.com/products/olympia-incline-bench) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/c4e4decbc890d_1.png?v=1732083431) | — |
| 231 | NEWTECH | NT-F-AIB | Adjust Incilne Bench | Adjustable Incline Bench | model_verified | [source](https://newtechworldwide.com/products/adjustable-incline-bench) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/0695f1d2d5b5a_1.png?v=1732083309) | — |
| 232 | NEWTECH | NT-F-ADB | Adjust Decilne Bench | Adjustable Decline Bench | model_verified | [source](https://newtechworldwide.com/products/adjustable-decline-bench) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/e44fa8b050860_1.png?v=1732083259) | — |
| 234 | NEWTECH | NT-F-UB | Utility Bench | Utility Bench | model_verified | [source](https://newtechworldwide.com/products/utility-bench) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/7167f29191a51_c543e471-b23d-41d1-969a-44d6d9f6d5ad.png?v=1732083091) | — |
| 235 | NEWTECH | 7 NT-F-PCB | Preacher Curl Bench | Preacher Curl Bench (Rotary) | model_verified | [source](https://newtechworldwide.com/products/preacher-curl-bench) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/238370125d653.png?v=1732084456) | — |
| 236 | NEWTECH | NT-F-PCB-S | Preacher Curl Bench (stand type) | Preacher Curl Bench (Stand Type) | model_verified | [source](https://newtechworldwide.com/products/preacher-curl-bench-stand-type) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/c318ae4af6e97.png?v=1732084462) | — |
| 237 | NEWTECH | NT-F-HTTB | Hip Thrust Bench | Hip Thrust Bench | model_verified | [source](https://newtechworldwide.com/products/hip-thrust-bench) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/32b7f570a0eb9.png?v=1732084546) | — |
| 238 | NEWTECH | NT-F-SU | Sit Up | Sit Up | model_verified | [source](https://newtechworldwide.com/products/sit-up) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/d41f647f614f7.png?v=1732084640) | — |
| 239 | NEWTECH | 1 NT-F-MLR | Moving Leg Raise | Moving Leg Raise | model_verified | [source](https://newtechworldwide.com/products/moving-leg-raise) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/bf67b03f3c956.png?v=1732084640) | — |
| 240 | NEWTECH | NT-F-DLR | Dip & Leg Raise | Dip & Leg Raise | model_verified | [source](https://newtechworldwide.com/products/dip-leg-raise) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/8a9e28861bc38.png?v=1732084718) | — |
| 241 | NEWTECH | NT-F-RC | Roman Chair (45~90° Adjustable) | Roman Chair (45~90° Adjust Type) | model_verified | [source](https://newtechworldwide.com/products/roman-chair-45-90-adjust-type) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/8ce2c118038f3.png?v=1732084795) | — |
| 242 | NEWTECH | NT-P-BLR/MLR | Multi Lateral Raise | — | candidate_requires_review | — | — | [Multi Lateral Raise](https://newtechworldwide.com/products/multi-lateral-raise) |
| 243 | NEWTECH | NT-P-TR | T-Bar Row T- | T-Bar Row | model_verified | [source](https://newtechworldwide.com/products/t-bar-row) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/46f8bd43c239d.png?v=1732084869) | — |
| 244 | NEWTECH | NT-F-DBR | 14-Pair Dumbbell Rack | Dumbbell Rack (3 Tier) | model_verified | [source](https://newtechworldwide.com/products/dumbbell-rack-basic-type) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/6a247488b98b7.png?v=1732085004) | — |
| 246 | NEWTECH | NT-F-DR | Discus Rack | Plates Rack | model_verified | [source](https://newtechworldwide.com/products/plates-rack) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/212aa9e30334f.png?v=1732085171) | — |
| 247 | NEWTECH | NT-F-FBR | Fixed Barbell Rack | Fixed Barbell Rack | model_verified | [source](https://newtechworldwide.com/products/fixed-barbell-reack) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/e6cc64781a44c.png?v=1732085171) | — |
| 248 | NEWTECH | NT-F-HDR-P | Handle Rack Pro | Handle Rack Pro | model_verified | [source](https://newtechworldwide.com/products/handle-rack-pro) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/5f161042afa6c.png?v=1732085345) | — |
| 249 | NEWTECH | NT-C-MP8ST | Multi Gym Pro (8Station) | Multi Gym Pro (8Station) | model_verified | [source](https://newtechworldwide.com/products/multi-gym-pro-8station) | [image](http://newtechworldwide.com/cdn/shop/files/136ed128be028.png?v=1732088587) | — |
| 250 | NEWTECH | NT-C-DPP-2 | Multi Pully | Multi Pulley | model_verified | [source](https://newtechworldwide.com/products/multi-pulley) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/c4fbe944551e4.png?v=1732088470) | — |
| 251 | NEWTECH | NT-C-TC | Tri Cable | Tri Cable | model_verified | [source](https://newtechworldwide.com/products/tri-cable) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/c432acad94e95.png?v=1732088461) | — |
| 1091 | NEWTECH | NT-OH-RT | OnHim Rotary Torso | OnHim Rotary Torso | model_verified | [source](https://newtechworldwide.com/products/rotary-torso) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/890e6294518b8.png?v=1732077528) | — |
| 1092 | NEWTECH | T-LE | Torture Leg Extension | — | candidate_requires_review | — | — | [Torture Leg Extension](https://newtechworldwide.com/products/leg-extension-2) |
| 1093 | NEWTECH | T-WP(F) | Torture Wide Pulldown Front | — | candidate_requires_review | — | — | [Torture Wide Pulldown Front](https://newtechworldwide.com/products/wide-pulldown-front) |
| 1094 | NEWTECH | NT-OH-GH | OnHim Glute Kick-Back | OnHim Glute Kick-Back | model_verified | [source](https://newtechworldwide.com/products/glute-kick-back) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/34ab91f3cad05.png?v=1732077678) | — |
| 1095 | NEWTECH | NT-T-VSQS | Newtech M-Torture V Squat | — | unresolved | — | — | — |
| 1159 | NEWTECH | NT-T-LR-2 | M-Torture Low Row Gen2 | Torture Low Row 2 (NEW) | model_verified | [source](https://newtechworldwide.com/products/torture-low-row-2) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/newtech-torture-low-row-2-1.png?v=1793041822) | — |
| 1160 | NEWTECH | N. T(R)-SSRC | Torture Standing & Seated Row Combo (New) | — | candidate_requires_review | — | — | [Torture Standing & Seated Row Combo (NEW)](https://newtechworldwide.com/products/standing-seated-low-combo) |
| 1397 | NEWTECH | P-SM20 | Smith Machine (Vertical) | — | candidate_requires_review | — | — | [Smith Machine (Vertical) (Thomson)](https://newtechworldwide.com/products/smith-vertical-2000) |
| 1398 | NEWTECH | C-MP8ST | Multi Gym Pro (8Station) | — | candidate_requires_review | — | — | [Multi Gym Pro (8Station)](https://newtechworldwide.com/products/multi-gym-pro-8station) |
| 1400 | NEWTECH | NT-OH-SSP | ONHIM Super Leg Press | OnHim Super Leg Press (Thomson) (NEW) | model_verified | [source](https://newtechworldwide.com/products/onhim-super-leg-press-new) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/newtech-super-leg-press.jpg?v=1781038136) | — |
| 1401 | NEWTECH | NT-P-SM20 | Smith Machine (Vertical)(THOMSON) | Smith Machine (Vertical) (Thomson) | model_verified | [source](https://newtechworldwide.com/products/smith-vertical-2000) | [image](http://newtechworldwide.com/cdn/shop/files/Smith_vertical_2000s_7d63cc74-1259-43a6-890a-1ca80612fdc0.jpg?v=1764118420) | — |
| 1402 | NEWTECH | NT-OH-AB | ONHIM Abdominal | — | unresolved | — | — | — |
| 1403 | NEWTECH | NT-C-DP | Dual Pulley | Dual Pulley | model_verified | [source](https://newtechworldwide.com/products/dual-pulley) | [image](http://newtechworldwide.com/cdn/shop/files/7681cddf0cd70.png?v=1732088466) | — |
| 1404 | NEWTECH | NT-T-GH | Torture Glute Ham | Torture Glute Kick-Back | model_verified | [source](https://newtechworldwide.com/products/glute-kick-back-2) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/294aa96ba7364.png?v=1732087337) | — |
| 1476 | NEWTECH | NT-F-HR | Half Rack | Half Rack | model_verified | [source](https://newtechworldwide.com/products/half-rack) | [image](http://newtechworldwide.com/cdn/shop/files/half_rack.jpg?v=1764119160) | — |
| 1477 | NEWTECH | NT-OH-SLP | ONHIM Seated Leg Press (THOMSON) | OnHim Seated Leg Press (Thomson) | model_verified | [source](https://newtechworldwide.com/products/seated-leg-press) | [image](https://cdn.shopify.com/s/files/1/0625/6171/4264/files/79139ece38113.png?v=1732077636) | — |
| 1490 | NEWTECH | NT-T-MTTR | Linear T-Bar Row (NEW) | Torture Linear T-Bar Row (NEW) | model_verified | [source](https://newtechworldwide.com/products/torture-linear-t-bar-row) | [image](http://newtechworldwide.com/cdn/shop/files/newtech-torture-linear-t-bar-row-3.png?v=1793042322) | — |
| 366 | PANATTA | 1FE008 | Total Back | — | unresolved | — | — | — |
| 368 | PANATTA | 1FE001 | Lat pulldown | Lat pulldown | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 369 | PANATTA | 1FE101 | Lat pulldown double Stack | Lat pulldown double Stack | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 370 | PANATTA | 1FE002 | Lat pulldown circular | Lat pulldown circular | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 373 | PANATTA | 1FE003 | Pulley row | Pulley row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 375 | PANATTA | 1FE004A | Rowing machine circular | Rowing machine circular | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 376 | PANATTA | 1FE025 | Deltoid press | Deltoid press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 377 | PANATTA | 1FE024 | Deltoid press circular | Deltoid press circular | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 380 | PANATTA | 1FE036 | Vertical chest press | Vertical chest press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 382 | PANATTA | 1FE034 | INCLINED CHEST PRESS CIRCULAR | Inclined chest press circular | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 385 | PANATTA | 1FE038 | Dips press | Dips press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 386 | PANATTA | 1FE053 | Triceps machine | Triceps machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 388 | PANATTA | 1FE051 | CURLING MACHINE | Curling machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 390 | PANATTA | 1FE356 | Alternate arm curl 120 | Alternate arm curl 120 | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 391 | PANATTA | 1FE456 | Alternate arm curl -45 | Alternate arm curl -45 | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 395 | PANATTA | 1FE067 | Abdominal crunch | Abdominal crunch | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 396 | PANATTA | 1FE066 | Torsion machine | Torsion machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 397 | PANATTA | 1FE081 | Leg extension | Leg extension | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 398 | PANATTA | 1FE082 | Leg curling | Leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 399 | PANATTA | 1FE083 | Seated leg curling | Seated leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 400 | PANATTA | 1FE084 | STANDING LEG CURLING | Standing leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/10/) | — | — |
| 401 | PANATTA | 1FE095 | Dual system horizontal leg press | Dual system horizontal leg press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 402 | PANATTA | 1FE085 | Horizontal leg press | Horizontal leg press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 403 | PANATTA | 1FE086 | Abductor machine | Abductor machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 404 | PANATTA | 1FE087 | Adductor machine | Adductor machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 405 | PANATTA | 1FE093 | ADDUCTOR/ ABDUCTOR MACHINE | Adductor/ abductor machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 406 | PANATTA | 1FE094A | Master gluteus plus | Master gluteus plus | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 407 | PANATTA | 1FE088 | Gluteus machine | Gluteus machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 408 | PANATTA | 1FE097 | Hip thrust | Hip thrust | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 409 | PANATTA | 1FE089 | Calf machine | Calf machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 410 | PANATTA | 1FE096 | Standing abductor machine | Standing abductor machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/11/) | — | — |
| 414 | PANATTA | 1FE055A | Standing Total Arms | Standing Total Arms | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/12/) | — | — |
| 416 | PANATTA | 1FE118A | Multipurpose press | Multipurpose press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/12/) | — | — |
| 417 | PANATTA | 1FE117 | Peck back | Peck back | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/12/) | — | — |
| 418 | PANATTA | 1FE121 | CHIN AND DIP COUNTERBALANCED | Chin and dip counterbalanced | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/12/) | — | — |
| 419 | PANATTA | 1FE202 | Flat bench | Flat bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/12/) | — | — |
| 427 | PANATTA | 1FE210 | Adjustable crunch board | Adjustable crunch board | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 432 | PANATTA | 1FE221 | Iperextension 45° bench | Iperextension 45° bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 433 | PANATTA | 1FE230 | Squat rack | Squat rack | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 434 | PANATTA | 1FE201 | Fully adjustable bench | Fully adjustable bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 435 | PANATTA | 1FE211 | Chin and dip | Chin and dip | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 436 | PANATTA | 1HP233 | Military bench | Power tower | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/20/) | — | — |
| 437 | PANATTA | 1FE204 | Multipurpose seated bench | Multipurpose seated bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 438 | PANATTA | 1FE231A | Sissy squat | Sissy squat | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 441 | PANATTA | 1PWL103 | POWERLIFTING BENCH | Powerlifting bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/23/) | — | — |
| 616 | PANATTA | 1MTH002 | Lat pulldown circular | Lat pulldown circular | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 617 | PANATTA | 1MTH007 | Lat pulldown convergent | Lat pulldown convergent | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 618 | PANATTA | 1MTH006 | High row convergent | High row convergent | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 620 | PANATTA | 1MTH004A | Rowing machine circular | Rowing machine circular | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 621 | PANATTA | 1MTH024 | Deltoid press circular | Deltoid press circular | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 623 | PANATTA | 1MTH033 | VERTICAL CHEST PRESS CIRCULAR | Vertical chest press circular | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 624 | PANATTA | 1MTH034 | INCLINED CHEST PRESS CIRCULAR | Inclined chest press circular | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 630 | PANATTA | 1MTH057 | Alternate arm extension | Alternate arm extension | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/7/) | — | — |
| 634 | PANATTA | 1MTH067 | Abdominal crunch | Abdominal crunch | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/7/) | — | — |
| 638 | PANATTA | 1MTH085 | Horizontal Adjustable leg press | Horizontal Adjustable leg press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/7/) | — | — |
| 643 | PANATTA | 1MTH088 | Gluteus machine | Gluteus machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/7/) | — | — |
| 644 | PANATTA | 1MTH097 | Hip thrust | Hip thrust | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/8/) | — | — |
| 654 | PANATTA | 1MTH115 | Jungle machine | Jungle machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/8/) | — | — |
| 659 | PANATTA | 1MTH028 | Standing multi flight | Standing multi flight | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/8/) | — | — |
| 662 | PANATTA | 1SC001 | Lat pulldown | Lat pulldown | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/13/) | — | — |
| 663 | PANATTA | 1SC003 | Pulley row | Pulley row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/14/) | — | — |
| 666 | PANATTA | 1SC037 | Inclined chest press | Inclined chest press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/14/) | — | — |
| 668 | PANATTA | 1SC024 | Deltoid press convergent | Deltoid press convergent | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/14/) | — | — |
| 669 | PANATTA | 1SC051 | Curling machine | Curling machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/14/) | — | — |
| 672 | PANATTA | 1SC065 | Upper abdominal | Upper abdominal | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/14/) | — | — |
| 682 | PANATTA | 1SC090 | MULTI HIP | Multi hip | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/15/) | — | — |
| 690 | PANATTA | 1SC115 | JUNGLE MACHINE | Jungle machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/15/) | — | — |
| 704 | PANATTA | 1SC211 | CHIN AND DIP (CHIN OPTIONAL) | Chin and dip (chin optional) | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | — |
| 706 | PANATTA | 1SC297 | HIP THRUST BENCH | Hip thrust bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | [Hip thrust bench \| Panatta Sport](https://www.panattasport.com/en/sec/hip-thrust-bench/) |
| 709 | PANATTA | 1SCD050 | DUAL CURLING \| TRICEPS MACHINE | Dual curling \| triceps machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | [Dual curling \| triceps machine \| Panatta Sport](https://panattasport.com/en/sec/dual-curling-triceps-machine/) |
| 710 | PANATTA | 1SCD030 | MULTI PRESS | Multi press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | [Multi press \| Panatta Sport](https://www.panattasport.com/en/sec/multi-press) |
| 711 | PANATTA | 1SCD060 | DUAL ABDOMINAL \| LOWER BACK | Dual abdominal \| lower back | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | [Dual abdominal \| lower back \| Panatta Sport](https://www.panattasport.com/it/sec/dual-abdominal-lower-back/) |
| 712 | PANATTA | 1SCD080 | DUAL LEG EXTENSION \| SEATED  LEG CURLING | Dual leg extension \| seated leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | [Dual leg extension \| seated leg curling \| Panatta Sport](https://www.panattasport.com/en/sec/dual-leg-extension-seated-leg-curling/) |
| 715 | PANATTA | 1FO140 | DIPS PRESS | — | unresolved | — | — | — |
| 716 | PANATTA | 1FO120 | POWER SMITH MACHINE  MULTI ANGLES | — | unresolved | — | — | — |
| 717 | PANATTA | 1FO091 | SQUAT MACHINE AND CALF | — | unresolved | — | — | — |
| 719 | PANATTA | 1FO087 | HACK SQUAT | — | unresolved | — | — | — |
| 722 | PANATTA | 1FO094 | KNEELING LEG CURLING | Kneeling leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/2/) | — | — |
| 723 | PANATTA | 1FO043 | MIDDLE CHEST FLIGHT MACHINE | Middle chest flight machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/2/) | — | — |
| 724 | PANATTA | 1FO039 | PULLOVER MACHINE | Pullover machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/2/) | — | — |
| 725 | PANATTA | 1FO101 | LAT PULLDOWN CIRCULAR | Lat pulldown circular | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/3/) | — | — |
| 726 | PANATTA | 1FO097 | HIP THRUST | Hip thrust | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/3/) | — | — |
| 727 | PANATTA | 1FO085 | LEG PRESS BRIDGE | Leg press bridge | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/3/) | — | — |
| 728 | PANATTA | 1FO038 | UPPER CHEST FLIGHT MACHINE | Upper Chest Flight Machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/3/) | — | — |
| 729 | PANATTA | 1FO001 | LAT MACHINE CONVERGENT | Lat machine convergent | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/4/) | — | — |
| 730 | PANATTA | 1FO004 | ROWING MACHINE | Rowing machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/4/) | — | — |
| 731 | PANATTA | 1FO002 | LOW ROW | Low row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/4/) | — | — |
| 733 | PANATTA | 1FO003 | HIGH ROW | High row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/4/) | — | — |
| 735 | PANATTA | 1FO025 | DELTOID PRESS | Deltoid press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/4/) | — | — |
| 742 | PANATTA | 1FO086 | LEG PRESS 45° | Leg press 45° | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/4/) | — | — |
| 743 | PANATTA | 1FO080 | PENDULUM SQUAT | Pendulum squat | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/4/) | — | — |
| 796 | PANATTA | 1HP121 | POWER SMITH MACHINE DUAL SYSTEM | — | unresolved | — | — | — |
| 797 | PANATTA | 1FW452 | THREE ANGLES TRICEPS MACHINE | Three Angles Triceps Machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 799 | PANATTA | 1FW055 | ALTERNATE ARM CURL 120 | Alternate Arm Curl 120 | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 801 | PANATTA | 1FW199 | 3D ABDUCTOR | 3D ABDUCTOR | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 802 | PANATTA | 1FW122 | POWER SMITH DUAL SYSTEM UPPER | POWER SMITH MACHINE DUAL SYSTEM UPPER | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 803 | PANATTA | 1FW065 | TOTAL CORE CRUNCH MACHINE | TOTAL CORE CRUNCH MACHINE | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 804 | PANATTA | 1FW045 | SUPER VERTICAL MULTI PRESS | SUPER VERTICAL MULTI PRESS | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 805 | PANATTA | 1FW036 | SUPER VERTICAL CHEST PRESS | Super vertical chest press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | — |
| 806 | PANATTA | 1FW035 | SUPER INCLINED CHEST PRESS | Super inclined chest press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | — |
| 807 | PANATTA | 1FW041 | SUPER DECLINED CHEST PRESS | Super declined chest press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | — |
| 808 | PANATTA | 1FW037 | SUPER HORIZONTAL BENCH PRESS | Super Horizontal Bench Press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/16/) | — | [Super Horizontal Bench Press \| Panatta Sport](https://www.panattasport.com/en/free-weight-special/super-horizontal-bench-press/) |
| 809 | PANATTA | 1FW033 | SUPER INCLINED BENCH PRESS | Super inclined bench press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 810 | PANATTA | 1FW043 | SUPER MIDDLE CHEST FLIGHT MACHINE | Super middle chest flight machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 811 | PANATTA | 1FW038 | SUPER UPPER CHEST FLIGHT MACHINE | Super upper chest flight machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 812 | PANATTA | 1FW044 | SUPER LOWER CHEST FLIGHT MACHINE | Super lower chest flight machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 813 | PANATTA | 1FW042 | SUPER HORIZONTAL MULTI PRESS | Super horizontal multi press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 814 | PANATTA | 1FW040 | DIPS PRESS DUAL SYSTEM | Dips press dual system | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 815 | PANATTA | 1FW140 | DIPS PRESS | Dips press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 816 | PANATTA | 1FW039 | SUPER PULLOVER MACHINE | Super pullover machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 817 | PANATTA | 1FW139 | PULLOVER MACHINE | Pullover machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 818 | PANATTA | 1FW001 | SUPER LAT MACHINE CONVERGENT | Super lat machine convergent | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 819 | PANATTA | 1FW101 | SUPER LAT PULLDOWN CIRCULAR | Super lat pulldown circular | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 820 | PANATTA | 1FW003 | SUPER HIGH ROW | Super high row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 821 | PANATTA | 1FW102 | SUPER POWER ROW | Super power row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 822 | PANATTA | 1FW002 | SUPER LOW ROW | Super low row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 823 | PANATTA | 1FW104 | SUPER ROWING | Super Rowing | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 824 | PANATTA | 1FW204 | SUPER ROWING CIRCULAR | SUPER ROWING MACHINE CIRCULAR | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 825 | PANATTA | 1FW007 | T-BAR ROW | T-bar row | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/17/) | — | — |
| 827 | PANATTA | 1FW105 | FRONT DORSY BAR | Front dorsy bar | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 829 | PANATTA | 1FW025 | SUPER DELTOID PRESS | Super deltoid press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 830 | PANATTA | 1FW027 | LATERAL DELTOIDS | Lateral deltoids | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 831 | PANATTA | 1FW026 | BACK DELTOIDS | Back deltoids | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 834 | PANATTA | 1FW251 | ALTERNATE CURLING MACHINE | — | unresolved | — | — | — |
| 836 | PANATTA | 1FW451 | THREE ANGLES BICEPS MACHINE | THREE ANGLES BICEPS MACHINE | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | [Three Angles Biceps Machine \| Biceps brachii \| Panatta](https://panattasport.com/en/free-weight-special/three-angles-bicep-machine/) |
| 837 | PANATTA | 1FW085 | SUPER LEG PRESS BRIDGE | Super leg press bridge | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 838 | PANATTA | 1FW100 | SUPER HORIZONTAL LEG PRESS  DUAL SYSTEM | — | unresolved | — | — | — |
| 839 | PANATTA | 1FW086 | SUPER LEG PRESS 45° | Super leg press 45° | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 840 | PANATTA | 1FW090 | SUPER LEG PRESS 45° DUAL SYSTEM | Super leg press 45° dual system | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 841 | PANATTA | 1FW093 | SUPER VERTICAL LEG PRESS | Super vertical leg press | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 842 | PANATTA | 1FW193 | VERTICAL LEG PRESS | — | candidate_requires_review | — | — | [Vertical Leg Press \| Quadriceps femorals glutes \| Panatta](https://panattasport.com/en/free-weight-special/vertical-leg-press) |
| 843 | PANATTA | 1FW091 | SUPER SQUAT MACHINE | Super squat machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 844 | PANATTA | 1FW084 | SUPER POWER SQUAT | Super power squat | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 845 | PANATTA | 1FW080 | SUPER PENDULUM SQUAT | Super pendulum squat | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 846 | PANATTA | 1FW095 | BELT SQUAT | Belt squat | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 847 | PANATTA | 1FW087 | SUPER HACK SQUAT | Super hack squat | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 849 | PANATTA | 1FW098 | POWER RUNNER | Power runner | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 850 | PANATTA | 1FW097 | HIP THRUST | Hip thrust | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 851 | PANATTA | 1FW099 | STANDING ABDUCTOR | Standing abductor | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 852 | PANATTA | 1FW181 | LEG EXTENSION | Leg extension | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 853 | PANATTA | 1FW082 | ALTERNATE LEG CURLING | Alternate leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 854 | PANATTA | 1FW182 | LEG CURLING | Leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 856 | PANATTA | 1FW094 | KNEELING LEG CURLING | Kneeling leg curling | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 857 | PANATTA | 1FW096 | REVERSE HYPEREXTENSION | Reverse hyperextension | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 860 | PANATTA | 1FW117 | SUPER PECK BACK | SUPER PECK BACK | name_indexed_image_missing | [source](https://www.panattasport.com/en/the-original/) | — | — |
| 861 | PANATTA | 1FW029 | VIKING PRESS AND CALF | Viking press and calf | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/19/) | — | — |
| 862 | PANATTA | 1FW520 | OLYMPIC SMITH MACHINE  COUNTERBALANCED | Olympic smith machine counterbalanced | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/20/) | — | — |
| 868 | PANATTA | 1FW518 | SEAL ROW BENCH | — | candidate_requires_review | — | — | [Seal Row Bench \| Espalda central \| Panatta](https://www.panattasport.com/es/free-weight-special/seal-row-bench/) |
| 1089 | PANATTA | 1FW252 | Alternate Triceps Machine | Alternate triceps machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/18/) | — | — |
| 1090 | PANATTA | 1FW081 | Alternate Leg Extension | — | unresolved | — | — | — |
| 1263 | PANATTA | 1FE028 | Standing Multi Flight | Standing multi flight | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/12/) | — | — |
| 1264 | PANATTA | 1HP525 | Super Deltoid Press | — | unresolved | — | — | — |
| 1265 | PANATTA | 1HP584 | Power Squat | — | unresolved | — | — | — |
| 1266 | PANATTA | 1HP588 | Seated Calf | — | unresolved | — | — | — |
| 1313 | PANATTA | 1FE123 | DUAL ADJUSTABLE PULLEY FULL | Dual adjustable pulley full | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/32/) | — | — |
| 1314 | PANATTA | 1CF73 | ECOROW | Ecorow | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/6/) | — | — |
| 1315 | PANATTA | 1FXT004 | ELLIPTICAL \| FENIX TOUCH | Elliptical fenix touch | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/5/) | — | — |
| 1316 | PANATTA | 1FXT006 | CLIMBER \| FENIX TOUCH | Climber fenix touch | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/5/) | — | — |
| 1317 | PANATTA | 1FE252 | DISK RACK | Disk Rack – Fit Evo | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/22/) | — | — |
| 1318 | PANATTA | 1FE254 | BARBELL RACK DOUBLE SIDED | Barbell rack double sided | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/23/) | — | — |
| 1319 | PANATTA | 1FE260 | STRETCHING EXTENSOR BENCH | Stretching extensor bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/33/) | — | [Stretching extensor bench \| Panatta Sport](https://www.panattasport.com/en/sec/stretching-extensor-bench/) |
| 1320 | PANATTA | 1HP213 | ADJUSTABLE STANDING CURL BENCH | Adjustable standing curl bench | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/21/) | — | — |
| 1321 | PANATTA | 1HP234A | HALF RACK - BASE | — | unresolved | — | — | — |
| 1322 | PANATTA | 1HP590 | SQUAT LUNGE | Squat lunge | name_indexed_image_missing | [source](https://panattasport.com/en/catalog/page/20/) | — | — |
| 1323 | PANATTA | 1PWL302 | OLYMPIC PLATFORM FOR HALF RACK \| 3X3 m | Olympic platform – half rack (3x3m) | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/23/) | — | — |
| 1324 | PANATTA | 1RPT001 | BIKE ROSSOPURO \| TOUCH | Rossopuro Bike Touch | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/3/) | — | — |
| 1325 | PANATTA | 1RPT002 | HORIZONTAL BIKE ROSSOPURO \| TOUCH | Rossopuro Horizontal Bike Touch | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/3/) | — | — |
| 1326 | PANATTA | 1RPT003 | RUNNER ROSSOPURO \| TOUCH | Rossopuro Run Touch | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/3/) | — | — |
| 1405 | PANATTA | 1FE120 | JUNGLE MACHINE HLP | Jungle machine hlp | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/12/) | — | — |
| 1406 | PANATTA | 1FE124 | ADJUSTABLE CABLE STATION WITH BAR | — | candidate_requires_review | — | — | [Jungle machine hlp + adjustable cable station with bar \| Panatta Sport](https://www.panattasport.com/es/fit-evo/jungle-machine-hlp-adjustable-cable-station-with-bar/) |
| 1407 | PANATTA | 1HP505 | DORSY BAR | — | unresolved | — | — | — |
| 1408 | PANATTA | 1SC034A | VERTICAL CHEST PRESS CONVERGENT PLUS | — | candidate_requires_review | — | — | [Vertical chest convergent \| Panatta Sport](https://www.panattasport.com/en/sec/vertical-chest-convergent/) |
| 1409 | PANATTA | 1HP541 | SUPER DECLINED CHEST PRESS | — | candidate_requires_review | — | — | [Declined Chest Press \| Chest Machine \| Panatta](https://www.panattasport.com/en/freeweight-one/declined-chest-press/) |
| 1410 | PANATTA | 1HP565 | ABDOMINAL CRUNCH | — | candidate_requires_review | — | — | [Abdominal crunch \| Panatta Sport](https://www.panattasport.com/en/monolith/abdominal-crunch-3/) |
| 1489 | PANATTA | 1FE039 | PULLOVER MACHINE | Pullover machine | name_indexed_image_missing | [source](https://www.panattasport.com/en/catalog/page/9/) | — | — |
| 1519 | PANATTA | 1HP533 | SUPER INCLINED BENCH PRESS FULL | — | candidate_requires_review | — | — | [Super Inclined Bench Press \| Pectoral and deltoid \| Panatta](https://www.panattasport.com/en/free-weight-special/super-inclined-bench-press) |
| 772 | PRECOR | SCL885 | Stair Climber, P84, 16" Touch Screen | SCL885 | model_verified | [source](https://files.precor.com/en-GB/products/SCL885) | [image](https://images.ctfassets.net/5bv2a78ngtvd/6i20j62rfdo00ARImhYaeM/7200546dfafaca970b791cbb7ebb4b95/SCL885.png?fm=webp&w=3840&q=70) | — |
| 775 | PRECOR | RBK835 | Recumbent Bike, P31, LED | RBK835 | model_verified | [source](https://www.precor.com/en-US/products/RBK835) | [image](https://images.ctfassets.net/5bv2a78ngtvd/qjtBdiZe8uuIhPEnHpg5Z/5a4dbb21f7968b06e9503843886517ee/231107_Precor__New_RBK800_P31_BP_RearLeft_V1.png?fm=webp&w=3840&q=70) | — |
| 776 | PRECOR | UBK835 | Upright Bike, P31, LED | UBK835 | model_verified | [source](https://www.precor.com/en-US/products/UBK835) | [image](https://images.ctfassets.net/5bv2a78ngtvd/4aylLiR6KdEvFrWBf0SoIk/8da33a5151f2a1409d58ea048f878817/231107_Precor__New_UBK800_P31_BP_RearLeft_V1.png?fm=webp&w=3840&q=70) | — |
| 777 | PRECOR | SCL835 | Stair Climber, P31, LED | SCL835 | model_verified | [source](https://www.precor.com/en-US/products/SCL835) | [image](https://images.ctfassets.net/5bv2a78ngtvd/2DZC6IKjWVro9iYZ3udtOV/e21864740f4976857cf4262175805f7b/SCL835.png?fm=webp&w=3840&q=70) | — |
| 778 | PRECOR | TRM731 | Treadmill, LED 240V, USB, 0%-15% Adjustable | TRM731 | model_verified | [source](https://www.precor.com/en-US/products/TRM731) | [image](https://images.ctfassets.net/5bv2a78ngtvd/5lNR0F90dIje5pb8rsI5l2/f095968add6fe7ee5f023290c7a09917/230227_Peloton_Precor_TRM700_P31_BP_LeftRear.png?fm=webp&w=3840&q=70) | — |
| 1083 | PRECOR | AMT835 | Adaptive Motion Trainer® | AMT835 | model_verified | [source](https://www.precor.com/en-US/products/AMT835) | [image](https://images.ctfassets.net/5bv2a78ngtvd/5Q7kg9HLOQSvTDn2ydkwr5/bcbb3f492baffd432851accf5a9a990e/AMT_835_P31_Black_Pearl_043021.png?fm=webp&w=3840&q=70) | — |
| 1084 | PRECOR | EFX635 | Elliptical Fitness Crosstrainer® | EFX635 | model_verified | [source](https://www.precor.com/en-US/products/EFX635) | [image](https://images.ctfassets.net/5bv2a78ngtvd/01EoqGDBCK9Z1Th9qhXtfF/5ea50d78c42ea74bb5a933c73d95ceb2/EFX_635_P31_Black_Pearl_052021.png?fm=webp&w=3840&q=70) | — |
| 1086 | PRECOR | EFX535 | Elliptical Fitness Crosstrainer® | EFX535 | model_verified | [source](https://www.precor.com/en-US/products/EFX535) | [image](https://images.ctfassets.net/5bv2a78ngtvd/2z9gES5WdsTZyvyDYksm2j/634d7ad052407ee7e091660ebff9a86d/Precor_EFX500_P31_BP_ThreeQtr__2_.png?fm=webp&w=3840&q=70) | — |
| 1088 | PRECOR | SC2 | Stages Cycling | — | candidate_requires_review | — | — | [Stages Indoor Cycling](https://www.precor.com/de-DE/indoorcycling/stages) |
| 1356 | ROGERS | — | Pendulum Performance 3-Way Row | — | candidate_requires_review | — | — | [Pendulum Performance 3-Way Row](https://store.rogersathletic.com/pendulum-performance-3-way-row/) |
| 1473 | ROGERS | 410744 | Short Pit Shark Base Package | — | unresolved | — | — | — |
| 1474 | ROGERS | 411561 | Pendulum Performance Hip Press | — | unresolved | — | — | — |
| 1188 | ROGUE | — | ECHO BIKE | — | candidate_requires_review | — | — | [Rogue Echo Bike V3.0](https://www.roguefitness.com/gb/rogue-echo-bike-eu) |
| 1355 | Repcon | RL-11PL | Linear Row | LINEAR ROW | model_verified | [source](https://repconcompany.com/LINEARROW) | [image](https://cdn.imweb.me/upload/S202405168ba97a8e892ee/657ee2f46de4a.png) | — |
| 1148 | SCHWINN | SCHWINN IC CLASSIC 9-7420-BINTP0 BIKE | BINTP0 BIKE | — | unresolved | — | — | — |
| 1146 | SKELCORE | SK-PROPLA-094 | Skelcore Pro Plus Series Back Row | Pro Plus Linear Back Row | model_verified | [source](https://www.skelcore.com/products/pro-plus-linear-back-row) | [image](https://cdn.prod.website-files.com/6a2de4d126490e79ec270698/6ada71a1fdca05e9f2e99032_6a7b75c5d5f2f9e3f96e79fc_SK-PROPLA-094(1)W.webp) | — |
| 1147 | SKELCORE | SK-GHDM001 | SK-GHDM001 | — | unresolved | — | — | — |
| 1149 | SKELCORE | SK-PL-CC1 | Skelcore Classic Reformer - Oak | Classic Reformer - Oak | model_verified | [source](https://www.skelcore.com/products/classic-reformer-oak) | [image](https://cdn.prod.website-files.com/6a2de4d126490e79ec270698/6ada6ff57582e486a4f6ff57_6a8df22157c42f95fda03f70_SK-PL-CC1(1)W.webp) | — |
| 1150 | SKELCORE | SK-PL-FX1 | Wunda Chair | — | unresolved | — | — | — |
| 1151 | SKELCORE | SK-PL-SC1 | Spine Corrector | Spine Corrector - Oak | model_verified | [source](https://www.skelcore.com/products/spine-corrector-oak) | [image](https://cdn.prod.website-files.com/6a2de4d126490e79ec270698/6a830e8115bfee9b801f86ec_SHOPIFY_SK-PL-SC1.png) | — |
| 165 | STAR TRAC | 8-RDE | Star Trac Rear-Drive Elliptical | — | candidate_requires_review | — | — | [8RDE Rear Drive Elliptical](https://www.corehandf.com/products/star-trac-8rde) |
| 167 | STAR TRAC | 8-UB | Star Trac Upright Bike | — | candidate_requires_review | — | — | [Star Trac Virtual Bike](https://www.corehandf.com/products/star-trac-virtual-bike) |
| 930 | STAR TRAC | 9-9324-8TR-LED | StarTrac 8TR Treadmill 21IN LED | — | unresolved | — | — | — |
| 932 | STAR TRAC | 9-6180-8RDE-LED | StarTrac 8RDE Rear Drive Elliptical 16IN LED | — | candidate_requires_review | — | — | [8RDE Rear Drive Elliptical](https://www.corehandf.com/products/star-trac-8rde) |
| 936 | STAR TRAC | 9-8170-8RB-LED | StarTrac 8RB Recumbent Bike 16IN LED | — | candidate_requires_review | — | — | [8RB Recumbent Bike](https://www.corehandf.com/products/star-trac-8rb) |
| 937 | STAR TRAC | 9-8160-8UB-16IN | StarTrac 8UB Upright Bike 16IN Touchscreen | — | candidate_requires_review | — | — | [8UB Upright Bike](https://www.corehandf.com/products/star-trac-8ub) |
| 938 | STAR TRAC | 9-8160-8UB-LED | StarTrac 8UB Upright Bike 16IN LED | — | candidate_requires_review | — | — | [8UB Upright Bike](https://www.corehandf.com/products/star-trac-8ub) |
| 940 | STAR TRAC | 9-9334-6TR-16IN | StarTrac 6TR Treadmill 16IN Touchscreen | — | candidate_requires_review | — | — | [6TR Treadmill](https://www.corehandf.com/products/star-trac-6tr) |
| 941 | STAR TRAC | 9-9334-6TR-LCD | StarTrac 6TR Treadmill 10IN LCD | — | candidate_requires_review | — | — | [6TR Treadmill](https://www.corehandf.com/products/star-trac-6tr) |
| 942 | STAR TRAC | 9-6240-6CT-LCD | StarTrac 6CT Cross Trainer LCD | — | candidate_requires_review | — | — | [6CT Cross Trainer](https://www.corehandf.com/products/6ct-cross-trainer) |
| 943 | STAR TRAC | 9-8190-6RB-LCD | StarTrac 6RB Recumbent Bike LCD | — | candidate_requires_review | — | — | [6RB Recumbent Bike](https://www.corehandf.com/products/6ct-cross-trainer-copy) |
| 944 | STAR TRAC | 9-8180-6UB-LCD | StarTrac 6UB Upright Bike LCD | — | candidate_requires_review | — | — | [6UB Upright Bike](https://www.corehandf.com/products/6ub-upright-bike) |
| 1162 | STAR TRAC | 9-3180-4UB-10IN | 4UB UPRIGHT BIKE | — | candidate_requires_review | — | — | [4UB Upright Bike](https://www.corehandf.com/products/4ub-upright-bike-copy) |
| 1163 | STAR TRAC | 9-3190-4RB-10IN | Recumbent Bike | — | candidate_requires_review | — | — | [4RB Recumbent Bike](https://www.corehandf.com/products/4rb-recumbent-bike-copy) |
| 1167 | STAR TRAC | 9-9324-8TR22-LED | Star Trac 8TR Commercial Treadmill w/ 22" LED | — | unresolved | — | — | — |
| 1187 | STAR TRAC | NXT7170 | NXT Spinner Bike | — | unresolved | — | — | — |
| 1453 | STAR TRAC | H-9-9334-6TR-220-LED-KM-60 | 6 SERIES TREADMILL | — | unresolved | — | — | — |
| 1454 | STAR TRAC | H-9-5395-8GX-LED-60 | 8 SERIES 8GX STEPMILL | — | unresolved | — | — | — |
| 1267 | SportArt | G875 | G875 Elliptical | G875 Elliptical | model_verified | [source](https://www.gosportsart.com/product/g875-elliptical/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/ECO-POWR_G875-Elliptical_Left3qtr2.jpg) | — |
| 1268 | SportArt | G845 | G845 Elliptical | G845 Elliptical | model_verified | [source](https://www.gosportsart.com/product/g845-elliptical/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/ECO-POWR_G845-Elliptical_Left3qtr1.jpg) | — |
| 1271 | SportArt | G545U | G545U Upright Cycle | G545U Upright Cycle | model_verified | [source](https://www.gosportsart.com/product/g545u-upright-cycle/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/ECO-POWR_G545U-UprightCycle_Left3qtr-1.jpg) | — |
| 1272 | SportArt | G545R | G545R Recumbent Cycle | G545R Recumbent Cycle | model_verified | [source](https://www.gosportsart.com/product/g545r-recumbent-cycle/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/ECO-POWR_G545R-RecumbentCycle_Left3qtr-1.jpg) | — |
| 1274 | SportArt | T655L | T655L Treadmill | T655L Treadmill | model_verified | [source](https://www.gosportsart.com/product/t655l-treadmill/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/T655L-19%E5%90%8B-3.jpg) | — |
| 1275 | SportArt | E875 | E875 Elliptical | — | ambiguous_model | — | — | [E875 Elliptical](https://www.gosportsart.com/product/e875-elliptical/) |
| 1276 | SportArt | S715 | S715 Stepper | S715 Stepper | model_verified | [source](https://www.gosportsart.com/product/s715-stepper/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/S715-web.png) | — |
| 1280 | SportArt | C530 | C530 Indoor Cycle | C530 Indoor Cycle | model_verified | [source](https://www.gosportsart.com/product/c530-indoor-cycle/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/C530-9-1-1.jpg) | — |
| 1283 | SportArt | T645L | T645L Treadmill | T645L Treadmill | model_verified | [source](https://www.gosportsart.com/product/t645l-treadmill/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/T645L-01-web.png) | — |
| 1284 | SportArt | E845S | E845S Elliptical | E845S Elliptical | model_verified | [source](https://www.gosportsart.com/product/e845s-elliptical/) | [image](https://www.gosportsart.com/wp-content/uploads/2025/05/E845S-06-1000x667_300.png) | — |
| 1285 | SportArt | C545U | C545U Upright Cycle | C545U Upright Cycle | model_verified | [source](https://www.gosportsart.com/product/c545u-upright-cycle/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/C545U-900Mhz-02.jpg) | — |
| 1286 | SportArt | C545R | C545R Recumbent Cycle | C545R Recumbent Cycle | model_verified | [source](https://www.gosportsart.com/product/c545r-recumbent-cycle/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/C545R9-1.jpg) | — |
| 1287 | SportArt | T635A | T635A Treadmill | T635A Treadmill | model_verified | [source](https://www.gosportsart.com/product/t635a-treadmill/) | [image](https://www.gosportsart.com/wp-content/uploads/2025/05/T635A-01-1000x666_300.png) | — |
| 1288 | SportArt | T615 | T615 Treadmill | T615 Treadmill | model_verified | [source](https://www.gosportsart.com/product/t615-treadmill/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/Cardio_T615-Treadmill_Left3qtr1-3-1.jpg) | — |
| 1290 | SportArt | E835 | E835 Elliptical | E835 Elliptical | model_verified | [source](https://www.gosportsart.com/product/e835-elliptical/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/E835-web.png) | — |
| 1291 | SportArt | C535U | C535U Upright Cycle | C535U Upright Cycle | model_verified | [source](https://www.gosportsart.com/product/c535u-upright-cycle/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/C535U-web.png) | — |
| 1292 | SportArt | C535R | C535R Recumbent Cycle | C535R Recumbent Cycle | model_verified | [source](https://www.gosportsart.com/product/c535r-recumbent-cycle/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/C535R-web.png) | — |
| 1413 | SportArt | P735 | Rotary Torso | P735 Rotary Torso | model_verified | [source](https://www.gosportsart.com/product/p735-rotary-torso/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/Strength_Performance_P735-RotaryTorso-1.jpg) | — |
| 1416 | SportArt | DF-204 | Pectoral Fly/ Rear Deltoid | — | candidate_requires_review | — | — | [DF104 Pec Fly/Rear Deltoid](https://www.gosportsart.com/product/df104-pec-fly-rear-deltoid/) |
| 1417 | SportArt | DF-203 | Lat Pull Down/ Mid Row/ Chest Press | — | candidate_requires_review | — | — | [DF103 Lat Pull Mid Row](https://www.gosportsart.com/product/df103-lat-pull-mid-row/) |
| 1418 | SportArt | DF-208 | Multi-Press | — | candidate_requires_review | — | — | [DF108 Multi Press](https://www.gosportsart.com/product/df108-multi-press/) |
| 1419 | SportArt | DF206 | Abdominal Crunch/ Back Extention | DF206 Back Extension/Ab Crunch | model_verified | [source](https://www.gosportsart.com/product/df206-back-extension-ab-crunch/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/03/DF-206.jpg) | — |
| 1421 | SportArt | S955 | Glute | S955 Glute | model_verified | [source](https://www.gosportsart.com/product/s955-glute/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/Strength_Status_S955-Glute.jpg) | — |
| 1422 | SportArt | DF-200 | Leg Extention/ Leg Curl | — | candidate_requires_review | — | — | [P759 Leg Curl](https://www.gosportsart.com/product/p759-leg-curl/) |
| 1424 | SportArt | DF-207 | Assisted Chin/ Dip | — | candidate_requires_review | — | — | [DF107 Assisted Chin Dip](https://www.gosportsart.com/product/df107-assisted-chin-dip/) |
| 1425 | SportArt | DF-205 | Biceps Curl/ Triceps Extention | — | unresolved | — | — | — |
| 1427 | SportArt | A966 | Squat Rack | A966 Power Cage | model_verified | [source](https://www.gosportsart.com/product/a966-power-cage/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/A966photoshop-copy.png) | — |
| 1428 | SportArt | A982 | Leg Press | A982 Angled Leg Press | model_verified | [source](https://www.gosportsart.com/product/a982-angled-leg-press/) | [image](https://www.gosportsart.com/wp-content/uploads/2026/08/A982-Angled-Leg-Press-02-flat-upholstery-web.png) | — |
| 1429 | SportArt | A988 | Mid Row | A988 Mid Row | model_verified | [source](https://www.gosportsart.com/product/a988-mid-row/) | [image](https://www.gosportsart.com/wp-content/uploads/2026/08/A988-Mid-Row-flat-upholstery-web.png) | — |
| 1430 | SportArt | A993 | Back Hyperextension | A993 Back Hyperextension | model_verified | [source](https://www.gosportsart.com/product/a993-back-hyperextension/) | [image](https://www.gosportsart.com/wp-content/uploads/2025/05/A993-Back-Hyperextension-1000x667_300.png) | — |
| 1431 | SportArt | A983 | Smith Machine | A983 Smith Machine | model_verified | [source](https://www.gosportsart.com/product/a983-smith-machine/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/07/A983.png) | — |
| 1432 | SportArt | A996 | Olympic Flat Bench | A996 Olympic Flat Bench | model_verified | [source](https://www.gosportsart.com/product/a996-olympic-flat-bench/) | [image](https://www.gosportsart.com/wp-content/uploads/2025/05/A996-Olympic-Flat-Bench-1000x667_300.png) | — |
| 1433 | SportArt | A989 | Hack Squat | A989 Hack Squat | model_verified | [source](https://www.gosportsart.com/product/a989-hack-squat/) | [image](https://www.gosportsart.com/wp-content/uploads/2026/08/A989-Hack-Squat-flat-upholstery-web.png) | — |
| 1434 | SportArt | A992 | Flat Bench | A992 Flat Bench | model_verified | [source](https://www.gosportsart.com/product/a992-flat-bench/) | [image](https://www.gosportsart.com/wp-content/uploads/2026/08/A992-Flat-Bench-flat-upholstery-web.png) | — |
| 1435 | SportArt | A991 | Adjustable Bench | A991 Adjustable Bench | model_verified | [source](https://www.gosportsart.com/product/a991-adjustable-bench/) | [image](https://www.gosportsart.com/wp-content/uploads/2026/08/A991-Adjustable-Bench-flat-upholstery-web.png) | — |
| 1437 | SportArt | N935 | Rotary Torso | N935 Rotary Torso | model_verified | [source](https://www.gosportsart.com/product/n935/) | [image](https://www.gosportsart.com/wp-content/uploads/2025/05/N935-Rotary-Torso-1000x667_300.png) | — |
| 1438 | SportArt | DF207 | Assisted Chin-Up/Tricep Dip DF207 | DF207 Assisted Chin-Up/Tricep Dip | model_verified | [source](https://www.gosportsart.com/product/df207-chin-up-tricep-dip/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/03/DF-207%E6%A8%A3%E6%9C%AC.jpg) | — |
| 1440 | SportArt | A998 | SportsArt A998 Olympic Incline Bench | A998 Olympic Incline Bench | model_verified | [source](https://www.gosportsart.com/product/a998-olympic-incline-bench/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/Strength_Bench_A998-OlympicInclineBench-3-1024x683.jpg) | — |
| 1441 | SportArt | DF202 | EF202 Abductor/Adductor | DF202 Abductor/Adductor | model_verified | [source](https://www.gosportsart.com/product/df202-abductor-adductor/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/03/DF-202.jpg) | — |
| 1443 | SportArt | P726 | Commercial high-back lat pullover training machine | P726 Lat Pulldown | model_verified | [source](https://www.gosportsart.com/product/p726-lat-pulldown/) | [image](https://www.gosportsart.com/wp-content/uploads/2022/04/P726-Lat-Pulldown.png) | — |
| 1444 | SportArt | A994 | A994 VKR Chin Dip | A994 VKR Chin Dip Station | model_verified | [source](https://www.gosportsart.com/product/a994-vkr-chin-dip-station/) | [image](https://www.gosportsart.com/wp-content/uploads/2025/05/A994-Leg-Raise_Chin-Up-Dip-1000x667_300.png) | — |
| 1445 | SportArt | DS972 | DS972 functional trainer | DS972 Functional Trainer | model_verified | [source](https://www.gosportsart.com/product/ds972-functional-trainer/) | [image](https://www.gosportsart.com/wp-content/uploads/2025/05/DS972-1.png) | — |
| 1447 | SportArt | A901 | Double-layer professional dumbbell rack | A901 Dumbbell Rack | model_verified | [source](https://www.gosportsart.com/product/a901-dumbbell-rack/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/A901-copy.png) | — |
| 1448 | SportArt | A995 | Abdominal training machine | A995 Crunch Bench | model_verified | [source](https://www.gosportsart.com/product/a995-crunch-bench/) | [image](https://www.gosportsart.com/wp-content/uploads/2026/08/A995-Crunch-Bench-flat-upholstery-web.png) | — |
| 1507 | SportArt | P757 | LEG EXTENSION | P757 Leg Extension | model_verified | [source](https://www.gosportsart.com/product/p757-leg-extension/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/Strength_Performance_P757-LegExtension-1.jpg) | — |
| 1508 | SportArt | P758 | PRONE LEG CURL | P758 Prone Leg Curl | model_verified | [source](https://www.gosportsart.com/product/p758-prone-leg-curl/) | [image](https://www.gosportsart.com/wp-content/uploads/2017/02/Strength_Performance_P758-LyingLegCurl-1.jpg) | — |
| 170 | StairMaster | 9-5345-8GX-15-PAL | Gauntlet | — | unresolved | — | — | — |
| 171 | StairMaster | 9-5345-8GX-LCD | Gauntlet | — | unresolved | — | — | — |
| 1161 | StairMaster | 9-5450-8FC-LED | FREECLIMBER 8 Series StairClimber Stepper | — | unresolved | — | — | — |
| 1168 | StairMaster | 9-5395-8GX-LED-60 | 8GX Series StepMill | — | unresolved | — | — | — |
| 1171 | StairMaster | 9-5260-8FC-LCD-60 | 8 Series Freeclimber w/LCD Console | — | unresolved | — | — | — |
| 1180 | StairMaster | JACOB'S-LADDER 2 | JACOB'S-LADDER 2 | — | candidate_requires_review | — | — | [Jacobs Ladder 2](https://shop.corehandf.com/cdn/shop/files/StairMaster_Jacobs_Ladder_2_Product_Sheet.pdf) |
| 1451 | StairMaster | SM5395L26030252 | 8Gx Stepmills | — | unresolved | — | — | — |
| 1452 | StairMaster | SM-HIIT-R | HIIT Rower | — | candidate_requires_review | — | — | [HIIT Rower](https://www.corehandf.com/products/throwdown-hiit-rower) |
| 1478 | StairMaster | H-9-5295-10G-LCD | 10 Series 10G w/LCD | — | unresolved | — | — | — |
| 1491 | StairMaster | 9-4880-KINTP0 | HIITMill X | — | candidate_requires_review | — | — | [HIITMill X](https://www.corehandf.com/products/throwdown-hiitmillx-hiit) |
| 1164 | THROWDOWN | 9-4880 | Hiitmill X | HIITMill X | model_verified | [source](https://www.corehandf.com/products/throwdown-hiitmillx-hiit) | [image](https://cdn.shopify.com/s/files/1/0594/2260/5378/files/throwdown-hiitmill-x-9-4880-45deg-left.png?v=1732692965) | — |
| 556 | TechnoGym | MG3500-NBGJV0 | Pure Shoulder Press | — | unresolved | — | — | — |
| 557 | TechnoGym | MG3000-NBGJV0 | Pure Row | — | unresolved | — | — | — |
| 558 | TechnoGym | MG5500-NBGJV0 | Pure Seated Dip | — | unresolved | — | — | — |
| 559 | TechnoGym | MG6000-NBGJV0 | Pure Biceps | — | unresolved | — | — | — |
| 560 | TechnoGym | MG9000-NBGJV0 | Pure Pullover | — | unresolved | — | — | — |
| 561 | TechnoGym | MG4000-NBGJV0 | Pure Rear Kick | — | unresolved | — | — | — |
| 562 | TechnoGym | MG5000-NBGJV0 | Pure Leg Press | — | unresolved | — | — | — |
| 563 | TechnoGym | MG7500-NBGJV0 | Pure Linear Leg Press | — | candidate_requires_review | — | — | [Leg Press](https://isp.technogym.com/isp/resources/WW_Leg%20Press-M851_Exploded-drawing-30.pdf) |
| 564 | TechnoGym | MG6500-NBGJV0 | Pure Leg Extension | — | unresolved | — | — | — |
| 565 | TechnoGym | MG7000-NBGJV0 | Pure Standing Leg Curl | — | unresolved | — | — | — |
| 566 | TechnoGym | MG8000-NBGJV0 | Pure Hip Thrust | — | unresolved | — | — | — |
| 567 | TechnoGym | MG86 | Pure Belt Squat | — | unresolved | — | — | — |
| 568 | TechnoGym | MG87 | Pure Deadlift | — | unresolved | — | — | — |
| 569 | TechnoGym | MG2000-NBGJV0 | Pure Pulldown | — | unresolved | — | — | — |
| 570 | TechnoGym | PG12 | T Bar Row Pure | — | unresolved | — | — | — |
| 571 | TechnoGym | MG2500-NBGJV0 | Pure Low Row | — | unresolved | — | — | — |
| 572 | TechnoGym | MG9500-NBGJV0 | Pure Standing Abductor | — | unresolved | — | — | — |
| 573 | TechnoGym | MG8500-NBGJV0 | Pure Hack Squat | — | unresolved | — | — | — |
| 576 | TechnoGym | DJK0 | Skillmill | — | unresolved | — | — | — |
| 581 | TechnoGym | DBH0 | Artis Synchro | — | unresolved | — | — | — |
| 582 | TechnoGym | DJR0NDT | Skillrow | — | unresolved | — | — | — |
| 584 | TechnoGym | MNGC | VERTICAL TRACTION | — | unresolved | — | — | — |
| 585 | TechnoGym | MNHC | LOW ROW | — | unresolved | — | — | — |
| 586 | TechnoGym | MNIC | LEGCURL | — | unresolved | — | — | — |
| 587 | TechnoGym | MNJC | LEG EXTENSION | — | unresolved | — | — | — |
| 589 | TechnoGym | MNLC | LAT MACHINE | — | unresolved | — | — | — |
| 590 | TechnoGym | MNAC | LEG PRESS | — | candidate_requires_review | — | — | [Leg Press](https://isp.technogym.com/isp/resources/WW_Leg%20Press-M851_Exploded-drawing-30.pdf) |
| 592 | TechnoGym | MNEC | SHOULDER PRESS | — | unresolved | — | — | — |
| 593 | TechnoGym | MNOC | SELECTION700 | — | unresolved | — | — | — |
| 594 | TechnoGym | MNMC | SELECTION700 | — | unresolved | — | — | — |
| 596 | TechnoGym | MNQP | ADDUCTOR | — | unresolved | — | — | — |
| 601 | TechnoGym | MNVP | PULL DOWN | — | unresolved | — | — | — |
| 602 | TechnoGym | MNWP | PULLEY | — | unresolved | — | — | — |
| 603 | TechnoGym | MNHP | LOW ROW | — | unresolved | — | — | — |
| 606 | TechnoGym | MNSP | ARM EXTENSION | — | unresolved | — | — | — |
| 608 | TechnoGym | MN1P | UPPER BACK | — | unresolved | — | — | — |
| 609 | TechnoGym | MNRP | ARM CURL | — | unresolved | — | — | — |
| 610 | TechnoGym | MNEP | SHOULDER PRESS | — | unresolved | — | — | — |
| 611 | TechnoGym | MNUP | PRONE LEG CURL | — | unresolved | — | — | — |
| 1075 | TechnoGym | MNBP | Abdominal Crunch | — | candidate_requires_review | — | — | [M857 - Abdominal Crunch](https://isp.technogym.com/isp/resources/WW_Cable%20Jungle-M835_Exploded-drawing-13.pdf) |
| 1077 | TechnoGym | MG1500 | Pure Strength Incline Chest Press | — | unresolved | — | — | — |
| 1078 | TechnoGym | MG0500 | Pure Strength Chest Press | — | unresolved | — | — | — |
| 1172 | TechnoGym | DFKE | Excite RunProfessional treadmill | — | unresolved | — | — | — |
| 1173 | TechnoGym | DF5E | EXCITE+ SYNCHRO | — | unresolved | — | — | — |
| 1174 | TechnoGym | DFEE | EXCITE+ CLIMB | — | unresolved | — | — | — |
| 1175 | TechnoGym | DFDE | EXCITE+ RECLINE | — | unresolved | — | — | — |
| 1176 | TechnoGym | DFCE | EXCITE+ BIKE | — | unresolved | — | — | — |
| 1177 | TechnoGym | MB82 | MULTIPOWER SMITH MACHINE | — | unresolved | — | — | — |
| 1327 | TechnoGym | DFFG | Excite+ Vario | — | unresolved | — | — | — |
| 1328 | TechnoGym | MB88EN0 | Cable Station 4 Evolution | — | unresolved | — | — | — |
| 1329 | TechnoGym | PG11-NB0000 | Olympic Power Rack | — | unresolved | — | — | — |
| 1330 | TechnoGym | MNYP | Selection 900 Rotary Torso | — | unresolved | — | — | — |
| 1331 | TechnoGym | — | Kneeling Easy Chin Dip | — | unresolved | — | — | — |
| 1332 | TechnoGym | A0001014 | Technogym Storage Universal | — | unresolved | — | — | — |
| 1333 | TechnoGym | PG01 | Olympic Incline Bench Pure | — | unresolved | — | — | — |
| 1455 | TechnoGym | MB436N0 | Dual Adjustable Pulley Performance | — | unresolved | — | — | — |
| 1456 | TechnoGym | A0000944-NB | Power Rack Platform 60MM | — | unresolved | — | — | — |
| 1457 | TechnoGym | MNFCNNO | Selection 700 Chest Press | — | unresolved | — | — | — |
| 1458 | TechnoGym | Adjustable Bench | Adjustable Bench | — | unresolved | — | — | — |
| 1165 | Torque Fitness | XTTM3C-101 | TANK M3 Push Sled With Console & Multi-Position Handles | — | candidate_requires_review | — | — | [TANK® M3 Push Sled](https://www.torquefitness.com/products/tank-m3) |
| 1144 | XMASTER | — | 24/7 FITNESS Half Rack | — | unresolved | — | — | — |
| 1145 | XMASTER | — | 24/7 FITNESS Full Rack | — | unresolved | — | — | — |
| 1155 | XMASTER | ZY-2003 | Multi-Angle Bench Press Rack | — | unresolved | — | — | — |
| 1156 | XMASTER | GHD | GHD | — | unresolved | — | — | — |
| 1157 | XMASTER | — | Vertical Smith | — | candidate_requires_review | — | — | [Counter Balanced Vertical Smith Machine \| XMASTER – XMASTER FITNESS](https://www.xmasterfitness.com/products/counter-balanced-vertical-smith-machine) |
| 1181 | XMASTER | — | Deadlift Platform | — | candidate_requires_review | — | — | [Deadlift Platform – XMASTER FITNESS](https://www.xmasterfitness.com/products/deadlift-platform) |
| 1462 | XMASTER | Combo Rack | Combo Rack | — | unresolved | — | — | — |
| 1488 | XMASTER | Adjustable Bench 2.0 | Adjustable Bench 2.0 | — | candidate_requires_review | — | — | [XMASTER Adjustable Bench 2.0 \| 500KG Capacity – XMASTER FITNESS](https://www.xmasterfitness.com/products/adjustable-bench-2.0) |
| 1178 | ZIVA | ZXP-OBSA-TP10-BK | EX OLYMPIC FLAT BENCH | — | candidate_requires_review | — | — | [EX OLYMPIC FLAT BENCH](https://latam.ziva.com/en/products/benches/ex-olympic-flat-bench) |
| 1464 | ZIVA | ZHX-PWSD-4141 | ZIVA HX POWER SLED2.0 | — | candidate_requires_review | — | — | [XP POWER SLED 2.0 - ZIVA](https://ziva.com/products/accessories/xp-power-sled) |

## Reproduce and continue

```bash
python3 scripts/equipments/research-official-equipment.py --check-images
pnpm test
```

The public catalogs and product pages are cached under `/tmp/gymory-official-equipment/cache` by default. Use `--cache-dir` to select a different cache or a fresh directory. Network access is required for uncached URLs. Python uses the system certificate store and adds certifi certificates when that optional package is installed.

The evidence sidecar retains search queries, official-domain search results and supplemental product URLs. Search results are collected in batches; candidates in those batches are leads, not individual match confirmations. The catalog includes retrieval timestamps, source hashes, exact matching methods and branch slugs. Original branch files remain the source of truth.
