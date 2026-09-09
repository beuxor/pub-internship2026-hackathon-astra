-- =============================================================================
-- 個人モード：出題候補ビュー
--
-- Issue: #22（個人モード追加：ユーザー別の購入カテゴリを整備する）
--
-- ビュー: TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
--   1行 = 出題候補ユーザー × 購入カテゴリ
--   ビューなので元データの変更が自動で反映される（固定済みスナップショットではない）。
--
-- 候補条件:
--   1. 年代が10代〜60代（FLOOR(AGE/10)*10 が 10〜60）
--   2. 性別が男性 or 女性
--   3. 婚姻が既婚 or 未婚
--   4. 期間内の購入カテゴリ(LEVEL_1+LEVEL_2)が重複なしで5件以上
--   ※ 集団モードの「500人以上」条件は適用しない
--
-- 元データは変更しない。INT_USERS_ENRICHED と DELIVERABLE_EC_MALL_PURCHASE は参照のみ。
-- =============================================================================

USE WAREHOUSE TEAM_A_WH;

CREATE OR REPLACE VIEW TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES AS
WITH cust AS (
    -- 正解属性の正本は INT_USERS_ENRICHED
    -- NULL・不明・死別などは除外するだけで、別の値に書き換えない
    SELECT
        USER_ID_HASH,
        (FLOOR(AGE / 10) * 10)::VARCHAR || '代' AS ANSWER_AGE_BAND,
        GENDER_NAME                              AS ANSWER_GENDER,
        MARRIAGE_STATUS                          AS ANSWER_MARRIAGE
    FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED
    WHERE AGE IS NOT NULL
      AND FLOOR(AGE / 10) * 10 BETWEEN 10 AND 60
      AND GENDER_NAME     IN ('男性', '女性')
      AND MARRIAGE_STATUS IN ('既婚', '未婚')
),

pur AS (
    -- カテゴリは元表から直接取得。大福帳は経由しない（集団モードと同じ方針）
    -- LEVEL_2がNULLならLEVEL_1だけ表示（「食品 > (なし)」を作らない）
    -- 期間: 2023-04-01以上、2024-04-01未満（集団モードと同じ TIMESTAMP_TZ 比較）
    SELECT
        USER_ID_HASH,
        CATEGORY_LEVEL_1 || COALESCE(' > ' || CATEGORY_LEVEL_2, '') AS CATEGORY_PATH
    FROM SHARED_DB.RAKUTEN_EC_RAW.DELIVERABLE_EC_MALL_PURCHASE
    WHERE PURCHASED_AT >= '2023-04-01'::TIMESTAMP_TZ
      AND PURCHASED_AT <  '2024-04-01'::TIMESTAMP_TZ
      AND CATEGORY_LEVEL_1 IS NOT NULL
),

user_cats AS (
    -- ユーザーごとの購入カテゴリを重複なく取得
    SELECT DISTINCT
        c.USER_ID_HASH,
        c.ANSWER_AGE_BAND,
        c.ANSWER_GENDER,
        c.ANSWER_MARRIAGE,
        p.CATEGORY_PATH
    FROM cust c
    JOIN pur p ON c.USER_ID_HASH = p.USER_ID_HASH
),

user_cat_count AS (
    -- ユーザーごとの異なるカテゴリ数
    SELECT
        USER_ID_HASH,
        COUNT(*) AS CATEGORY_COUNT
    FROM user_cats
    GROUP BY USER_ID_HASH
)

SELECT
    uc.USER_ID_HASH,
    uc.ANSWER_AGE_BAND,
    uc.ANSWER_GENDER,
    uc.ANSWER_MARRIAGE,
    uc.CATEGORY_PATH,
    ucc.CATEGORY_COUNT,
    '2023-04-01'::DATE AS PERIOD_START,
    '2024-03-31'::DATE AS PERIOD_END
FROM user_cats uc
JOIN user_cat_count ucc ON uc.USER_ID_HASH = ucc.USER_ID_HASH
WHERE ucc.CATEGORY_COUNT >= 5;
