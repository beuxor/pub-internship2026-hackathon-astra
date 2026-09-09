"use client";

import { useState } from "react";
import type {
  QuestionResponse,
  AnswerResponse,
  AgeBand,
  Gender,
  MarriageStatus,
} from "@/lib/quiz-types";
import { QuizStart } from "@/components/quiz-start";
import { QuizQuestion } from "@/components/quiz-question";
import { QuizResult } from "@/components/quiz-result";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type Phase = "start" | "loading-question" | "question" | "submitting" | "result";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("start");
  const [question, setQuestion] = useState<QuestionResponse | null>(null);
  const [result, setResult] = useState<AnswerResponse | null>(null);
  const [userAnswer, setUserAnswer] = useState<{ ageBand: AgeBand; gender: Gender; marriageStatus: MarriageStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchQuestion() {
    setError(null);
    setPhase("loading-question");
    try {
      const res = await fetch("/api/question", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: QuestionResponse = await res.json();
      setQuestion(data);
      setPhase("question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "問題の取得に失敗しました。");
      setPhase("start");
    }
  }

  async function submitAnswer(answer: { ageBand: AgeBand; gender: Gender; marriageStatus: MarriageStatus }) {
    if (!question) return;
    setError(null);
    setUserAnswer(answer);
    setPhase("submitting");
    try {
      const res = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.questionId, answer }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: AnswerResponse = await res.json();
      setResult(data);
      setPhase("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "回答の送信に失敗しました。");
      setPhase("question");
    }
  }

  function handleNext() {
    setQuestion(null);
    setResult(null);
    setUserAnswer(null);
    fetchQuestion();
  }

  return (
    <>
      {error && (
        <div className="w-full max-w-2xl mx-auto px-4 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {phase === "start" && <QuizStart onStart={fetchQuestion} />}

      {phase === "loading-question" && (
        <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      )}

      {phase === "question" && question && (
        <QuizQuestion
          question={question}
          onAnswer={submitAnswer}
          isSubmitting={false}
        />
      )}

      {phase === "submitting" && question && (
        <QuizQuestion
          question={question}
          onAnswer={submitAnswer}
          isSubmitting={true}
        />
      )}

      {phase === "result" && result && userAnswer && (
        <QuizResult result={result} userAnswer={userAnswer} onNext={handleNext} />
      )}
    </>
  );
}
