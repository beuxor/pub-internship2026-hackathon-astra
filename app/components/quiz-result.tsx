"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { QuizAttributes } from "@/lib/quiz-score"
import type { AnswerResponse } from "@/lib/quiz-types"

/**
 * 母集団の説明に使う実数。
 * 2026-09-09 に app/sql/03_queries_for_api.sql 末尾のクエリで実測した値。
 * 問題バンクを作り直したら同じクエリで再確認してここを更新する。
 */
const TOTAL_CUSTOMERS = 70113
const COVERED_CUSTOMERS = 50118
const COVERED_PCT = 71.5

const formatCount = (value: number) => value.toLocaleString("ja-JP")

interface QuizResultProps {
  /** サーバーが採点した結果 */
  result: AnswerResponse
  /** プレイヤーが選んだ3属性（AnswerResponse には含まれないため別で受け取る） */
  answer: QuizAttributes
  /** 「次の問題」を押したときの処理 */
  onNext: () => void
}

export function QuizResult({ result, answer, onNext }: QuizResultProps) {
  const { correct, match, matchCount, answerGroupSize, correctGroupSize } = result

  const rows = [
    { label: "年代", answer: answer.ageBand, correct: correct.ageBand, hit: match.ageBand },
    { label: "性別", answer: answer.gender, correct: correct.gender, hit: match.gender },
    {
      label: "婚姻状況",
      answer: answer.marriageStatus,
      correct: correct.marriageStatus,
      hit: match.marriageStatus,
    },
  ]

  const isPerfect = matchCount === 3

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>結果</CardTitle>
            <Badge variant={isPerfect ? "default" : "secondary"}>
              3つの属性のうち {matchCount} つ正解
            </Badge>
          </div>
          <CardDescription>
            {isPerfect
              ? "3つすべて当たりました。"
              : "当たった属性と外した属性を見比べてみてください。"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>属性</TableHead>
                <TableHead>あなたの回答</TableHead>
                <TableHead>正解</TableHead>
                <TableHead className="text-right">判定</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell>{row.answer}</TableCell>
                  <TableCell>{row.correct}</TableCell>
                  <TableCell className="text-right">
                    <span
                      aria-label={row.hit ? "正解" : "不正解"}
                      className={row.hit ? "text-foreground" : "text-muted-foreground"}
                    >
                      {row.hit ? "◯" : "×"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Separator />

          {/* 人数は採点に使っていない。集団の大きさを実感するための情報 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">あなたが選んだ集団</p>
              <p className="text-2xl font-semibold">{formatCount(answerGroupSize)}人</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">正解の集団</p>
              <p className="text-2xl font-semibold">{formatCount(correctGroupSize)}人</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            人数は顧客データ上で、その年代・性別・婚姻状況にあてはまる人の数です。買った人の数ではありません。
            点数は3つの属性が合っていたかだけで決まり、人数は点数に影響しません。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>正解の集団が買っていたカテゴリ TOP5</CardTitle>
          <CardDescription>
            順位は「そのカテゴリを買った人が何人いたか」の多い順です。金額の合計ではありません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">順位</TableHead>
                <TableHead>カテゴリ</TableHead>
                <TableHead className="text-right">買った人数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.categoryDetails.map((category) => (
                <TableRow key={category.rank}>
                  <TableCell>{category.rank}</TableCell>
                  <TableCell>{category.categoryPath}</TableCell>
                  <TableCell className="text-right">
                    {formatCount(category.buyers)}人
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription className="flex flex-col gap-2 text-xs">
          <span>
            年齢・性別・婚姻状況がわかっていて、かつ{formatCount(500)}人以上いる集団から出題しています。
            全{formatCount(TOTAL_CUSTOMERS)}人のうち{formatCount(COVERED_CUSTOMERS)}人（
            {COVERED_PCT}%）が対象です。残りの約3割の人はどう答えても正解にはなりません。
          </span>
          <span>
            「正解」は元のデータに記録されていた集団のラベルです。買ったものからその人の年代や
            家族構成を言い当てられる、という意味ではありません。
          </span>
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={onNext}>次の問題へ</Button>
      </div>
    </div>
  )
}
