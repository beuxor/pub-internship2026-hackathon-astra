-- =============================================================================
-- Day5 購買層クイズ：Cortex AI の回答を事前生成する
--
-- Issue: #13（親計画 #9）
-- 前提: 01_create_question_bank.sql を実行済み
--
-- 人間に見せているのと同じヒントだけをAIに渡し、同じ選択肢から答えさせる。
-- 事前生成する理由:
--   - 公開ヒントは固定（18問）なので毎回呼ぶ必要がない
--   - プレイ中にAI呼び出しの待ち時間が入らない
--   - AI呼び出しが失敗・制限されても人間のクイズは遊べる（このテーブルが無いか
--     行が引けなければ「AI対戦なし」で進行させるだけ）
-- 画面には「AIの回答は事前に生成したものです」と明記する。
--
-- 【重要】結合キーは属性3つ組であり QUESTION_ID ではない。
--   QUESTION_ID は UUID_STRING() なので 01 を再実行するたびに変わる。
--   QUESTION_ID で紐付けると再生成した瞬間に全件が孤児になる（実際に発生した）。
--   属性3つ組は再生成に対して安定なので、こちらをキーにする。
--   プレイヤー向けの不透明IDとしての QUESTION_ID の役割は変えていない。
-- =============================================================================

USE WAREHOUSE TEAM_A_WH;

-- TRANSIENT: 同スキーマの他表と揃える。AI呼び出し18回で再生成できる。
CREATE OR REPLACE TRANSIENT TABLE TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS AS
WITH hints AS (
    -- AIへの入力は人間に見せる公開情報だけ:
    --   期間 / ランキング定義（購入者数）/ カテゴリ名と順位
    -- 入力に含めないもの:
    --   正解の属性・buyers（購入者数の実数）・集団人数・顧客ID・プレイヤーの回答
    -- 属性3つ組は下の SELECT で出力キーとして使うだけで、プロンプトには入れない。
    SELECT
        q.ANSWER_AGE_BAND,
        q.ANSWER_GENDER,
        q.ANSWER_MARRIAGE,
        q.DATA_VERSION,
        q.PERIOD_START,
        q.PERIOD_END,
        LISTAGG(f.VALUE:rank::VARCHAR || '. ' || f.VALUE:categoryPath::VARCHAR, '\n')
          WITHIN GROUP (ORDER BY f.VALUE:rank::NUMBER) AS CATEGORY_LIST
    FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS q,
         LATERAL FLATTEN(input => q.TOP5) f
    WHERE q.IS_ACTIVE
    GROUP BY 1, 2, 3, 4, 5, 6
),

answered AS (
    SELECT
        ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE, DATA_VERSION,
        -- temperature 0 で再実行時のぶれを抑える（完全な決定性は保証されない）
        -- response_format の型リテラルで選択肢外の値と欠損を構造的に防ぐ
        AI_COMPLETE(
            model  => 'claude-sonnet-4-6',
            prompt => '日本のECサイトの購買データから、ある顧客集団の属性を推測してください。'
                   || '\n\n以下は、この集団が ' || PERIOD_START::VARCHAR || ' 〜 ' || PERIOD_END::VARCHAR
                   || ' に購入した商品カテゴリの上位5件です。'
                   || '\n順位は「そのカテゴリを購入した人数」が多い順です（購入金額ではありません）。'
                   || '\n\n' || CATEGORY_LIST
                   || '\n\nこの集団の年代・性別・婚姻状況を推測してください。'
                   || '\nageBand は 10代/20代/30代/40代/50代/60代 のいずれか1つ。'
                   || '\ngender は 男性/女性 のいずれか1つ。'
                   || '\nmarriageStatus は 既婚/未婚 のいずれか1つ。'
                   || '\nreason は推測の根拠を日本語1〜2文で。',
            model_parameters => { 'temperature': 0, 'max_tokens': 500 },
            response_format  => TYPE OBJECT(
                ageBand STRING, gender STRING, marriageStatus STRING, reason STRING
            )
        ) AS RAW_ANSWER
    FROM hints
)

SELECT
    -- 結合キー（安定）。この3列は「どの集団についてのAI回答か」を表す。
    ANSWER_AGE_BAND,
    ANSWER_GENDER,
    ANSWER_MARRIAGE,
    'claude-sonnet-4-6'                AS MODEL,
    -- AIの回答
    RAW_ANSWER:ageBand::VARCHAR        AS AI_AGE_BAND,
    RAW_ANSWER:gender::VARCHAR         AS AI_GENDER,
    RAW_ANSWER:marriageStatus::VARCHAR AS AI_MARRIAGE,
    -- 理由は「仮説」。実データに基づく事実説明とは分けて表示する。
    -- 個人の属性を断定する文として扱わない。
    RAW_ANSWER:reason::VARCHAR         AS AI_REASON,
    RAW_ANSWER                         AS RAW_ANSWER,     -- 監査用に生の応答を残す
    'day5-ai-prompt-v1'                AS PROMPT_VERSION,
    DATA_VERSION                       AS SOURCE_DATA_VERSION,
    CURRENT_TIMESTAMP()                AS GENERATED_AT
FROM answered;
