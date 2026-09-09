import { describe, it, expect } from "vitest";

import { scoreAnswer, type QuizAttributes } from "../../lib/quiz-score";

// 基準となる正解。各テストはここから1属性ずつ崩して期待値を確認する。
const CORRECT: QuizAttributes = {
  ageBand: "30代",
  gender: "女性",
  marriageStatus: "既婚",
};

describe("scoreAnswer", () => {
  it("完全一致なら matchCount=3 で全属性 true", () => {
    const result = scoreAnswer({ ...CORRECT }, CORRECT);

    expect(result.matchCount).toBe(3);
    expect(result.match).toEqual({
      ageBand: true,
      gender: true,
      marriageStatus: true,
    });
  });

  it("3属性すべて違うなら matchCount=0 で全属性 false", () => {
    const result = scoreAnswer(
      { ageBand: "60代", gender: "男性", marriageStatus: "未婚" },
      CORRECT,
    );

    expect(result.matchCount).toBe(0);
    expect(result.match).toEqual({
      ageBand: false,
      gender: false,
      marriageStatus: false,
    });
  });

  it("年代だけ外すと matchCount=2 で ageBand のみ false", () => {
    const result = scoreAnswer({ ...CORRECT, ageBand: "40代" }, CORRECT);

    expect(result.matchCount).toBe(2);
    expect(result.match).toEqual({
      ageBand: false,
      gender: true,
      marriageStatus: true,
    });
  });

  it("性別だけ外すと matchCount=2 で gender のみ false", () => {
    const result = scoreAnswer({ ...CORRECT, gender: "男性" }, CORRECT);

    expect(result.matchCount).toBe(2);
    expect(result.match).toEqual({
      ageBand: true,
      gender: false,
      marriageStatus: true,
    });
  });

  it("婚姻状況だけ外すと matchCount=2 で marriageStatus のみ false", () => {
    const result = scoreAnswer({ ...CORRECT, marriageStatus: "未婚" }, CORRECT);

    expect(result.matchCount).toBe(2);
    expect(result.match).toEqual({
      ageBand: true,
      gender: true,
      marriageStatus: false,
    });
  });

  it("1属性だけ当たると matchCount=1", () => {
    const result = scoreAnswer(
      { ageBand: "30代", gender: "男性", marriageStatus: "未婚" },
      CORRECT,
    );

    expect(result.matchCount).toBe(1);
    expect(result.match).toEqual({
      ageBand: true,
      gender: false,
      marriageStatus: false,
    });
  });

  it("引数の順序を入れ替えても結果は同じ（一致判定は対称）", () => {
    const answer: QuizAttributes = {
      ageBand: "20代",
      gender: "女性",
      marriageStatus: "既婚",
    };

    expect(scoreAnswer(answer, CORRECT)).toEqual(scoreAnswer(CORRECT, answer));
  });

  it("引数を変更しない（純粋関数）", () => {
    const answer: QuizAttributes = {
      ageBand: "50代",
      gender: "男性",
      marriageStatus: "未婚",
    };
    const answerSnapshot = { ...answer };
    const correctSnapshot = { ...CORRECT };

    scoreAnswer(answer, CORRECT);

    expect(answer).toEqual(answerSnapshot);
    expect(CORRECT).toEqual(correctSnapshot);
  });
});
