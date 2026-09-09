-- =============================================================================
-- Day5 購買層クイズ：AI対戦（#13）でAPIが使うクエリ
--
-- Issue: #13（親計画 #9）／**MVP対象外**。MVP完成後に組み込む。
-- 前提: 04_create_ai_answers.sql を実行済み
--
-- #11・#14 が使うクエリは 03_queries_for_api.sql にある。
-- このファイルを分けているのは、#13 がMVP対象外で、03 を並行編集している
-- 出題・採点の実装とぶつけないため。
--
-- 【AIなしでも壊さないこと】
--   下のクエリが0行を返す場合（AI回答が未生成・生成失敗）は「AI対戦なし」で
--   結果画面を出す。架空のAI回答で埋めることは禁止。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- [#13] Q5: 結果画面で使うAIの回答＋採点
--
-- 呼び出しは結果画面（正解開示後）のみ。出題中に呼んではいけない。
-- AIの回答は正解ではないが、AIが「当てている」場合は正解が推測できてしまう。
--
-- bind: [questionId]
--
-- 結合は属性3つ組で行う。QUESTION_ID では紐付けない（04 の注記を参照）。
-- -----------------------------------------------------------------------------
SELECT
    q.QUESTION_ID                                            AS "questionId",
    a.MODEL                                                  AS "model",
    a.AI_AGE_BAND                                            AS "aiAgeBand",
    a.AI_GENDER                                              AS "aiGender",
    a.AI_MARRIAGE                                            AS "aiMarriageStatus",
    -- 理由は仮説。実データに基づく事実説明と分けて表示する。
    a.AI_REASON                                              AS "aiReasonHypothesis",
    -- 採点は人間と同じ「3属性中の一致数」
    IFF(a.AI_AGE_BAND  = q.ANSWER_AGE_BAND,  TRUE, FALSE)    AS "aiMatchAgeBand",
    IFF(a.AI_GENDER    = q.ANSWER_GENDER,    TRUE, FALSE)    AS "aiMatchGender",
    IFF(a.AI_MARRIAGE  = q.ANSWER_MARRIAGE,  TRUE, FALSE)    AS "aiMatchMarriageStatus",
      IFF(a.AI_AGE_BAND  = q.ANSWER_AGE_BAND,  1, 0)
    + IFF(a.AI_GENDER    = q.ANSWER_GENDER,    1, 0)
    + IFF(a.AI_MARRIAGE  = q.ANSWER_MARRIAGE,  1, 0)         AS "aiMatchCount",
    -- 事前生成であることを画面に出すために返す
    a.GENERATED_AT::VARCHAR                                  AS "aiAnsweredAt"
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS q
JOIN TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS a
  ON  a.ANSWER_AGE_BAND = q.ANSWER_AGE_BAND
  AND a.ANSWER_GENDER   = q.ANSWER_GENDER
  AND a.ANSWER_MARRIAGE = q.ANSWER_MARRIAGE
WHERE q.QUESTION_ID = ?
  AND q.IS_ACTIVE;

-- -----------------------------------------------------------------------------
-- [#13] Q6: AI全体の成績（結果画面や発表で「AIは18問中どうだったか」を出す用）
--
-- bind: なし
-- -----------------------------------------------------------------------------
SELECT
    MODEL                                                    AS "model",
    COUNT(*)                                                 AS "questionCount",
    SUM(IFF(AI_AGE_BAND  = ANSWER_AGE_BAND,  1, 0)
      + IFF(AI_GENDER    = ANSWER_GENDER,    1, 0)
      + IFF(AI_MARRIAGE  = ANSWER_MARRIAGE,  1, 0))          AS "aiTotalMatches",
    COUNT(*) * 3                                             AS "maxPossibleMatches",
    COUNT_IF(AI_AGE_BAND  = ANSWER_AGE_BAND)                 AS "aiAgeBandCorrect",
    COUNT_IF(AI_GENDER    = ANSWER_GENDER)                   AS "aiGenderCorrect",
    COUNT_IF(AI_MARRIAGE  = ANSWER_MARRIAGE)                 AS "aiMarriageCorrect"
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS
GROUP BY MODEL;
