"use client";

import { useState } from "react";
import type {
  QuestionResponse,
  AgeBand,
  Gender,
  MarriageStatus,
} from "@/lib/quiz-types";
import { AGE_BANDS, GENDERS, MARRIAGE_STATUSES } from "@/lib/quiz-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface QuizQuestionProps {
  question: QuestionResponse;
  onAnswer: (answer: { ageBand: AgeBand; gender: Gender; marriageStatus: MarriageStatus }) => void;
  isSubmitting: boolean;
}

export function QuizQuestion({ question, onAnswer, isSubmitting }: QuizQuestionProps) {
  const [ageBand, setAgeBand] = useState<AgeBand | "">("");
  const [gender, setGender] = useState<Gender | "">("");
  const [marriageStatus, setMarriageStatus] = useState<MarriageStatus | "">("");

  const canSubmit = ageBand !== "" && gender !== "" && marriageStatus !== "" && !isSubmitting;

  function handleSubmit() {
    if (ageBand === "" || gender === "" || marriageStatus === "") return;
    onAnswer({ ageBand, gender, marriageStatus });
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            購入者数ランキング TOP5
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            ある集団が多く買ったカテゴリです。何人が買ったかの順位であり、金額ではありません。
          </p>
          <p className="text-xs text-muted-foreground">
            集計期間: {question.period.start} 〜 {question.period.end}
          </p>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3">
            {question.categories.map((cat) => (
              <li key={cat.rank} className="flex items-center gap-3">
                <Badge variant="secondary" className="shrink-0 w-8 justify-center">
                  {cat.rank}
                </Badge>
                <span className="text-sm">{cat.categoryPath}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">この集団はどんな人たち？</CardTitle>
          <p className="text-sm text-muted-foreground">
            年代・性別・婚姻状況を予想してください
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">年代</label>
            <ToggleGroup
              type="single"
              value={ageBand}
              onValueChange={(v) => { if (v) setAgeBand(v as AgeBand); }}
            >
              {AGE_BANDS.map((band) => (
                <ToggleGroupItem key={band} value={band}>
                  {band}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">性別</label>
            <ToggleGroup
              type="single"
              value={gender}
              onValueChange={(v) => { if (v) setGender(v as Gender); }}
            >
              {GENDERS.map((g) => (
                <ToggleGroupItem key={g} value={g}>
                  {g}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">婚姻状況</label>
            <ToggleGroup
              type="single"
              value={marriageStatus}
              onValueChange={(v) => { if (v) setMarriageStatus(v as MarriageStatus); }}
            >
              {MARRIAGE_STATUSES.map((ms) => (
                <ToggleGroupItem key={ms} value={ms}>
                  {ms}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <Button
            size="lg"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="w-full"
          >
            {isSubmitting ? "送信中…" : "回答する"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
