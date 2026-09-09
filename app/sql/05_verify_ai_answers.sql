-- =============================================================================
-- Day5 購買層クイズ：AI回答の検算と人間との比較
--
-- Issue: #13（親計画 #9）
-- 04_create_ai_answers.sql の実行後に上から順に流す。
-- 期待値は 2026-09-09 時点の実測値（model=claude-sonnet-4-6, temperature=0）。
--
-- 【注意】AIの応答は temperature=0 でも完全な決定性は保証されない。
--   検算1の内訳が数問ずれても異常ではない。検算2〜4が0行であることを重視する。
-- =============================================================================

USE WAREHOUSE TEAM_A_WH;

-- -----------------------------------------------------------------------------
-- 検算1: 全体の成績
--   期待: QUESTIONS=18 / AVG_MATCH_OF_3=1.94
--         PERFECT_3=3 / MATCH_2=11 / MATCH_1=4 / MATCH_0=0
--         AGE_CORRECT=5 / GENDER_CORRECT=14 / MARRIAGE_CORRECT=16
--         DISTINCT_AI_ANSWERS=5
--   採点は #14 と同じ「3属性中の一致数」。人間とAIで同じ関数を使う。
-- -----------------------------------------------------------------------------
WITH scored AS (
    SELECT
        ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE,
        AI_AGE_BAND, AI_GENDER, AI_MARRIAGE,
        IFF(AI_AGE_BAND  = ANSWER_AGE_BAND,  1, 0)
      + IFF(AI_GENDER    = ANSWER_GENDER,    1, 0)
      + IFF(AI_MARRIAGE  = ANSWER_MARRIAGE,  1, 0) AS MATCH_COUNT
    FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS
)
SELECT
    COUNT(*)                                                AS QUESTIONS,
    ROUND(AVG(MATCH_COUNT), 2)                              AS AVG_MATCH_OF_3,
    COUNT_IF(MATCH_COUNT = 3)                               AS PERFECT_3,
    COUNT_IF(MATCH_COUNT = 2)                               AS MATCH_2,
    COUNT_IF(MATCH_COUNT = 1)                               AS MATCH_1,
    COUNT_IF(MATCH_COUNT = 0)                               AS MATCH_0,
    COUNT_IF(AI_AGE_BAND  = ANSWER_AGE_BAND)                AS AGE_CORRECT,
    COUNT_IF(AI_GENDER    = ANSWER_GENDER)                  AS GENDER_CORRECT,
    COUNT_IF(AI_MARRIAGE  = ANSWER_MARRIAGE)                AS MARRIAGE_CORRECT,
    COUNT(DISTINCT AI_AGE_BAND || AI_GENDER || AI_MARRIAGE) AS DISTINCT_AI_ANSWERS
FROM scored;

-- -----------------------------------------------------------------------------
-- 検算2: AIの回答が選択肢の範囲に収まっているか
--   期待: 0行。型リテラルで構造は保証されるが、値そのものは保証されないため確認する。
--   1行でも返ったら、人間と同じ採点にかけられない値が入っている。
-- -----------------------------------------------------------------------------
SELECT ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE,
       AI_AGE_BAND, AI_GENDER, AI_MARRIAGE
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS
WHERE AI_AGE_BAND  NOT IN ('10代','20代','30代','40代','50代','60代')
   OR AI_GENDER    NOT IN ('男性','女性')
   OR AI_MARRIAGE  NOT IN ('既婚','未婚')
   OR AI_REASON IS NULL;

-- -----------------------------------------------------------------------------
-- 検算3: 問題バンクと1対1で対応しているか
--   期待: 0行。出題対象の18集団すべてにAI回答があり、余りも無いこと。
--   AI回答が欠けている集団があると、その問題だけAI対戦が成立しない。
-- -----------------------------------------------------------------------------
SELECT
    COALESCE(q.ANSWER_AGE_BAND, a.ANSWER_AGE_BAND)   AS AGE_BAND,
    COALESCE(q.ANSWER_GENDER,   a.ANSWER_GENDER)     AS GENDER,
    COALESCE(q.ANSWER_MARRIAGE, a.ANSWER_MARRIAGE)   AS MARRIAGE,
    IFF(q.ANSWER_AGE_BAND IS NULL, 'AI回答のみ（バンクに無い集団）',
                                   '問題のみ（AI回答が無い）')  AS ISSUE
