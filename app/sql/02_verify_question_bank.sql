-- =============================================================================
-- Day5 購買層クイズ：問題バンクの検算
--
-- Issue: #6（親計画 #9）
-- 01_create_question_bank.sql の実行後に上から順に流す。
-- 期待値は 2026-09-09 時点の実測値。すべて一致すれば正常。
-- =============================================================================

USE WAREHOUSE TEAM_A_WH;

-- -----------------------------------------------------------------------------
-- 検算1: 全体のかたち
--   期待: QUESTIONS=18 / DISTINCT_GROUPS=18 / DISTINCT_TOP5=18
--         COVERED_CUSTOMERS=50118 / MIN=562 / MAX=7450
--         ALWAYS_5_CATEGORIES=TRUE / UNIQUE_IDS=TRUE
-- -----------------------------------------------------------------------------
SELECT
    COUNT(*)                                          AS QUESTIONS,
    COUNT(DISTINCT ANSWER_AGE_BAND || ANSWER_GENDER || ANSWER_MARRIAGE) AS DISTINCT_GROUPS,
    COUNT(DISTINCT TO_VARCHAR(TOP5))                  AS DISTINCT_TOP5,
    SUM(ANSWER_GROUP_SIZE)                            AS COVERED_CUSTOMERS,
    MIN(ANSWER_GROUP_SIZE)                            AS MIN_GROUP_SIZE,
    MAX(ANSWER_GROUP_SIZE)                            AS MAX_GROUP_SIZE,
    BOOLAND_AGG(ARRAY_SIZE(TOP5) = 5)                 AS ALWAYS_5_CATEGORIES,
    COUNT(DISTINCT QUESTION_ID) = COUNT(*)            AS UNIQUE_IDS
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS;

-- -----------------------------------------------------------------------------
-- 検算2: 正解の値が選択肢の範囲に収まっているか
--   期待: 0行（1行でも返ったら選択肢に無い正解が混入している＝到達不能な正解）
-- -----------------------------------------------------------------------------
SELECT QUESTION_ID, ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
WHERE ANSWER_AGE_BAND NOT IN ('10代','20代','30代','40代','50代','60代')
   OR ANSWER_GENDER   NOT IN ('男性','女性')
   OR ANSWER_MARRIAGE NOT IN ('既婚','未婚');

-- -----------------------------------------------------------------------------
-- 検算3: QUESTION_ID に属性が漏れていないか
--   期待: 0行。UUIDなので属性文字列を含むことは無いが、生成方法を変えた際の番犬。
--   注意: 「'40代' の先頭2桁 '40' がIDに含まれるか」は検査しないこと。
--         UUIDはhex文字列なので2桁の数字は偶然含まれる（実測18件中11件が
--         いずれかの年代の数字を含み、そのうち自分の正解と一致したのは2件だけ）。
--         偶然一致するので不合格にできない。判定は属性文字列そのもので行う。
-- -----------------------------------------------------------------------------
SELECT QUESTION_ID
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
WHERE QUESTION_ID ILIKE '%' || ANSWER_AGE_BAND || '%'
   OR QUESTION_ID ILIKE '%' || ANSWER_GENDER   || '%'
   OR QUESTION_ID ILIKE '%' || ANSWER_MARRIAGE || '%';

-- -----------------------------------------------------------------------------
-- 検算4: 集団人数が顧客表と一致するか
--   期待: 0行。ANSWER_GROUP_SIZE が顧客表の実数と一致すること。
--         カテゴリ不明の顧客を落としていないかの確認でもある。
-- -----------------------------------------------------------------------------
WITH expected AS (
    SELECT
        (FLOOR(AGE/10)*10)::VARCHAR || '代' AS AGE_BAND,
        GENDER_NAME  AS GENDER,
        MARRIAGE_STATUS AS MARRIAGE,
        COUNT(*)     AS EXPECTED_SIZE
    FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED
    WHERE AGE IS NOT NULL
      AND GENDER_NAME     IN ('男性','女性')
      AND MARRIAGE_STATUS IN ('既婚','未婚')
    GROUP BY 1,2,3
)
SELECT q.QUESTION_ID, q.ANSWER_AGE_BAND, q.ANSWER_GENDER, q.ANSWER_MARRIAGE,
       q.ANSWER_GROUP_SIZE, e.EXPECTED_SIZE
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS q
-- LEFT JOIN + EQUAL_NULL にする。INNER JOIN だと顧客表に無い集団が
-- 突き合わせ対象から消えて素通りしてしまう。
LEFT JOIN expected e
  ON e.AGE_BAND = q.ANSWER_AGE_BAND
 AND e.GENDER   = q.ANSWER_GENDER
 AND e.MARRIAGE = q.ANSWER_MARRIAGE
