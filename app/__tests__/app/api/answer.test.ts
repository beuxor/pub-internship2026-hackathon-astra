import { describe, it, expect, vi, beforeEach } from "vitest";

// route が使う Snowflake ヘルパーはモックする（このテストはDBに接続しない）
const querySnowflake = vi.fn();
vi.mock("@/lib/snowflake", () => ({
  querySnowflake: (...args: unknown[]) => querySnowflake(...args),
}));

const { POST } = await import("@/app/api/answer/route");

const QUESTION_ID = "96e668b1-de30-4ec4-8019-088ba6734398";

/** Q3（正解取得）が返す1行 */
const correctRow = {
  questionId: QUESTION_ID,
  correctAgeBand: "20代",
  correctGender: "女性",
  correctMarriageStatus: "未婚",
  correctGroupSize: 7450,
  categoryDetails: [
    { rank: 2, categoryPath: "美容・コスメ・香水 > スキンケア", buyers: 1171 },
    { rank: 1, categoryPath: "インナー・下着・ナイトウェア > レディース", buyers: 1312 },
  ],
};

/** POST ハンドラは request.json() だけを使うので最小のダブルで足りる */
function requestWith(body: unknown) {
  return { json: async () => body } as unknown as Request;
}

function malformedRequest() {
  return {
    json: async () => {
      throw new Error("invalid json");
    },
  } as unknown as Request;
}

const validBody = {
  questionId: QUESTION_ID,
  answer: { ageBand: "20代", gender: "女性", marriageStatus: "未婚" },
};

describe("POST /api/answer", () => {
  beforeEach(() => {
    querySnowflake.mockReset();
  });

  it("完全正解なら matchCount=3 と両集団の人数を返す", async () => {
    querySnowflake
      .mockResolvedValueOnce([correctRow]) // Q3
      .mockResolvedValueOnce([{ answerGroupSize: 7450 }]); // Q4

    const response = await POST(requestWith(validBody));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.matchCount).toBe(3);
    expect(json.correct).toEqual({
      ageBand: "20代",
      gender: "女性",
      marriageStatus: "未婚",
    });
    expect(json.answerGroupSize).toBe(7450);
    expect(json.correctGroupSize).toBe(7450);
  });

  it("一部だけ当たると matchCount と match が対応する", async () => {
    querySnowflake
      .mockResolvedValueOnce([correctRow])
      .mockResolvedValueOnce([{ answerGroupSize: 4021 }]);

    const response = await POST(
      requestWith({
        questionId: QUESTION_ID,
        answer: { ageBand: "30代", gender: "女性", marriageStatus: "未婚" },
      }),
    );
    const json = await response.json();

    expect(json.matchCount).toBe(2);
    expect(json.match).toEqual({ ageBand: false, gender: true, marriageStatus: true });
    expect(json.answerGroupSize).toBe(4021);
  });

  it("TOP5 を rank の昇順に並べて返す", async () => {
    querySnowflake
      .mockResolvedValueOnce([correctRow])
      .mockResolvedValueOnce([{ answerGroupSize: 7450 }]);

    const json = await (await POST(requestWith(validBody))).json();

    expect(json.categoryDetails.map((c: { rank: number }) => c.rank)).toEqual([1, 2]);
  });

  it("TOP5 が JSON 文字列で返っても解釈できる", async () => {
    querySnowflake
      .mockResolvedValueOnce([
        { ...correctRow, categoryDetails: JSON.stringify(correctRow.categoryDetails) },
      ])
      .mockResolvedValueOnce([{ answerGroupSize: 7450 }]);

    const json = await (await POST(requestWith(validBody))).json();

    expect(json.categoryDetails).toHaveLength(2);
    expect(json.categoryDetails[0].categoryPath).toBe(
      "インナー・下着・ナイトウェア > レディース",
    );
  });

  it("questionId と回答値を bind で渡す（SQLへ連結しない）", async () => {
    querySnowflake
      .mockResolvedValueOnce([correctRow])
      .mockResolvedValueOnce([{ answerGroupSize: 7450 }]);

    await POST(requestWith(validBody));

    const [q3Sql, q3Options] = querySnowflake.mock.calls[0];
    expect(q3Options.binds).toEqual([QUESTION_ID]);
    expect(q3Sql).not.toContain(QUESTION_ID);

    const [, q4Options] = querySnowflake.mock.calls[1];
    expect(q4Options.binds).toEqual(["20代", "女性", "未婚"]);
  });

  it("存在しない questionId は 404（架空データで埋めない）", async () => {
    querySnowflake.mockResolvedValueOnce([]); // Q3 が0行

    const response = await POST(
      requestWith({ ...validBody, questionId: "00000000-0000-0000-0000-000000000000" }),
    );

    expect(response.status).toBe(404);
    expect(querySnowflake).toHaveBeenCalledTimes(1); // Q4 まで進まない
  });

  it.each([
    ["年代が選択肢外", { ageBand: "90代", gender: "女性", marriageStatus: "未婚" }],
    ["性別が選択肢外", { ageBand: "20代", gender: "不明", marriageStatus: "未婚" }],
    ["婚姻が選択肢外", { ageBand: "20代", gender: "女性", marriageStatus: "死別" }],
    ["年代が null", { ageBand: null, gender: "女性", marriageStatus: "未婚" }],
    ["属性が欠落", { gender: "女性", marriageStatus: "未婚" }],
  ])("%s なら 400 を返しDBを呼ばない", async (_label, answer) => {
    const response = await POST(requestWith({ questionId: QUESTION_ID, answer }));

    expect(response.status).toBe(400);
    expect(querySnowflake).not.toHaveBeenCalled();
  });

  it.each([
    ["questionId 欠落", { answer: validBody.answer }],
    ["questionId が空文字", { questionId: "", answer: validBody.answer }],
    ["questionId が長すぎる", { questionId: "x".repeat(65), answer: validBody.answer }],
    ["answer 欠落", { questionId: QUESTION_ID }],
    ["ボディが配列", []],
    ["ボディが null", null],
  ])("%s なら 400 を返しDBを呼ばない", async (_label, body) => {
    const response = await POST(requestWith(body));

    expect(response.status).toBe(400);
    expect(querySnowflake).not.toHaveBeenCalled();
  });

  it("JSON として解釈できないボディは 400", async () => {
    const response = await POST(malformedRequest());

    expect(response.status).toBe(400);
    expect(querySnowflake).not.toHaveBeenCalled();
  });

  it("問題バンクの正解が選択肢と揃っていなければ 500", async () => {
    querySnowflake.mockResolvedValueOnce([{ ...correctRow, correctMarriageStatus: "死別" }]);

    const response = await POST(requestWith(validBody));

    expect(response.status).toBe(500);
  });

  it("正解集団が0人なら不正な問題として 500", async () => {
    querySnowflake.mockResolvedValueOnce([{ ...correctRow, correctGroupSize: 0 }]);

    const response = await POST(requestWith(validBody));

    expect(response.status).toBe(500);
  });

  it("DBエラー時もSQLや接続情報をレスポンスに含めない", async () => {
    querySnowflake.mockRejectedValueOnce(
      new Error("SQL compilation error: DAY5_QUIZ_QUESTIONS does not exist"),
    );

    const response = await POST(requestWith(validBody));
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe("採点に失敗しました。");
    expect(JSON.stringify(json)).not.toMatch(/SELECT|DAY5_QUIZ_QUESTIONS|TEAM_A/);
  });
});
