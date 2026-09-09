import { NextResponse } from "next/server";

import { querySnowflake } from "@/lib/snowflake";
import { scoreAnswer, type QuizAttributes } from "@/lib/quiz-score";
import {
  AGE_BANDS,
  GENDERS,
  MARRIAGE_STATUSES,
  type AgeBand,
  type AnswerResponse,
  type Gender,
  type MarriageStatus,
} from "@/lib/quiz-types";

export const dynamic = "force-dynamic";

const WAREHOUSE = "TEAM_A_WH";

/** UUID_STRING() は36文字。異常に長い入力は検証段階で落とす */
const QUESTION_ID_MAX_LENGTH = 64;

/**
 * app/sql/03_queries_for_api.sql の Q3。
 * 正解と回答後の開示データを取得する。クライアントが送ってくる正解・点数は使わない。
 */
const Q3_CORRECT_ANSWER = `
  SELECT
      QUESTION_ID          AS "questionId",
      ANSWER_AGE_BAND      AS "correctAgeBand",
      ANSWER_GENDER        AS "correctGender",
      ANSWER_MARRIAGE      AS "correctMarriageStatus",
      ANSWER_GROUP_SIZE    AS "correctGroupSize",
      TOP5                 AS "categoryDetails",
      DATA_VERSION         AS "dataVersion"
  FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
  WHERE IS_ACTIVE
    AND QUESTION_ID = ?
`;

/**
 * app/sql/03_queries_for_api.sql の Q4。
 * プレイヤーが回答した集団の人数（表示専用。採点には使わない）。
 * 出題対象外（500人未満）の集団を回答された場合も実数を返す。
 */
const Q4_ANSWER_GROUP_SIZE = `
  SELECT COUNT(DISTINCT USER_ID_HASH) AS "answerGroupSize"
  FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED
  WHERE AGE IS NOT NULL
    AND GENDER_NAME     IN ('男性', '女性')
    AND MARRIAGE_STATUS IN ('既婚', '未婚')
    AND (FLOOR(AGE / 10) * 10)::VARCHAR || '代' = ?
    AND GENDER_NAME                             = ?
    AND MARRIAGE_STATUS                         = ?
`;

const Q5_AI_ANSWER = `
  SELECT
      MODEL        AS "model",
      AI_AGE_BAND  AS "aiAgeBand",
      AI_GENDER    AS "aiGender",
      AI_MARRIAGE  AS "aiMarriage",
      AI_REASON    AS "aiReason"
  FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_AI_ANSWERS
  WHERE ANSWER_AGE_BAND = ?
    AND ANSWER_GENDER   = ?
    AND ANSWER_MARRIAGE = ?
    AND SOURCE_DATA_VERSION = ?
  LIMIT 1
`;

function isAgeBand(value: unknown): value is AgeBand {
  return typeof value === "string" && (AGE_BANDS as readonly string[]).includes(value);
}

function isGender(value: unknown): value is Gender {
  return typeof value === "string" && (GENDERS as readonly string[]).includes(value);
}

function isMarriageStatus(value: unknown): value is MarriageStatus {
  return typeof value === "string" && (MARRIAGE_STATUSES as readonly string[]).includes(value);
}

type ValidationResult =
  | { ok: true; questionId: string; answer: QuizAttributes }
  | { ok: false; error: string };

/**
 * リクエストボディを検証する。
 * 列挙値はサーバー側で確認し、任意の文字列やSQL断片は受け付けない。
 */
function validateRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "リクエストの形式が不正です。" };
  }

  const { questionId, answer } = body as Record<string, unknown>;

  if (typeof questionId !== "string" || questionId.length === 0) {
    return { ok: false, error: "questionId が指定されていません。" };
  }
  if (questionId.length > QUESTION_ID_MAX_LENGTH) {
    return { ok: false, error: "questionId が不正です。" };
  }

  if (typeof answer !== "object" || answer === null) {
    return { ok: false, error: "answer が指定されていません。" };
  }

  const { ageBand, gender, marriageStatus } = answer as Record<string, unknown>;

  if (!isAgeBand(ageBand)) {
    return { ok: false, error: "年代の選択値が不正です。" };
  }
  if (!isGender(gender)) {
    return { ok: false, error: "性別の選択値が不正です。" };
  }
  if (!isMarriageStatus(marriageStatus)) {
    return { ok: false, error: "婚姻状況の選択値が不正です。" };
  }

  return { ok: true, questionId, answer: { ageBand, gender, marriageStatus } };
}