WHERE NOT EQUAL_NULL(q.ANSWER_GROUP_SIZE, e.EXPECTED_SIZE);

-- -----------------------------------------------------------------------------
-- 検算5: TOP5が購入者数の降順になっているか
--   期待: 0行。順位と購入者数の単調性が崩れていないこと。
-- -----------------------------------------------------------------------------
SELECT q.QUESTION_ID, f.value:rank::INT AS RK, f.value:buyers::INT AS BUYERS
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS q,
     LATERAL FLATTEN(input => q.TOP5) f
QUALIFY BUYERS > LAG(BUYERS) OVER (PARTITION BY q.QUESTION_ID ORDER BY RK);

-- -----------------------------------------------------------------------------
-- 検算6: 独立再計算との一致（1集団を抜き打ちで検算）
--   問題バンクを作ったCTEを使わず、素のSQLでTOP5を再計算して突き合わせる。
--   期待: 0行
-- -----------------------------------------------------------------------------
WITH target AS (
    SELECT QUESTION_ID, ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE, TOP5
    FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
    WHERE ANSWER_AGE_BAND = '30代' AND ANSWER_GENDER = '女性' AND ANSWER_MARRIAGE = '既婚'
),
recomputed AS (
    SELECT
        u.USER_ID_HASH,
        p.CATEGORY_LEVEL_1 || COALESCE(' > ' || p.CATEGORY_LEVEL_2, '') AS CATEGORY_PATH
    FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED u
    JOIN SHARED_DB.RAKUTEN_EC_RAW.DELIVERABLE_EC_MALL_PURCHASE p
      ON p.USER_ID_HASH = u.USER_ID_HASH
    WHERE u.AGE BETWEEN 30 AND 39
      AND u.GENDER_NAME = '女性'
      AND u.MARRIAGE_STATUS = '既婚'
      AND p.CATEGORY_LEVEL_1 IS NOT NULL
      AND p.PURCHASED_AT >= '2023-04-01'::TIMESTAMP_TZ
      AND p.PURCHASED_AT <  '2024-04-01'::TIMESTAMP_TZ
),
recomputed_top5 AS (
    SELECT CATEGORY_PATH, COUNT(DISTINCT USER_ID_HASH) AS BUYERS,
           ROW_NUMBER() OVER (ORDER BY COUNT(DISTINCT USER_ID_HASH) DESC, CATEGORY_PATH) AS RK
    FROM recomputed GROUP BY CATEGORY_PATH
    QUALIFY RK <= 5
),
stored AS (
    SELECT f.value:rank::INT AS RK,
           f.value:categoryPath::VARCHAR AS CATEGORY_PATH,
           f.value:buyers::INT AS BUYERS
    FROM target, LATERAL FLATTEN(input => target.TOP5) f
)
SELECT 'MISMATCH' AS ISSUE, s.RK, s.CATEGORY_PATH AS STORED_PATH, s.BUYERS AS STORED_BUYERS,
       r.CATEGORY_PATH AS RECOMPUTED_PATH, r.BUYERS AS RECOMPUTED_BUYERS
FROM stored s FULL OUTER JOIN recomputed_top5 r ON s.RK = r.RK
-- EQUAL_NULL を使う。素の = だと片側が欠けたときに比較結果がNULLになり、
-- 「不一致」ではなく「条件を満たさない」と扱われて取りこぼす。
WHERE NOT EQUAL_NULL(s.CATEGORY_PATH, r.CATEGORY_PATH)
   OR NOT EQUAL_NULL(s.BUYERS, r.BUYERS);

-- -----------------------------------------------------------------------------
-- 検算7: 中身を目視する（発表前の最終確認用）
-- -----------------------------------------------------------------------------
SELECT
    ANSWER_AGE_BAND || '/' || ANSWER_GENDER || '/' || ANSWER_MARRIAGE AS ANSWER_GROUP,
    ANSWER_GROUP_SIZE,
    ARRAY_TO_STRING(
        TRANSFORM(TOP5, o OBJECT -> o:categoryPath::VARCHAR), ' / '
    ) AS TOP5_PATHS
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
WHERE IS_ACTIVE
ORDER BY ANSWER_GROUP_SIZE DESC;
