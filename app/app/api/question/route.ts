import { NextResponse } from "next/server";
import { generateQuestion, QuestionError } from "@/lib/quiz-data";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const errors = {
  invalid_request: { status: 400, error: "出題条件の形式が不正です" },
  no_question: { status: 404, error: "取得できる問題がありません" },
  db_unavailable: { status: 503, error: "データベースに接続できません" },
  query_failed: { status: 500, error: "問題の取得に失敗しました" },
} as const;

export async function GET(request: Request) {
  try {
    const question = await generateQuestion(new URL(request.url).searchParams);
    return NextResponse.json(question, { headers });
  } catch (e) {
    // 公式ヘルパーの未設定エラーと SDK の接続・認証エラーだけを接続失敗に分類する。
    const message = e instanceof Error ? e.message : "";
    const connectionFailure = /No Snowflake credentials found|Unable to connect|Failed to connect|Could not connect|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Incorrect username or password|authentication token.*expired/i.test(message);
    const code = e instanceof QuestionError ? e.code : connectionFailure ? "db_unavailable" : "query_failed";
    if (code === "query_failed" || code === "db_unavailable") console.error("[question]", e);
    const { status, error } = errors[code];
    return NextResponse.json({ code, error }, { status, headers });
  }
}
