-- =============================================================================
-- Day5 購買層クイズ：API から使うクエリ
--
-- Issue: #6（親計画 #9）が提供し、#11（出題API）と #14（採点API）が使う。
--
-- 重要な境界:
--   出題時に返してよいのは rank と categoryPath だけ。
--   buyers（購入者数）と正解3属性は回答後にのみ返す。
--   buyers は集団規模の強いヒントになるため、出題時には構造的に落とす。
--
-- ユーザー入力は必ず bind（? プレースホルダ）で渡す。SQL文字列へ連結しない。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- [#11] Q1: 5問セットをまとめて取得（公開情報のみ）
--
-- 固定5問セットなので、1回で5問取る方が出題の重複制御を持たなくて済む。
-- TRANSFORM で buyers を落としているので、この結果をそのまま返しても漏れない。
-- -----------------------------------------------------------------------------
SELECT
    QUESTION_ID                                  AS "questionId",
    RANKING_METHOD                               AS "rankingMethod",
    PERIOD_START::VARCHAR                        AS "periodStart",
    PERIOD_END::VARCHAR                          AS "periodEnd",
    TRANSFORM(
        TOP5,
        o OBJECT -> OBJECT_CONSTRUCT('rank', o:rank, 'categoryPath', o:categoryPath)
    )                                            AS "categories"
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
WHERE IS_ACTIVE
ORDER BY RANDOM()
LIMIT 5;

-- -----------------------------------------------------------------------------
-- [#11] Q2: questionId を指定して1問だけ取得（公開情報のみ）
--
-- リロードやタブ復帰で問題を引き直さないために使う。
-- 同じ questionId なら常に同じ問題を返す。
-- bind: [questionId]
-- -----------------------------------------------------------------------------
SELECT
    QUESTION_ID                                  AS "questionId",
    RANKING_METHOD                               AS "rankingMethod",
    PERIOD_START::VARCHAR                        AS "periodStart",
    PERIOD_END::VARCHAR                          AS "periodEnd",
    TRANSFORM(
        TOP5,
        o OBJECT -> OBJECT_CONSTRUCT('rank', o:rank, 'categoryPath', o:categoryPath)
    )                                            AS "categories"
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
WHERE IS_ACTIVE
  AND QUESTION_ID = ?;

-- -----------------------------------------------------------------------------
-- [#14] Q3: 正解と回答後の開示データを取得
--
-- クライアントが送ってくる正解・点数は一切信用せず、必ずこれで取り直す。
-- 0行なら「不正な questionId」としてエラーにする（架空データで埋めない）。
-- bind: [questionId]
-- -----------------------------------------------------------------------------
SELECT
    QUESTION_ID          AS "questionId",
    ANSWER_AGE_BAND      AS "correctAgeBand",
    ANSWER_GENDER        AS "correctGender",
    ANSWER_MARRIAGE      AS "correctMarriageStatus",
    ANSWER_GROUP_SIZE    AS "correctGroupSize",
    TOP5                 AS "categoryDetails"   -- buyers を含む。回答後のみ返す
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
WHERE IS_ACTIVE
  AND QUESTION_ID = ?;

-- -----------------------------------------------------------------------------
-- [#14] Q4: プレイヤーが回答した集団の人数
--
-- 表示専用。採点（matchCount）には使わない。
-- プレイヤーは出題対象外（500人未満）の集団も回答できる。その場合も実数を返す。
-- 集団の定義は顧客表が正本。カテゴリ不明の顧客も含める。
-- bind: [ageBand, gender, marriageStatus]
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS "answerGroupSize"
FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED
WHERE AGE IS NOT NULL
  AND GENDER_NAME     IN ('男性', '女性')
  AND MARRIAGE_STATUS IN ('既婚', '未婚')
  AND (FLOOR(AGE / 10) * 10)::VARCHAR || '代' = ?
  AND GENDER_NAME                             = ?
  AND MARRIAGE_STATUS                         = ?;

-- -----------------------------------------------------------------------------
-- [参考] 画面に出す母集団の説明に使う数字
--
-- 「年齢・性別・婚姻が判明し、500人以上いる集団から出題しています。
--   全顧客70,113人のうち50,118人（71.5%）が対象です」
--
-- 下のクエリで実数を確認できる。ハードコードする前に実行して照合すること。
-- -----------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED)        AS "totalCustomers",
    (SELECT SUM(ANSWER_GROUP_SIZE)
       FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS WHERE IS_ACTIVE)     AS "coveredCustomers",
    ROUND(
        100.0 * (SELECT SUM(ANSWER_GROUP_SIZE)
                   FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS WHERE IS_ACTIVE)
        / (SELECT COUNT(*) FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED), 1
    )                                                                      AS "coveredPct",
    (SELECT COUNT(*) FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS WHERE IS_ACTIVE) AS "questionCount";
