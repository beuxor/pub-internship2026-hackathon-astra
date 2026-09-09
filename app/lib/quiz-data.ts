import "server-only";
import { querySnowflake } from "@/lib/snowflake";
import { AGE_BANDS, GENDERS, MARRIAGE_STATUSES, type QuestionResponse } from "@/lib/quiz-types";

export class QuestionError extends Error {
  constructor(public code: "invalid_request" | "no_question" | "query_failed") {
    super(code);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// questionId は再取得用。excludedQuestionIds は JSON 配列で、新規出題時のみ指定する。
export function parseQuestionParams(params: URLSearchParams) {
  for (const key of params.keys()) {
    if (!["questionId", "excludedQuestionIds"].includes(key) || params.getAll(key).length !== 1) {
      throw new QuestionError("invalid_request");
    }
  }
  const questionId = params.get("questionId");
  let excludedQuestionIds: unknown = [];
  try {
    excludedQuestionIds = JSON.parse(params.get("excludedQuestionIds") ?? "[]");
  } catch {
    throw new QuestionError("invalid_request");
  }
  if ((questionId !== null && (!UUID.test(questionId) || params.has("excludedQuestionIds"))) ||
      !Array.isArray(excludedQuestionIds) || excludedQuestionIds.length > 100 ||
      !excludedQuestionIds.every((id: unknown) => typeof id === "string" && UUID.test(id))) {
    throw new QuestionError("invalid_request");
  }
  return { questionId, excludedQuestionIds: excludedQuestionIds as string[] };
}

// #6 の Q1b / Q2。正解属性・購入者数は SELECT 段階から除外する。
const PUBLIC_QUESTION_SQL = `
SELECT QUESTION_ID AS "questionId", RANKING_METHOD AS "rankingMethod",
       PERIOD_START::VARCHAR AS "periodStart", PERIOD_END::VARCHAR AS "periodEnd",
       TRANSFORM(TOP5, o OBJECT -> OBJECT_CONSTRUCT(
         'rank', o:rank, 'categoryPath', o:categoryPath)) AS "categories"
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_QUESTIONS
WHERE IS_ACTIVE`;

export async function generateQuestion(params: URLSearchParams = new URLSearchParams()): Promise<QuestionResponse> {
  const { questionId, excludedQuestionIds } = parseQuestionParams(params);
  const rows = await querySnowflake(
    PUBLIC_QUESTION_SQL + (questionId !== null
      ? " AND QUESTION_ID = ?"
      : " AND NOT ARRAY_CONTAINS(QUESTION_ID::VARIANT, TO_ARRAY(PARSE_JSON(?))) ORDER BY RANDOM() LIMIT 1"),
    { binds: [questionId ?? JSON.stringify(excludedQuestionIds)], warehouse: "TEAM_A_WH" },
  );
  const row = rows[0];
  if (!row) throw new QuestionError("no_question");
  let rawCategories: unknown = row.categories;
  if (typeof rawCategories === "string") {
    try {
      rawCategories = JSON.parse(rawCategories);
    } catch {
      throw new QuestionError("query_failed");
    }
  }
  if (typeof row.questionId !== "string" || !UUID.test(row.questionId) ||
      row.rankingMethod !== "buyer_count" || typeof row.periodStart !== "string" ||
      typeof row.periodEnd !== "string" || !Array.isArray(rawCategories) || rawCategories.length !== 5) {
    throw new QuestionError("query_failed");
  }
  const categories = rawCategories.map((item: unknown) => {
    if (!item || typeof item !== "object" || !("rank" in item) || !("categoryPath" in item) ||
        typeof item.rank !== "number" || typeof item.categoryPath !== "string" || !item.categoryPath.trim()) {
      throw new QuestionError("query_failed");
    }
    return { rank: item.rank, categoryPath: item.categoryPath };
  }).sort((a, b) => a.rank - b.rank);
  if (categories.some((item, index) => item.rank !== index + 1)) throw new QuestionError("query_failed");
  return {
    questionId: row.questionId, rankingMethod: "buyer_count",
    period: { start: row.periodStart, end: row.periodEnd }, categories,
    answerOptions: { ageBands: AGE_BANDS, genders: GENDERS, marriageStatuses: MARRIAGE_STATUSES },
  };
}
