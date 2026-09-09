"use client";

import { Button } from "@/components/ui/button";

interface QuizStartProps {
  onStart: () => void;
}

export function QuizStart({ onStart }: QuizStartProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12">
      <h1 className="text-5xl font-bold tracking-tight">始まるよ</h1>
      <Button
        size="lg"
        className="rounded-full px-10 py-6 text-lg font-semibold"
        onClick={onStart}
      >
        スタート
      </Button>
    </div>
  );
}
