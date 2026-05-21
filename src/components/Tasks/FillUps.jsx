"use client";

import { useEffect, useState, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Loader, Zap } from "lucide-react";
import { toast } from "sonner";
import xpContext from "@/contexts/xp";
import { ComboIndicator } from "@/components/gamification/ComboMultiplier";
import { useSoundEffects } from "@/hooks/useSoundEffects";

/**
 * @typedef {Object} FillUpsTask
 * @property {string} id - Unique identifier for the task
 * @property {string} type - Task type ('fillup')
 * @property {string} question - The fill-in-the-blank question prompt
 * @property {string[]} acceptableAnswers - List of correct answers accepted by the system
 * @property {boolean} caseSensitive - Whether casing is strictly enforced during comparison
 * @property {string} answer - A representative correct answer
 * @property {string} explanation - Educational explanation of the answer
 * @property {boolean} [isAnswered] - Whether the user has answered this task previously
 * @property {boolean} [isCorrect] - Whether the user's previous answer was correct
 * @property {string} [userAnswer] - The user's input string from previous attempt
 */

/**
 * FillUps component provides a text input for fill-in-the-blank questions.
 * Validates against a list of acceptable answers (case sensitive/insensitive),
 * supports combo multipliers, and triggers success/error synth effects.
 *
 * @param {Object} props
 * @param {FillUpsTask} props.task - The fillups task configuration object
 * @param {string} props.roadmapId - The ID of the current roadmap
 * @param {number} props.chapterNumber - The current chapter number
 * @param {() => void} [props.onCourseComplete] - Callback triggered when course is completed
 * @returns {JSX.Element} The rendered FillUps component
 */
const FillUps = ({ task, roadmapId, chapterNumber, onCourseComplete }) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const { getXp, combo, incrementCombo, resetCombo, getCurrentMultiplier } = useContext(xpContext);
  const { playSuccess, playError } = useSoundEffects();

  /**
   * Tracks user input value and updates component state.
   * 
   * @param {React.ChangeEvent<HTMLInputElement>} e - Input change event.
   */
  const handleInputChange = (e) => {
    if (isAnswered) return;
    setUserAnswer(e.target.value);
  };

  /**
   * Evaluates the typed fill-in-the-blank answer against acceptable answers,
   * submits the assessment to the API, awards XP/streaks, and triggers sounds.
   */
  const checkAnswer = async () => {
    let correct = false;
    setSubmitting(true);

    try {
      const normalizedUserAnswer = task.caseSensitive ? userAnswer.trim() : userAnswer.trim().toLowerCase();

      const normalizedAcceptableAnswers = (task.acceptableAnswers || []).map((answer) =>
        task.caseSensitive ? answer.trim() : answer.trim().toLowerCase()
      );

      correct = normalizedAcceptableAnswers.includes(normalizedUserAnswer);

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
          userAnswer,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsCorrect(correct);
        setIsAnswered(true);

        // Handle combo system & sound effects
        if (correct) {
          playSuccess();
          incrementCombo();
          // Show toast for combo XP after a small delay so combo updates first
          setTimeout(() => {
            const multiplier = getCurrentMultiplier();
            if (multiplier > 1) {
              toast.success(`+${2 * multiplier} XP (${multiplier}x combo!)`, {
                icon: <Zap className="h-4 w-4 text-yellow-500" />,
              });
            }
          }, 100);
        } else {
          playError();
          resetCombo();
        }

        // XP is now awarded server-side in /api/tasks
        getXp();

        // Auto-trigger certificate dialog if entire course is complete
        if (data.courseCompleted && onCourseComplete) {
          setTimeout(() => onCourseComplete(), 800);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to submit task. Try again.");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  useEffect(() => {
    if (task.isAnswered) {
      setIsAnswered(task.isAnswered);
      setIsCorrect(task.isCorrect);
      setUserAnswer(task.userAnswer || "");
    }
  }, [task]);

  return (
    <div className="w-full p-4">
      <Card className="max-w-3xl gap-4 mx-auto border border-white/10">
        <CardHeader className="rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">Fill in the blank</CardTitle>
            {/* Show combo indicator if active */}
            {combo >= 2 && <ComboIndicator combo={combo} />}
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <div>
            <h2 className="mb-4 text-sm font-medium text-gray-400 uppercase tracking-wider">Question</h2>

            <div className="flex select-none flex-col gap-4 text-lg">
              <span className="text-white font-medium">{task.question || task.content}</span>
              <div className="flex items-center gap-3 text-base text-gray-300 mt-2">
                Enter your answer:
                <Input
                  value={userAnswer}
                  onChange={handleInputChange}
                  disabled={isAnswered}
                  className={`text-center mx-2 max-w-48 font-semibold transition-all duration-300 ${isAnswered
                    ? isCorrect
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : "border-rose-500 bg-rose-500/15 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                    : "border-white/10 bg-white/5 focus:border-[#8B5CF6] text-white focus:shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                    }`}
                  placeholder="Type here..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && userAnswer.trim() !== "") {
                      e.preventDefault();
                      checkAnswer();
                    }
                  }}
                />
              </div>
            </div>

            {isAnswered && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="flex items-center mt-4">
                  <div className="shrink-0 mr-3">
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-emerald-400 animate-pulse" />
                    ) : (
                      <XCircle className="h-6 w-6 text-rose-400 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{isCorrect ? "Correct!" : "Incorrect!"}</div>
                    <div className="text-sm text-gray-400">
                      {isCorrect ? "Great job!" : `The correct answer is: ${task.answer}`}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <div
                    className={`p-4 rounded-lg border border-l-4 glassmorphism ${isCorrect
                      ? "border-l-emerald-500 border-emerald-500/20 text-emerald-400"
                      : "border-l-rose-500 border-rose-500/20 text-rose-300"
                      }`}
                  >
                    <div className="font-bold text-base mb-1 text-white">Explanation</div>
                    <p className="text-sm text-gray-300 leading-relaxed">{task.explanation}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center mt-4">
          {!isAnswered && (
            <Button
              variant="default"
              className="px-8"
              onClick={checkAnswer}
              disabled={!userAnswer || submitting}
            >
              {submitting ? (
                <>
                  Submitting
                  <Loader className="animate-spin ml-2 h-4 w-4" />
                </>
              ) : (
                "Submit"
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default FillUps;
