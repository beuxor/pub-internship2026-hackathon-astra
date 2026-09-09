"use client";

import type { AnswerResponse, AgeBand, Gender, MarriageStatus } from "@/lib/quiz-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface QuizResultProps {
  result: AnswerResponse;
  userAnswer: { ageBand: AgeBand; gender: Gender; marriageStatus: MarriageStatus };
  onNext: () => void;
}

function MatchBadge({ matched }: { matched: boolean }) {
  return matched
    ? <Badge className="bg-green-600 text-white">○</Badge>
    : <Badge variant="secondary">×</Badge>;
}

export function QuizResult({ result, userAnswer, onNext }: QuizResultProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {result.matchCount === 3
              ? "全問正解！"
              : `${result.matchCount} / 3 一致`}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 gap-y-2 text-sm items-center">
            <span className="font-medium text-muted-foreground" />
            <span className="font-medium text-muted-foreground">あなたの回答</span>
            <span className="font-medium text-muted-foreground">正解</span>
            <span className="font-medium text-muted-foreground">結果</span>

            <span className="font-medium">年代</span>
            <span>{userAnswer.ageBand}</span>
            <span>{result.correct.ageBand}</span>
            <MatchBadge matched={result.match.ageBand} />

            <span className="font-medium">性別</span>
            <span>{userAnswer.gender}</span>
            <span>{result.correct.gender}</span>
            <MatchBadge matched={result.match.gender} />

            <span className="font-medium">婚姻</span>
            <span>{userAnswer.marriageStatus}</span>
            <span>{result.correct.marriageStatus}</span>
            <MatchBadge matched={result.match.marriageStatus} />
          </div>
        </CardContent>
      </Card>

      {result.aiOpponent && (
        <Card className="border-indigo-500/30 bg-indigo-50/10">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🤖 Cortex AI との対戦</span>
                <Badge variant="outline" className="text-xs font-normal">
                  {result.aiOpponent.model}
                </Badge>
              </CardTitle>
              <span className="text-sm font-semibold">
                {result.matchCount > result.aiOpponent.matchCount && (
                  <span className="text-emerald-500">あなたの勝ち！ 🎉</span>
                )}
                {result.matchCount === result.aiOpponent.matchCount && (
                  <span className="text-muted-foreground">引き分け 🤝</span>
                )}
                {result.matchCount < result.aiOpponent.matchCount && (
                  <span className="text-amber-500">AIの勝ち 🤖</span>
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              ※AI回答は同一のカテゴリTOP5ヒントから事前生成されています
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
              <span>あなた: <strong>{result.matchCount}</strong> / 3 一致</span>
              <span>AI: <strong>{result.aiOpponent.matchCount}</strong> / 3 一致 ({result.aiOpponent.answer.ageBand}・{result.aiOpponent.answer.gender}・{result.aiOpponent.answer.marriageStatus})</span>
            </div>
            <div className="text-xs p-3 rounded-md bg-muted/30 border border-border/50">
              <div className="font-semibold text-muted-foreground mb-1">AIの推論理由（仮説）:</div>
              <p className="italic leading-relaxed">{result.aiOpponent.reasonHypothesis}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">集団の人数</CardTitle>
          <p className="text-xs text-muted-foreground">
            年齢判明・男性/女性・既婚/未婚の顧客が対象（全70,113人中49,339人 = 70.4%）
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span>正解の集団</span>
            <span className="font-medium">{result.correctGroupSize.toLocaleString()} 人</span>
          </div>
          <div className="flex justify-between">
            <span>あなたが選んだ集団</span>
            <span className="font-medium">{result.answerGroupSize.toLocaleString()} 人</span>
          </div>
        </CardContent>
      </Card>

      {result.categoryDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">カテゴリ別 購入者数（正解集団）</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2">
              {result.categoryDetails.map((cat) => (
                <li key={cat.rank} className="flex items-center gap-3 text-sm">
                  <Badge variant="secondary" className="shrink-0 w-8 justify-center">
                    {cat.rank}
                  </Badge>
                  <span className="flex-1">{cat.categoryPath}</span>
                  <span className="text-muted-foreground">{cat.buyers.toLocaleString()} 人</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Button size="lg" onClick={onNext} className="w-full">
        次の問題へ
      </Button>
    </div>
  );
}
