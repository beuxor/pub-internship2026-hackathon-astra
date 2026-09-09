import type { AgeBand, Gender, MarriageStatus } from "@/lib/quiz-types";

/** 3属性の組み合わせ。プレイヤーの回答と正解の両方に使う */
export interface QuizAttributes {
  ageBand: AgeBand;
  gender: Gender;
  marriageStatus: MarriageStatus;
}

/** 属性ごとの一致と、一致した属性の数（0〜3） */
export interface ScoreResult {
  match: {
    ageBand: boolean;
    gender: boolean;
    marriageStatus: boolean;
  };
  matchCount: number;
}

/**
 * プレイヤーの回答と正解を属性ごとに突き合わせる。
 *
 * 3属性はそれぞれ排他的な単一選択なので、採点は値の一致判定だけで決まる。
 * 集団の人数（answerGroupSize / correctGroupSize）は画面に出す情報であり、
 * 採点には使わない（app/sql/03_queries_for_api.sql の Q4 コメントと同じ方針）。
 */
export function scoreAnswer(
  answer: QuizAttributes,
  correct: QuizAttributes,
): ScoreResult {
  const match = {
    ageBand: answer.ageBand === correct.ageBand,
    gender: answer.gender === correct.gender,
    marriageStatus: answer.marriageStatus === correct.marriageStatus,
  };

  return {
    match,
    matchCount: Object.values(match).filter(Boolean).length,
  };
}
