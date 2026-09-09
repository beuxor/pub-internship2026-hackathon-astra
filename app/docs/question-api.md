# 出題API（#11）

`GET /api/question` は問題バンクの有効な1問を返します。問題IDと期間はDBに保存された値です。正解属性・購入者数は出題レスポンスに含めません。

- 新規出題: `/api/question`
- 同じ問題の再取得: `/api/question?questionId=<UUID>`
- 出題済みを除外: `excludedQuestionIds` にUUIDのJSON配列をURLエンコードして渡す（最大100件）。例: `new URLSearchParams({ excludedQuestionIds: JSON.stringify(ids) })`

`questionId` と `excludedQuestionIds` は同時指定できません。不正UUID、重複パラメータ、未知のパラメータは400です。全候補を除外した場合や、指定IDが存在しない・無効の場合は404です。除外なしで再取得しても重複を避ける保証はありません。

成功レスポンスは既存の `QuestionResponse`。失敗レスポンスは `{ code, error }` で、`error` は表示用の日本語です。

| status | code | 意味 |
| --- | --- | --- |
| 400 | invalid_request | 入力形式が不正 |
| 404 | no_question | 対象となる問題なし |
| 503 | db_unavailable | 接続設定なし、または判別できた接続・認証失敗 |
| 500 | query_failed | クエリ失敗、想定外エラー、不正な問題データ |

すべてのレスポンスに `Cache-Control: no-store` を付けます。フロントは開始・次の問題で新規取得し、タブ復帰などで必要な再取得には保持した `questionId` を指定してください。

採点APIは同じ `questionId` で `DAY5_QUIZ_QUESTIONS` を検索します（#6のQ3）。プロセス内Mapに依存しません。プレイ中に問題バンクを再作成しないでください。
