"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { QuizMode } from "@/lib/quiz-types";

interface QuizStartProps {
  onStart: (mode: QuizMode) => void;
}

export function QuizStart({ onStart }: QuizStartProps) {
  const [selectedMode, setSelectedMode] = useState<QuizMode>("group");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12">
      <h1 className="text-5xl font-bold tracking-tight">始まるよ</h1>
      <div className="flex flex-col items-center gap-6">
        <ToggleGroup
          type="single"
          value={selectedMode}
          onValueChange={(v) => { if (v) setSelectedMode(v as QuizMode); }}
        >
          <ToggleGroupItem value="group" size="lg">
            集団モード
          </ToggleGroupItem>
          <ToggleGroupItem value="individual" size="lg">
            購買カテゴリモード
          </ToggleGroupItem>
        </ToggleGroup>
        <p className="text-sm text-muted-foreground">
          {selectedMode === "group"
            ? "集団の購入者数TOP5から属性を当てる"
            : "購入パターンに多い購入層を当てる"}
        </p>
      </div>
      <Button
        size="lg"
        className="rounded-full px-10 py-6 text-lg font-semibold"
        onClick={() => onStart(selectedMode)}
      >
        スタート
      </Button>
    </div>
  );
}
