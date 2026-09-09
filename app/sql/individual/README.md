# 個人モード：出題候補ビュー（Issue #22）

ユーザーごとの購入カテゴリと正解属性を参照するためのビュー。#23（問題バンク生成）の入力データ。

## ファイル

| ファイル | 用途 |
|---|---|
| `01_create_individual_candidates.sql` | ビュー `TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES` を作成 |
| `02_verify_individual_candidates.sql` | 検算SQL。期待値はコメントに記載 |

## ビューの列定義

| 列 | 型 | 内容 |
|---|---|---|
| `USER_ID_HASH` | VARCHAR | 顧客ID（ハッシュ済み） |
| `ANSWER_AGE_BAND` | VARCHAR | 正解の年代（10代〜60代） |
| `ANSWER_GENDER` | VARCHAR | 正解の性別（男性／女性） |
| `ANSWER_MARRIAGE` | VARCHAR | 正解の婚姻（既婚／未婚） |
| `CATEGORY_PATH` | VARCHAR | 購入カテゴリ（LEVEL_1 + LEVEL_2）。LEVEL_2がNULLならLEVEL_1のみ |
| `CATEGORY_COUNT` | INT | そのユーザーの異なる購入カテゴリ総数 |
| `PERIOD_START` | DATE | 購入期間の開始日（2023-04-01） |
| `PERIOD_END` | DATE | 購入期間の終了日（2024-03-31） |

## 候補条件

1. 年代が10代〜60代（`FLOOR(AGE/10)*10` が 10〜60）
2. 性別が男性 or 女性
3. 婚姻が既婚 or 未婚
4. 期間内（2023-04-01 以上、2024-04-01 未満）の購入カテゴリが重複なしで5件以上
5. 集団モードの「500人以上」条件は **適用しない**

NULL・不明・死別などの属性値は別の値に書き換えず、候補から除外するだけ。

## 欠損・重複の扱い

- **顧客ID重複**: INT_USERS_ENRICHED に重複なし（70,113行 = 70,113 distinct）
- **属性競合**: 1ユーザー1行のため競合は発生しない
- **除外の内訳**（理由が重複するユーザーあり、合計は全体を超える）:

| 除外理由 | 除外ユーザー数 |
|---|---:|
| 年齢NULL | 4,837 |
| 性別が男性/女性以外 | 6,324 |
| 婚姻が既婚/未婚以外 | 13,878 |
| ↓ 上記フィルタ通過後 | 52,599 |
| 年代が0代/70代以上 | 323 |
| ↓ 10代〜60代に限定後 | 52,276 |
| 購入データなし（期間内） | 802 |
| カテゴリ5件未満 | 27,099 |
| **最終候補ユーザー** | **24,375** |

## 実測値（2026-09-09）

| 項目 | 値 |
|---|---:|
| ビュー行数（ユーザー×カテゴリ） | 416,016 |
| 候補ユーザー数 | 24,375 |
| カテゴリ数の範囲 | 5〜151 |
| カテゴリ数の中央値 | 4（全体）/ 候補者のみ未計測 |
| 全24セグメントに候補あり | YES |
| ユーザー×カテゴリの重複 | 0件 |
| 正解が選択肢外のユーザー | 0件 |

### カテゴリ数の分布（候補ユーザーのみ）

| カテゴリ数 | ユーザー数 |
|---|---:|
| 5〜9 | 9,704 |
| 10〜19 | 7,642 |
| 20〜49 | 5,964 |
| 50以上 | 1,065 |

### セグメント別候補人数

| 年代 | 性別 | 婚姻 | 候補数 |
|---|---|---|---:|
| 10代 | 女性 | 既婚 | 3 |
| 10代 | 女性 | 未婚 | 152 |
| 10代 | 男性 | 既婚 | 1 |
| 10代 | 男性 | 未婚 | 65 |
| 20代 | 女性 | 既婚 | 1,089 |
| 20代 | 女性 | 未婚 | 2,627 |
| 20代 | 男性 | 既婚 | 364 |
| 20代 | 男性 | 未婚 | 1,364 |
| 30代 | 女性 | 既婚 | 4,769 |
| 30代 | 女性 | 未婚 | 2,132 |
| 30代 | 男性 | 既婚 | 2,079 |
| 30代 | 男性 | 未婚 | 1,216 |
| 40代 | 女性 | 既婚 | 2,455 |
| 40代 | 女性 | 未婚 | 814 |
| 40代 | 男性 | 既婚 | 1,662 |
| 40代 | 男性 | 未婚 | 696 |
| 50代 | 女性 | 既婚 | 784 |
| 50代 | 女性 | 未婚 | 282 |
| 50代 | 男性 | 既婚 | 875 |
| 50代 | 男性 | 未婚 | 357 |
| 60代 | 女性 | 既婚 | 163 |
| 60代 | 女性 | 未婚 | 57 |
| 60代 | 男性 | 既婚 | 286 |
| 60代 | 男性 | 未婚 | 83 |

偏りの注意: 10代既婚は極端に少ない（男性1名、女性3名）。#23で出題頻度を調整するか検討が必要。

## ビューであることの注意

このビューは元データ（INT_USERS_ENRICHED、DELIVERABLE_EC_MALL_PURCHASE）の変更をリアルタイムに反映する。固定済みスナップショットではない。問題バンクとして確定するのは #23 の責務。

## 再実行方法

```
-- Snowsight または CoCo で実行
-- 01_create_individual_candidates.sql を流す → CREATE OR REPLACE VIEW
-- 02_verify_individual_candidates.sql で検算
```

ウェアハウスは `TEAM_A_WH` を使用する。

## #23 担当が参照するSQL例

```sql
-- 特定ユーザーの全カテゴリを取得
SELECT CATEGORY_PATH, CATEGORY_COUNT
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
WHERE USER_ID_HASH = ?;

-- ランダムに候補ユーザーを1人選ぶ
SELECT DISTINCT USER_ID_HASH, ANSWER_AGE_BAND, ANSWER_GENDER, ANSWER_MARRIAGE, CATEGORY_COUNT
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
ORDER BY RANDOM()
LIMIT 1;

-- そのユーザーのカテゴリからランダムに5件抽出（#23で実装）
SELECT CATEGORY_PATH
FROM TEAM_A_DB.DEVELOPMENT.DAY5_QUIZ_INDIVIDUAL_CANDIDATES
WHERE USER_ID_HASH = ?
ORDER BY RANDOM()
LIMIT 5;
```
