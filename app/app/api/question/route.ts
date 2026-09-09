import { NextResponse } from "next/server";
import type { QuestionResponse } from "@/lib/quiz-types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<QuestionResponse | { error: string }>> {
  // TODO: #11 で実装 — Snowflakeから問題データを取得
  return NextResponse.json(
    { error: "Not implemented yet" },
    { status: 501 },
  );
}
