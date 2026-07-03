"use client";

import React, { useState, useEffect, useContext } from "react";
import { Reorder } from "framer-motion";
import { GripVertical, RotateCcw, CheckCircle, XCircle, Zap, Loader } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ComboIndicator } from "@/components/gamification/ComboMultiplier";
import xpContext from "@/contexts/xp";
import { useNightMode } from "@/contexts/nightMode";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark, coldarkCold } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Task {
  type: string;
  question?: string;
  description?: string;
  content?: string;
  lines: string[];
  language?: string;
  explanation?: string;
  isAnswered?: boolean;
  isCorrect?: boolean;
  userAnswer?: string[];
}

interface ReorderItem {
  id: string;
  text: string;
}

interface CodeReorderTaskProps {
  task: Task;
  roadmapId: string;
  chapterNumber: number | string;
  onCourseComplete?: () => void;
}

const shuffleArray = (array: ReorderItem[]): ReorderItem[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getShuffledLines = (correctLines: string[]): ReorderItem[] => {
  const mapped = correctLines.map((line, index) => ({
    id: `line-${index}-${Math.random().toString(36).substring(2, 9)}`,
    text: line,
  }));

  if (mapped.length <= 1) return mapped;

  let shuffled = shuffleArray(mapped);

  // Keep shuffling to ensure we don't start with the correct order (if possible)
  let attempts = 0;
  while (attempts < 10 && shuffled.map(item => item.text).join("\n") === correctLines.join("\n")) {
    shuffled = shuffleArray(mapped);
    attempts++;
  }

  return shuffled;
};

export default function CodeReorderTask({
  task,
  roadmapId,
  chapterNumber,
  onCourseComplete,
}: CodeReorderTaskProps) {
  const [lines, setLines] = useState<ReorderItem[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState("light");

  const { getXp, combo, incrementCombo, resetCombo, getCurrentMultiplier } = useContext(xpContext);

  // Detect and synchronize active color theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);

    const handleThemeChange = () => {
      const currentTheme = localStorage.getItem("theme") || "light";
      setTheme(currentTheme);
    };

    window.addEventListener("storage", handleThemeChange);

    const interval = setInterval(() => {
      const currentTheme = localStorage.getItem("theme") || "light";
      if (currentTheme !== theme) {
        setTheme(currentTheme);
      }
    }, 100);

    return () => {
      window.removeEventListener("storage", handleThemeChange);
      clearInterval(interval);
    };
  }, [theme]);

  // Initialize lines state based on completed status
  useEffect(() => {
    if (task.isAnswered && Array.isArray(task.userAnswer)) {
      setLines(
        task.userAnswer.map((line, idx) => ({
          id: `line-${idx}`,
          text: line,
        }))
      );
      setIsAnswered(true);
      setIsCorrect(!!task.isCorrect);
    } else if (Array.isArray(task.lines)) {
      setLines(getShuffledLines(task.lines));
      setIsAnswered(false);
      setIsCorrect(false);
    }
  }, [task]);

  const handleReset = () => {
    if (isAnswered || !Array.isArray(task.lines)) return;
    setLines(getShuffledLines(task.lines));
  };

  const checkAnswer = async () => {
    if (isAnswered || submitting || !Array.isArray(task.lines)) return;
    setSubmitting(true);

    const userOrder = lines.map((l) => l.text);
    const correctOrder = task.lines;

    let correct = true;
    if (userOrder.length !== correctOrder.length) {
      correct = false;
    } else {
      for (let i = 0; i < correctOrder.length; i++) {
        if (userOrder[i] !== correctOrder[i]) {
          correct = false;
          break;
        }
      }
    }

    try {
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          isCorrect: correct,
          roadmap: roadmapId,
          chapter: chapterNumber,
          userAnswer: userOrder,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsCorrect(correct);
        setIsAnswered(true);

        if (correct) {
          incrementCombo();

          // Fire canvas success confetti
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"],
          });

          setTimeout(() => {
            const multiplier = getCurrentMultiplier();
            if (multiplier > 1) {
              toast.success(`+${2 * multiplier} XP (${multiplier}x combo!)`, {
                icon: <Zap className="h-4 w-4 text-yellow-500" />,
              });
            }
          }, 100);
        } else {
          resetCombo();
        }

        // Award/refresh XP
        getXp();

        if (data.courseCompleted && onCourseComplete) {
          setTimeout(() => onCourseComplete(), 800);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to submit task. Try again.");
      }
    } catch (error) {
      console.error("Error submitting code reorder task:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  const codeStyle = theme === "dark" ? coldarkDark : coldarkCold;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6">
      <Card className="shadow-md border border-border/80 bg-card/60 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
              Code Reorder
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Drag and drop code snippets in their correct logical order.
            </p>
          </div>
          {combo >= 2 && <ComboIndicator combo={combo} />}
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Question / Task Description */}
          <div className="p-4 rounded-lg bg-muted/50 border border-muted-foreground/10">
            <h3 className="font-semibold text-sm sm:text-base mb-1">Objective:</h3>
            <p className="text-sm sm:text-base leading-relaxed text-foreground/80">
              {task.question || task.description || task.content || "Reorder the blocks below."}
            </p>
          </div>

          {/* Reordering container */}
          <div>
            <Reorder.Group
              axis="y"
              values={lines}
              onReorder={setLines}
              className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1"
            >
              {lines.map((item, index) => {
                const isLineCorrect =
                  isAnswered && Array.isArray(task.lines) && item.text === task.lines[index];

                return (
                  <Reorder.Item
                    key={item.id}
                    value={item}
                    dragListener={!isAnswered}
                    className={`flex items-center space-x-3 rounded-lg border-2 p-3 transition-colors duration-200 select-none ${
                      isAnswered
                        ? isLineCorrect
                          ? "border-green-500/80 bg-green-50/50 dark:bg-green-950/20"
                          : "border-destructive/80 bg-destructive-50/50 dark:bg-destructive-950/20"
                        : "border-border bg-card/80 hover:border-primary/50 active:border-primary/70 cursor-grab active:cursor-grabbing hover:bg-card/90"
                    }`}
                  >
                    {/* Drag Handle */}
                    {!isAnswered && (
                      <GripVertical className="h-5 w-5 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing hover:text-foreground transition-colors" />
                    )}

                    {/* Syntax Highlighted Code Line */}
                    <div className="grow overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre scrollbar-none py-1">
                      <SyntaxHighlighter
                        language={task.language || "javascript"}
                        style={codeStyle}
                        customStyle={{
                          margin: 0,
                          padding: 0,
                          background: "transparent",
                          fontSize: "0.875rem",
                          lineHeight: "1.5",
                        }}
                        PreTag="div"
                      >
                        {item.text}
                      </SyntaxHighlighter>
                    </div>

                    {/* Completion Icon */}
                    {isAnswered && (
                      <div className="shrink-0">
                        {isLineCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                    )}
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>

          {/* Explanation if answered */}
          {isAnswered && task.explanation && (
            <div
              className={`p-4 rounded-lg border-l-4 animate-fadeIn ${
                isCorrect
                  ? "bg-green-50/40 dark:bg-green-950/10 border-green-500 text-green-900 dark:text-green-300"
                  : "bg-amber-50/40 dark:bg-amber-950/10 border-amber-500 text-amber-900 dark:text-amber-300"
              }`}
            >
              <h4 className="font-semibold text-sm mb-1">
                {isCorrect ? "Correct Solution!" : "Solution Explanation"}
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed">{task.explanation}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
          <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            {isAnswered
              ? isCorrect
                ? "Perfect! You ordered the code correctly."
                : "Some blocks are incorrect. Study the logic and try the next lesson!"
              : "Drag lines of code up or down to fix the execution flow."}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {!isAnswered && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={submitting}
                className="flex items-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </Button>
            )}

            {!isAnswered ? (
              <Button
                onClick={checkAnswer}
                disabled={submitting}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2 font-medium transition-all"
              >
                {submitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <span>Submit Answer</span>
                )}
              </Button>
            ) : (
              <div className="text-sm font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted">
                {isCorrect ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400">Success (+2 XP)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-destructive">Incorrect</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
