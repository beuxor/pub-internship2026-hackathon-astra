// 年代区分（FLOOR(AGE/10)*10 で算出。0代・70代以上は出題対象外）
export const AGE_BANDS = [
  "10代", "20代", "30代", "40代", "50代", "60代",
] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

// 性別（GENDER_NAMEカラム。"不明"は出題対象外）
export const GENDERS = ["男性", "女性"] as const;
export type Gender = (typeof GENDERS)[number];

// 婚姻状況（MARRIAGE_STATUSカラム。"不明", "死別", NULLは出題対象外）
export const MARRIAGE_STATUSES = ["既婚", "未婚"] as const;
export type MarriageStatus = (typeof MARRIAGE_STATUSES)[number];

// カテゴリランキング1件
export interface CategoryRanking {
  rank: number;
  categoryPath: string; // CATEGORY_LEVEL_1 || COALESCE(' > ' || CATEGORY_LEVEL_2, '')
}

// GET /api/question レスポンス
export interface QuestionResponse {
  questionId: string; // 不透明ID（正解属性を埋め込まない）
  rankingMethod: "buyer_count";
  period: { start: string; end: string }; // "2023-04-01" ~ "2024-03-31"
  categories: CategoryRanking[]; // TOP5
  answerOptions: {
    ageBands: readonly AgeBand[];
    genders: readonly Gender[];
    marriageStatuses: readonly MarriageStatus[];
  };
}

// POST /api/answer リクエスト
export interface AnswerRequest {
  questionId: string;
  answer: {
    ageBand: AgeBand;
    gender: Gender;
    marriageStatus: MarriageStatus;
  };
}

// POST /api/answer レスポンス
export interface AnswerResponse {
  questionId: string;
  correct: {
    ageBand: AgeBand;
    gender: Gender;
    marriageStatus: MarriageStatus;
  };
  match: {
    ageBand: boolean;
    gender: boolean;
    marriageStatus: boolean;
  };
  matchCount: number;        // 一致した属性の数（0〜3）
  answerGroupSize: number;   // 回答条件に一致する顧客数
  correctGroupSize: number;  // 正解条件に一致する顧客数
  categoryDetails: {
    rank: number;
    categoryPath: string;
    buyers: number;
  }[];
}
