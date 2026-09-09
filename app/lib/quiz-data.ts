import { randomUUID } from "node:crypto";
import { querySnowflakeLongRunning } from "@/lib/snowflake";
import type { AgeBand, Gender, MarriageStatus, CategoryRanking } from "@/lib/quiz-types";
import { AGE_BANDS, GENDERS, MARRIAGE_STATUSES } from "@/lib/quiz-types";

const PERIOD_START = "2023-04-01";
const PERIOD_END = "2024-03-31";
const WAREHOUSE = "TEAM_A_WH";

// サーバー内部の問題データ（正解を含む）
export interface InternalQuestion {
  questionId: string;
  correctAgeBand: AgeBand;
  correctGender: Gender;
  correctMarriageStatus: MarriageStatus;
  categories: (CategoryRanking & { buyers: number })[];
  period: { start: string; end: string };
  createdAt: number;
}

// 不透明ID → 問題データのマップ（プロセス内キャッシュ）
// NOTE: 各問題は独立したエントリ。「現在の問題」をグローバルに1つ保持するのではない。
const questionStore = new Map<string, InternalQuestion>();

// 古いエントリを掃除（1時間以上前のものを削除）
function pruneStore() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [id, q] of questionStore) {
    if (q.createdAt < cutoff) questionStore.delete(id);
  }
}

// 有効な属性の組み合わせからランダムに1つ選ぶ
function pickRandomAttributes(): {
  ageBand: AgeBand;
  gender: Gender;
  marriageStatus: MarriageStatus;
} {
  const ageBand = AGE_BANDS[Math.floor(Math.random() * AGE_BANDS.length)];
  const gender = GENDERS[Math.floor(Math.random() * GENDERS.length)];
  const marriageStatus = MARRIAGE_STATUSES[Math.floor(Math.random() * MARRIAGE_STATUSES.length)];
  return { ageBand, gender, marriageStatus };
}

// 年代文字列からSQLのWHERE条件用の10の位を取得
function ageBandToDecade(ageBand: AgeBand): number {
  return parseInt(ageBand, 10); // "10代" → 10, "20代" → 20, ...
}

// 指定属性の集団に対するカテゴリTOP5を購入者数で取得
async function fetchTop5Categories(
  ageBand: AgeBand,
  gender: Gender,
  marriageStatus: MarriageStatus,
): Promise<(CategoryRanking & { buyers: number })[]> {
  const decade = ageBandToDecade(ageBand);

  const sql = `
    WITH target AS (
      SELECT USER_ID_HASH
      FROM TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED
      WHERE FLOOR(AGE / 10) * 10 = ?
        AND GENDER_NAME = ?
        AND MARRIAGE_STATUS = ?
    ),
    purchases AS (
      SELECT
        d.CATEGORY_LEVEL_1 || COALESCE(' > ' || d.CATEGORY_LEVEL_2, '') AS category_path,
        d.USER_ID_HASH
      FROM TEAM_A_DB.DEVELOPMENT.MART_RAKUTEN_EC_DAIFUKUCHO d
      INNER JOIN target t ON d.USER_ID_HASH = t.USER_ID_HASH
      WHERE d.PURCHASED_AT >= ?
        AND d.PURCHASED_AT < '2024-04-01'
        AND d.CATEGORY_LEVEL_1 IS NOT NULL
    )
    SELECT category_path, COUNT(DISTINCT USER_ID_HASH) AS buyer_count
    FROM purchases
    GROUP BY category_path
    ORDER BY buyer_count DESC, category_path ASC
    LIMIT 5
  `;

  const rows = await querySnowflakeLongRunning(sql, {
    binds: [decade, gender, marriageStatus, PERIOD_START],
    warehouse: WAREHOUSE,
  }) as { CATEGORY_PATH: string; BUYER_COUNT: number }[];

  return rows.map((row, i) => ({
    rank: i + 1,
    categoryPath: row.CATEGORY_PATH,
    buyers: row.BUYER_COUNT,
  }));
}

// 新しい問題を生成して返す
export async function generateQuestion(): Promise<InternalQuestion> {
  pruneStore();

  const attrs = pickRandomAttributes();
  const categories = await fetchTop5Categories(
    attrs.ageBand,
    attrs.gender,
    attrs.marriageStatus,
  );

  if (categories.length === 0) {
    throw new Error("該当する購買データがありません");
  }

  const questionId = randomUUID();
  const question: InternalQuestion = {
    questionId,
    correctAgeBand: attrs.ageBand,
    correctGender: attrs.gender,
    correctMarriageStatus: attrs.marriageStatus,
    categories,
    period: { start: PERIOD_START, end: PERIOD_END },
    createdAt: Date.now(),
  };

  questionStore.set(questionId, question);
  return question;
}

// questionIdから問題を取得（採点APIで使用）
export function getQuestion(questionId: string): InternalQuestion | undefined {
  return questionStore.get(questionId);
}