/**
 * TOP5（Snowflakeの ARRAY 列）を AnswerResponse の形に整える。
 * ドライバによって JSON 文字列で返る場合と配列で返る場合があるため両対応。
 */
function parseCategoryDetails(raw: unknown): AnswerResponse["categoryDetails"] {
  const list: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;

  if (!Array.isArray(list)) {
    throw new Error("TOP5 の形式が不正です");
  }

  return list
    .map((item) => {
      const entry = item as Record<string, unknown>;
      return {
        rank: Number(entry.rank),
        categoryPath: String(entry.categoryPath),
        buyers: Number(entry.buyers),
      };
    })
    .sort((a, b) => a.rank - b.rank);
}

export async function POST(
  request: Request,
): Promise<NextResponse<AnswerResponse | { error: string }>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  const validated = validateRequest(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { questionId, answer } = validated;

  try {
    // 正解はここで取り直す。リクエストに含まれる正解や点数は一切使わない。
    const correctRows = await querySnowflake(Q3_CORRECT_ANSWER, {
      binds: [questionId],
      warehouse: WAREHOUSE,
    });

    if (correctRows.length === 0) {
      return NextResponse.json({ error: "問題が見つかりません。" }, { status: 404 });
    }

    const row = correctRows[0];
    const correctAgeBand = row.correctAgeBand;
    const correctGender = row.correctGender;
    const correctMarriageStatus = row.correctMarriageStatus;

    // 問題バンクの値が選択肢と揃っていることを確認する（バンク再生成時のずれ検知）
    if (
      !isAgeBand(correctAgeBand) ||
      !isGender(correctGender) ||
      !isMarriageStatus(correctMarriageStatus)
    ) {
      console.error("[answer] 問題バンクの正解が選択肢と一致しません", { questionId });
      return NextResponse.json({ error: "問題データが不正です。" }, { status: 500 });
    }

    const correctGroupSize = Number(row.correctGroupSize);
    if (!Number.isFinite(correctGroupSize) || correctGroupSize <= 0) {
      console.error("[answer] 正解集団の人数が0以下です", { questionId });
      return NextResponse.json({ error: "問題データが不正です。" }, { status: 500 });
    }

    const correct: QuizAttributes = {
      ageBand: correctAgeBand,
      gender: correctGender,
      marriageStatus: correctMarriageStatus,
    };

    const sizeRows = await querySnowflake(Q4_ANSWER_GROUP_SIZE, {
      binds: [answer.ageBand, answer.gender, answer.marriageStatus],
      warehouse: WAREHOUSE,
    });
    const answerGroupSize = Number(sizeRows[0]?.answerGroupSize ?? 0);

    const { match, matchCount } = scoreAnswer(answer, correct);

    let aiOpponent: AnswerResponse["aiOpponent"] = undefined;
    try {
      const aiRows = (await querySnowflake(Q5_AI_ANSWER, {
        binds: [
          correct.ageBand,
          correct.gender,
          correct.marriageStatus,
          String(row.dataVersion ?? "v1"),
        ],
        warehouse: WAREHOUSE,
      })) as Array<{
        model: string;
        aiAgeBand: string;
        aiGender: string;
        aiMarriage: string;
        aiReason: string;
      }>;

      if (
        aiRows.length > 0 &&
        isAgeBand(aiRows[0].aiAgeBand) &&
        isGender(aiRows[0].aiGender) &&
        isMarriageStatus(aiRows[0].aiMarriage)
      ) {
        const ai = aiRows[0];
        const aiAgeBand = ai.aiAgeBand as AgeBand;
        const aiGender = ai.aiGender as Gender;
        const aiMarriage = ai.aiMarriage as MarriageStatus;
        const aiScore = scoreAnswer(
          { ageBand: aiAgeBand, gender: aiGender, marriageStatus: aiMarriage },
          correct,
        );
        aiOpponent = {
          model: ai.model,
          answer: { ageBand: aiAgeBand, gender: aiGender, marriageStatus: aiMarriage },
          matchCount: aiScore.matchCount,
          reasonHypothesis: ai.aiReason,
        };
      }
    } catch (err) {
      console.warn("[answer] Failed to load AI opponent:", err);
    }

    return NextResponse.json({
      questionId,
      correct,
      match,
      matchCount,
      answerGroupSize,
      correctGroupSize,
      categoryDetails: parseCategoryDetails(row.categoryDetails),
      aiOpponent,
    });
  } catch (error) {
    // SQLや接続情報をレスポンスに含めない（サーバーログにのみ残す）
    console.error("[answer] 採点に失敗しました", error);
    return NextResponse.json({ error: "採点に失敗しました。" }, { status: 500 });
  }
}
