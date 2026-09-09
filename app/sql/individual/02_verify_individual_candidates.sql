-- =============================================================================
-- 個人モード：候補ビューの検算
--
-- Issue: #22
-- 01_create_individual_candidates.sql の実行後に上から順に流す。
-- 期待値は 2026-09-09 時点の実測値。
-- =============================================================================

USE WAREHOUSE TEAM_A_WH;

-- -----------------------------------------------------------------------------
-- 検算1: 全体の行数と候補ユーザー数
--   期待: TOTAL_ROWS=416,016 / CANDIDATE_USERS=24,375
-- -----------------------------------------------------------------------------
SELECT
    COUNT(*)                        AS TOTAL_ROWS,
    COUNT(DISTINCT USER_ID_HASH)    AS CANDIDATE_USERS
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES;

-- -----------------------------------------------------------------------------
-- 検算2: カテゴリ5件未満のユーザーが0人であること
--   期待: 0
-- -----------------------------------------------------------------------------
SELECT COUNT(DISTINCT USER_ID_HASH) AS USERS_UNDER_5
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
WHERE CATEGORY_COUNT < 5;

-- -----------------------------------------------------------------------------
-- 検算3: ユーザー×カテゴリの重複が無いこと
--   期待: 0行
-- -----------------------------------------------------------------------------
SELECT USER_ID_HASH, CATEGORY_PATH, COUNT(*) AS CNT
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
GROUP BY 1, 2
HAVING CNT > 1;

-- -----------------------------------------------------------------------------
-- 検算4: 正解属性が回答選択肢（24通り）に収まること
--   期待: 0
-- -----------------------------------------------------------------------------
SELECT COUNT(DISTINCT USER_ID_HASH) AS INVALID_USERS
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
WHERE ANSWER_AGE_BAND NOT IN ('10代','20代','30代','40代','50代','60代')
   OR ANSWER_GENDER   NOT IN ('男性','女性')
   OR ANSWER_MARRIAGE NOT IN ('既婚','未婚');

-- -----------------------------------------------------------------------------
-- 検算5: 年代・性別・婚姻別の候補人数
--   期待: 24行（全セグメントに候補あり）
-- -----------------------------------------------------------------------------
SELECT ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE,
       COUNT(DISTINCT USER_ID_HASH) AS CANDIDATE_COUNT
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3;

-- -----------------------------------------------------------------------------
-- 検算6: カテゴリ数の分布
-- -----------------------------------------------------------------------------
SELECT
    CASE WHEN CATEGORY_COUNT BETWEEN 5 AND 9 THEN '5-9'
         WHEN CATEGORY_COUNT BETWEEN 10 AND 19 THEN '10-19'
         WHEN CATEGORY_COUNT BETWEEN 20 AND 49 THEN '20-49'
         ELSE '50+' END AS CAT_RANGE,
    COUNT(DISTINCT USER_ID_HASH) AS USER_COUNT
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
GROUP BY 1
ORDER BY MIN(CATEGORY_COUNT);

-- -----------------------------------------------------------------------------
-- 検算7: サンプル3名を元データと照合（属性・カテゴリ・期間の一致）
-- -----------------------------------------------------------------------------
WITH sample_users AS (
    SELECT USER_ID_HASH
    FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
    LIMIT 3
),
attr_check AS (
    SELECT v.USER_ID_HASH,
           v.ANSWER_AGE_BAND, v.ANSWER_GENDER, v.ANSWER_MARRIAGE,
           (FLOOR(u.AGE/10)*10)::VARCHAR || '代' AS SRC_AGE,
           u.GENDER_NAME AS SRC_GENDER, u.MARRIAGE_STATUS AS SRC_MARRIAGE,
           CASE WHEN v.ANSWER_AGE_BAND = (FLOOR(u.AGE/10)*10)::VARCHAR || '代'
                 AND v.ANSWER_GENDER = u.GENDER_NAME
                 AND v.ANSWER_MARRIAGE = u.MARRIAGE_STATUS THEN 'MATCH' ELSE 'MISMATCH' END AS ATTR_OK
    FROM (SELECT DISTINCT USER_ID_HASH, ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE
          FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
          WHERE USER_ID_HASH IN (SELECT USER_ID_HASH FROM sample_users)) v
    JOIN TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED u ON v.USER_ID_HASH = u.USER_ID_HASH
)
SELECT * FROM attr_check;
