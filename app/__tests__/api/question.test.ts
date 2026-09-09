import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/snowflake", () => ({ querySnowflake: vi.fn() }));
import { querySnowflake } from "@/lib/snowflake";
import { GET } from "@/app/api/question/route";
const query = vi.mocked(querySnowflake);
const id = "12345678-1234-1234-1234-123456789abc";
const row = () => ({ questionId: id, rankingMethod: "buyer_count", periodStart: "2023-04-01", periodEnd: "2024-03-31", ANSWER_GENDER: "秘密", categories: [5, 3, 1, 4, 2].map(rank => ({ rank, categoryPath: `カテゴリ${rank}`, buyers: 123, correct: "秘密" })) });
const get = (params = "") => GET(new Request(`http://localhost/api/question${params}`));
beforeEach(() => { vi.clearAllMocks(); query.mockResolvedValue([row()]); });
describe("出題API", () => {
  it("バンクのID・順位を返し、公開DTO以外を落とす", async () => {
    const response = await get();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.questionId).toBe(id);
    expect(body.categories).toEqual([1,2,3,4,5].map(rank => ({ rank, categoryPath: `カテゴリ${rank}` })));
    expect(JSON.stringify(body)).not.toMatch(/buyers|秘密|ANSWER_GENDER/);
    expect(body.answerOptions.ageBands).toHaveLength(6);
    expect(query.mock.calls[0][0]).toContain("DAY5_QUIZ_QUESTIONS");
    expect(query.mock.calls[0][1]?.binds).toEqual(["[]"]);
  });
  it("JSON文字列のTOP5も順位順の公開DTOへ変換する", async () => {
    query.mockResolvedValue([{ ...row(), categories: JSON.stringify(row().categories) }]);
    const response = await get();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.categories).toEqual([1,2,3,4,5].map(rank => ({ rank, categoryPath: `カテゴリ${rank}` })));
    expect(JSON.stringify(body)).not.toMatch(/buyers|秘密/);
  });
  it.each(["broken JSON", "null", "{}", "[]", '[{"rank":1,"categoryPath":"不足"}]'])("不正なJSONカテゴリを公開しない: %s", async categories => {
    query.mockResolvedValue([{ ...row(), categories }]);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await get();
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ code: "query_failed", error: "問題の取得に失敗しました" });
    } finally {
      log.mockRestore();
    }
  });
  it("同じIDの再取得はDB検索し、IDをSQLへ埋め込まない", async () => {
    expect((await (await get(`?questionId=${id}`)).json()).questionId).toBe(id);
    expect((await (await get(`?questionId=${id}`)).json()).questionId).toBe(id);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("QUESTION_ID = ?");
    expect(query.mock.calls[0][0]).not.toContain(id);
    expect(query.mock.calls[0][1]?.binds).toEqual([id]);
  });
  it("除外IDをJSON文字列でbindする", async () => {
    await get(`?excludedQuestionIds=${encodeURIComponent(JSON.stringify([id]))}`);
    expect(query.mock.calls[0][1]?.binds).toEqual([JSON.stringify([id])]);
  });
  it.each(["?questionId=' OR 1=1--", "?questionId=", "?excludedQuestionIds=null", "?excludedQuestionIds={}", "?excludedQuestionIds=[1]", "?excludedQuestionIds=no", `?questionId=${id}&excludedQuestionIds=[]`, `?questionId=${id}&questionId=${id}`, "?unknown=1"])("不正入力 %s はDB実行前に拒否する", async params => {
    const response = await get(params);
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("invalid_request");
    expect(query).not.toHaveBeenCalled();
  });
  it("空データを404として区別する", async () => {
    query.mockResolvedValue([]);
    const response = await get();
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("no_question");
  });
  it.each([[], row().categories.slice(1), Array(5).fill({rank: 1, categoryPath: "重複"})])("不完全なTOP5を返さない", async categories => {
    query.mockResolvedValue([{ ...row(), categories }]);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await get()).status).toBe(500);
    log.mockRestore();
  });
  it.each([["No Snowflake credentials found. secret configuration", 503, "db_unavailable"], ["SQL compilation error: TEAM_A_DB.SECRET", 500, "query_failed"]])("内部エラーを公開しない: %s", async (message, status, code) => {
    query.mockRejectedValue(new Error(message as string));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await get();
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain(message);
    expect(response.headers.get("cache-control")).toBe("no-store");
    log.mockRestore();
  });
});