FROM (SELECT ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE
      FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS WHERE IS_ACTIVE) q
FULL OUTER JOIN TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS a
  ON  a.ANSWER_AGE_BAND = q.ANSWER_AGE_BAND
  AND a.ANSWER_GENDER   = q.ANSWER_GENDER
  AND a.ANSWER_MARRIAGE = q.ANSWER_MARRIAGE
WHERE q.ANSWER_AGE_BAND IS NULL OR a.ANSWER_AGE_BAND IS NULL;

-- -----------------------------------------------------------------------------
-- 検算4: AIの理由に正解がそのまま書かれていないか（漏洩の逆方向チェック）
--   期待: 0行に近い。AIは正解を知らされていないので、理由が正解と一致するのは
--         推測が当たった場合だけ。ここでは「正解を渡していないこと」の確認ではなく、
--         理由文をそのまま画面に出す際に断定表現になっていないかの目視用。
--   正解を渡していないことの保証は 04 のプロンプト定義そのもの（属性を入れていない）。
-- -----------------------------------------------------------------------------
SELECT
    ANSWER_AGE_BAND || '/' || ANSWER_GENDER || '/' || ANSWER_MARRIAGE AS CORRECT_ANSWER,
    AI_AGE_BAND || '/' || AI_GENDER || '/' || AI_MARRIAGE             AS AI_SAID,
    AI_REASON
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS
WHERE AI_REASON ILIKE '%必ず%'
   OR AI_REASON ILIKE '%確実%'
   OR AI_REASON ILIKE '%間違いなく%';

-- -----------------------------------------------------------------------------
-- 検算5: どこで間違えたかの一覧（発表前の目視用）
--   AIの弱点を確認する。実測ではAIは18集団を5つの典型像に圧縮しており、
--   10代・50代・60代とは一度も答えていない。
-- -----------------------------------------------------------------------------
SELECT
    ANSWER_AGE_BAND || '/' || ANSWER_GENDER || '/' || ANSWER_MARRIAGE AS CORRECT_ANSWER,
    AI_AGE_BAND || '/' || AI_GENDER || '/' || AI_MARRIAGE             AS AI_SAID,
    IFF(AI_AGE_BAND  = ANSWER_AGE_BAND,  'o', 'x')
 || IFF(AI_GENDER    = ANSWER_GENDER,    'o', 'x')
 || IFF(AI_MARRIAGE  = ANSWER_MARRIAGE,  'o', 'x')                    AS PATTERN,
    IFF(AI_AGE_BAND  = ANSWER_AGE_BAND,  1, 0)
  + IFF(AI_GENDER    = ANSWER_GENDER,    1, 0)
  + IFF(AI_MARRIAGE  = ANSWER_MARRIAGE,  1, 0)                        AS MATCH_COUNT
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS
ORDER BY MATCH_COUNT DESC, CORRECT_ANSWER;

-- -----------------------------------------------------------------------------
-- 検算6: AIがどの回答に寄せているか（典型像への圧縮を確認する）
--   実測: 「20代/女性/未婚」を7集団に、「30代/女性/既婚」を5集団に当てていた。
-- -----------------------------------------------------------------------------
SELECT
    AI_AGE_BAND || '/' || AI_GENDER || '/' || AI_MARRIAGE AS AI_SAID,
    COUNT(*)                                             AS TIMES_USED,
    LISTAGG(ANSWER_AGE_BAND || '/' || ANSWER_GENDER || '/' || ANSWER_MARRIAGE, ' , ')
      WITHIN GROUP (ORDER BY ANSWER_AGE_BAND)            AS ACTUAL_GROUPS
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS
GROUP BY 1
ORDER BY TIMES_USED DESC;
