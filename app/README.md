# 購買層クイズ — Team Astra

カテゴリ購入者数TOP5から購買集団の属性（年代・性別・婚姻状況）を当てるクイズアプリ。

## セットアップ

```bash
cd app
npm install
```

## 開発

```bash
npm run dev
```

http://localhost:3000 で起動。Snowflake接続は `~/.snowflake/config.toml` の設定を自動検出する。  
特定の接続名を使う場合:

```bash
SNOWFLAKE_CONNECTION_NAME=dev npm run dev
```

## ビルド・テスト

```bash
npm run build       # 本番ビルド
npm run typecheck   # 型チェック（tsc --noEmit）
npm test            # 型チェック + Vitest
```

## Snowflake CLI（uv経由）

リポジトリルートの uv 環境を使用:

```bash
cd ..  # リポジトリルートへ
uv run --locked snow app setup --help
uv run --locked snow app deploy
```

**注意**: `snow app` コマンドは必ず `app/` ディレクトリから実行すること。リポジトリルートから実行すると `.env` 等が配布対象に含まれる。

## API

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/health` | Snowflake接続確認 |
| GET | `/api/question` | 出題（カテゴリTOP5 + 回答選択肢） |
| POST | `/api/answer` | 回答送信・採点 |

## データソース

- `TEAM_A_DB.DEVELOPMENT.INT_USERS_ENRICHED` — 顧客属性
- `TEAM_A_DB.DEVELOPMENT.MART_RAKUTEN_EC_DAIFUKUCHO` — 購買明細
- ウェアハウス: `TEAM_A_WH`

## デプロイ

`app.yml` にビルド設定あり。デプロイ用の `snowflake.yml` またはv2マニフェストは #12 で生成する。
