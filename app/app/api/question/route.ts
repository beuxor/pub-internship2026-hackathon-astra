import { NextResponse } from "next/server";
import type { QuestionResponse } from "@/lib/quiz-types";
import { AGE_BANDS, GENDERS, MARRIAGE_STATUSES } from "@/lib/quiz-types";
import { generateQuestion } from "@/lib/quiz-data";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<QuestionResponse | { error: string }>> {
  try {
    const q = await generateQuestion();

    const response: QuestionResponse = {
      questionId: q.questionId,
      rankingMethod: "sales_total",
      period: q.period,
      categories: q.categories.map(({ rank, categoryPath }) => ({
        rank,
        categoryPath,
      })),
      answerOptions: {
        ageBands: AGE_BANDS,
        genders: GENDERS,
        marriageStatuses: MARRIAGE_STATUSES,
      },
    };

    return NextResponse.json(response);
  } catch (e) {
    console.error(new Date().toISOString(), "[question]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "問題の取得に失敗しました" },
      { status: 500 },
    );
  }
}
