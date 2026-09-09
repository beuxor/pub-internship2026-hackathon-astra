import { NextRequest, NextResponse } from "next/server";
import type { AnswerRequest, AnswerResponse } from "@/lib/quiz-types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<AnswerResponse | { error: string }>> {
  // TODO: #14 で実装 — 回答を検証し採点
  return NextResponse.json(
    { error: "Not implemented yet" },
    { status: 501 },
  );
}
