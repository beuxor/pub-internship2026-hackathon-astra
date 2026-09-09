-- =============================================================================
-- Day5 購買層クイズ：問題バンク生成
--
-- Issue: #6（親計画 #9）
-- 仕様の正本: https://github.com/beuxor/pub-internship2026-hackathon-astra/issues/9#issuecomment-5595387038
--
-- 再実行可能。CREATE OR REPLACE なので毎回すべて作り直す。
-- 【注意】再実行すると QUESTION_ID が新しく振られる。プレイ中に実行すると
--         進行中の問題が引けなくなる。実行は明示操作のみ。定期タスクは作らない。
--
-- 実行前に確認すること:
--   - 作成先が TEAM_A_DB.DEVELOPMENT であること
--   - 既存の大福帳・顧客表・他チームDBを変更しないこと（このSQLは参照のみ）
-- =============================================================================

USE WAREHOUSE TEAM_A_WH;

-- TRANSIENT: 同スキーマのdbt生成表と揃える。数秒で再生成できるためTime Travel不要。
CREATE OR REPLACE TRANSIENT TABLE TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS AS
WITH cust AS (
    -- 集団の定義は「顧客表」が正本（#9: 集団は顧客表で定義し、条件に該当する全員を含める）
    -- 出題対象の限定: 年齢が判明・性別が男性/女性・婚姻が既婚/未婚
    --   選択肢を2値に固定するため。死別/不明/NULL を他の値へ書き換えることはしない。
    SELECT
        USER_ID_HASH,
        (FLOOR(AGE / 10) * 10)::VARCHAR || '代' AS AGE_BAND,
        GENDER_NAME                            AS GENDER,
        MARRIAGE_STATUS                        AS MARRIAGE
    FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED
    WHERE AGE IS NOT NULL
      AND GENDER_NAME     IN ('男性', '女性')
      AND MARRIAGE_STATUS IN ('既婚', '未婚')
),

grp AS (
    -- 集団人数。カテゴリ不明の購買しかない顧客も必ず含める。
    -- （対象18集団で796人が該当。ランキングには寄与しないが集団の一員）
    -- COUNT(DISTINCT USER_ID_HASH) で数える。#14 の人数定義と揃えるため。
    -- 現データに顧客重複は無い（70,113行 = 70,113 distinct）が、重複が入ると
    -- 500人の出題条件と衝突時に残す集団の選択まで狂うので定義で防ぐ。
    SELECT AGE_BAND, GENDER, MARRIAGE, COUNT(DISTINCT USER_ID_HASH) AS GROUP_SIZE
    FROM cust
    GROUP BY 1, 2, 3
),

eligible AS (
    -- 出題対象は500人以上の集団のみ。
    -- これは「出題対象」の限定であり「採点母集団」の限定ではない。
    -- しきい値なしだと 0代女性既婚(2人) 等が出題され、5位に39カテゴリが同数で並ぶ。
    SELECT * FROM grp WHERE GROUP_SIZE >= 500
),

pur AS (
    -- カテゴリは元表を正本にする。大福帳とは結合しない。
    --   大福帳の CATEGORY_LEVEL_1 は元表と437,175明細(29.77%)不一致
    --   大福帳経由だと226,005明細・約914百万円が欠落する
    -- CATEGORY_LEVEL_2 が NULL のときは LEVEL_1 だけ（「食品 > (なし)」を作らない）
    SELECT
        USER_ID_HASH,
        CATEGORY_LEVEL_1 || COALESCE(' > ' || CATEGORY_LEVEL_2, '') AS CATEGORY_PATH
    FROM SHARED_DB.RAKUTEN_EC_RAW.DELIVERABLE_EC_MALL_PURCHASE
    WHERE PURCHASED_AT >= '2023-04-01'::TIMESTAMP_TZ
      AND PURCHASED_AT <  '2024-04-01'::TIMESTAMP_TZ   -- 翌日未満で最終日全体を含める
      AND CATEGORY_LEVEL_1 IS NOT NULL
),

cat AS (
    -- ランキングは「購入者数」。購入金額合計ではない。
    --   金額だと1顧客が上位を独占する（10人未満の集団ではTOP1売上の100%が1顧客）
    --   購入者数なら1顧客は1しか数えられない
    SELECT
        c.AGE_BAND, c.GENDER, c.MARRIAGE,
        p.CATEGORY_PATH,
        COUNT(DISTINCT p.USER_ID_HASH) AS BUYERS
    FROM cust c
    JOIN eligible e USING (AGE_BAND, GENDER, MARRIAGE)
    JOIN pur      p ON p.USER_ID_HASH = c.USER_ID_HASH
    GROUP BY 1, 2, 3, 4
),

ranked AS (
    -- 同数はカテゴリパス順で固定（集計後にTOP5。集計前のLIMITはしない）
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY AGE_BAND, GENDER, MARRIAGE
            ORDER BY BUYERS DESC, CATEGORY_PATH
        ) AS RK
    FROM cat
),

top5 AS (
    SELECT
        AGE_BAND, GENDER, MARRIAGE,
        -- 衝突判定用の署名（並び順を含む）
        LISTAGG(CATEGORY_PATH, ' | ') WITHIN GROUP (ORDER BY RK) AS SIG,
        ARRAY_AGG(
            OBJECT_CONSTRUCT('rank', RK, 'categoryPath', CATEGORY_PATH, 'buyers', BUYERS)
        ) WITHIN GROUP (ORDER BY RK) AS TOP5
    FROM ranked
    WHERE RK <= 5
    GROUP BY 1, 2, 3
),

dedup AS (
    -- TOP5が並び順まで一致する集団は人数最大のものだけ残す。
    -- 実測で1件該当: 30代女性/未婚(4,021) と 40代女性/未婚(1,490)
    -- 根拠なく唯一の正解だと扱わないため、曖昧な候補を出題しない。
    SELECT t.AGE_BAND, t.GENDER, t.MARRIAGE, e.GROUP_SIZE, t.TOP5, t.SIG
    FROM top5 t
    JOIN eligible e USING (AGE_BAND, GENDER, MARRIAGE)
    QUALIFY ROW_NUMBER() OVER (PARTITION BY t.SIG ORDER BY e.GROUP_SIZE DESC) = 1
)

SELECT
    -- 属性を一切含まない不透明ID。ハッシュではなく乱数。
    -- 集団は24通りしかないので、属性のハッシュは全列挙で逆引きできてしまう。
    UUID_STRING()                       AS QUESTION_ID,
    AGE_BAND                            AS ANSWER_AGE_BAND,
    GENDER                              AS ANSWER_GENDER,
    MARRIAGE                            AS ANSWER_MARRIAGE,
    GROUP_SIZE                          AS ANSWER_GROUP_SIZE,
    TOP5                                AS TOP5,
    'buyer_count'                       AS RANKING_METHOD,
    '2023-04-01'::DATE                  AS PERIOD_START,
    '2024-03-31'::DATE                  AS PERIOD_END,
    'day5-quiz-v1'                      AS DATA_VERSION,
    TRUE                                AS IS_ACTIVE,
    CURRENT_TIMESTAMP()                 AS GENERATED_AT
FROM dedup
ORDER BY GROUP_SIZE DESC;
