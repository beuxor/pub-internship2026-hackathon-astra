// 年代区分（AGE_CATEGORYカラムの実データ値）
export const AGE_BANDS = [
  "20歳未満", "20代", "30代", "40代", "50代", "60代", "70代", "80歳以上",
] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

// 性別（GENDER_NAMEカラムの実データ値）
export const GENDERS = ["男性", "女性"] as const;
export type Gender = (typeof GENDERS)[number];
// NOTE: "不明" exists in data but is excluded from player choices

// 婚姻状況（MARRIAGE_STATUSカラム — 初期選択肢は既婚/未婚のみ）
export const MARRIAGE_STATUSES = ["既婚", "未婚"] as const;
export type MarriageStatus = (typeof MARRIAGE_STATUSES)[number];
// NOTE: "不明", "死別", NULL exist in data but excluded from initial choices

// カテゴリランキング1件
export interface CategoryRanking {
  rank: number;
  categoryPath: string; // CATEGORY_LEVEL_1 + " > " + CATEGORY_LEVEL_2
}

// GET /api/question レスポンス
export interface QuestionResponse {
  questionId: string; // 不透明ID（正解属性を埋め込まない）
  rankingMethod: "sales_total";
  period: { start: string; end: string }; // "2023-04-01" ~ "2024-03-31"
  categories: CategoryRanking[]; // TOP5
  answerOptions: {
    ageBands: readonly string[];
    genders: readonly string[];
    marriageStatuses: readonly string[];
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
  score: {
    answerCount: number;      // |A| 回答条件に一致する顧客数
    correctCount: number;     // |B| 正解条件に一致する顧客数
    intersectionCount: number; // |A ∩ B|
    unionCount: number;       // |A ∪ B| = |A| + |B| - |A ∩ B|
    similarity: number;       // Jaccard係数 = |A ∩ B| / |A ∪ B|
  };
  categoryDetails: {
    rank: number;
    categoryPath: string;
    totalSales: number;
  }[];
}
