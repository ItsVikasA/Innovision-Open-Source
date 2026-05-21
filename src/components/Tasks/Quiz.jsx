"use client";

import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, XCircle, Loader, Zap } from "lucide-react";
import { toast } from "sonner";
import xpContext from "@/contexts/xp";
import { ComboIndicator } from "@/components/gamification/ComboMultiplier";
import { useSoundEffects } from "@/hooks/useSoundEffects";

/**
 * @typedef {Object} QuizTask
 * @property {string} id - Unique identifier for the task
 * @property {string} type - Task type ('quiz')
 * @property {string} question - The question text
 * @property {string|string[]} options - Multiple choice options (array or values object)
 * @property {string|number} answer - The correct answer value or key
 * @property {string} explanation - Educational explanation of the correct answer
 * @property {boolean} [isAnswered] - Whether the user has already answered this task
 * @property {boolean} [isCorrect] - Whether the user's previous answer was correct
 * @property {string} [userAnswer] - The option selected by the user previously
 */

/**
 * Quiz component provides an immersive multiple-choice question layout.
 * Features hover/click sound effects, interactive glowing option items,
 * and integration with the gamified streak and combo multiplier system.
 *
 * @param {Object} props
 * @param {QuizTask} props.task - The quiz task data
 * @param {string} props.roadmapId - The ID of the current roadmap
 * @param {number} props.chapterNumber - The current chapter number
 * @param {() => void} [props.onCourseComplete] - Callback triggered upon course completion
 * @returns {JSX.Element} The rendered Quiz component
 */
export default function Quiz({ task, roadmapId, chapterNumber, onCourseComplete }) {
  const [selectedOption, setSelectedOption] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { getXp, combo, incrementCombo, resetCombo, getCurrentMultiplier } = useContext(xpContext);
  const { playHover, playClick, playSuccess, playError } = useSoundEffects();

  // Convert options object to array if needed
  const optionsArray = Array.isArray(task?.options) 
    ? task.options 
    : task?.options && typeof task.options === 'object'
    ? Object.values(task.options)
    : [];

  // Get the correct answer value (handle both array and object formats)
  const correctAnswer = Array.isArray(task?.options)
    ? task.answer
    : task?.options && typeof task.options === 'object' && task.answer
    ? task.options[task.answer]
    : task?.answer;

  /**
   * Handles selection of a multiple-choice option, triggering interactive sound.
   * 
   * @param {string} value - The selected option text.
   */
  const handleOptionSelect = (value) => {
    if (isAnswered) return;
    playClick();
    setSelectedOption(value);
  };

  /**
   * Submits the chosen multiple-choice answer to the backend API,
   * handles correctness scoring, plays sounds, increments streak/combo system,
   * updates XP, and checks if course completion is triggered.
   */
  const checkAnswer = async () => {
    setSubmitting(true);
    const correct = selectedOption === correctAnswer;

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
          userAnswer: selectedOption,
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
      console.error("Error submitting quiz:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  useEffect(() => {
    if (task.isAnswered) {
      setSelectedOption(task.userAnswer);
      setIsAnswered(task.isAnswered);
      setIsCorrect(task.isCorrect);
    }
  }, [task]);

  return (
    <div>
      <Card className="mx-auto border border-white/10 lg:w-[40vw]">
        <CardHeader className="rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-semibold">Multiple choice question</CardTitle>
            {/* Show combo indicator if active */}
            {combo >= 2 && <ComboIndicator combo={combo} />}
          </div>
        </CardHeader>

        <CardContent className="pb-2">
          <div className="space-y-6">
            <h2 className="mb-0 text-sm font-medium text-gray-400 uppercase tracking-wider">Question</h2>
            <h3 className="text-lg select-none text-white font-medium">{task.question || task.content}</h3>
            <RadioGroup value={selectedOption} className="space-y-3 text-sm">
              {!optionsArray || optionsArray.length === 0 ? (
                <div className="p-4 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
                  <p className="text-sm text-yellow-400">
                    No answer options available for this question. Please contact support or try regenerating the quiz.
                  </p>
                </div>
              ) : (
                optionsArray.map((option) => (
                <div
                  key={option}
                  className={`flex items-center space-x-2 rounded-lg border p-4 transition-all duration-300 cursor-pointer ${isAnswered
                    ? option === correctAnswer
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                      : option === selectedOption && option !== correctAnswer
                        ? "border-rose-500 bg-rose-500/15 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                        : "border-white/5 opacity-40 pointer-events-none"
                    : option === selectedOption
                      ? "border-[#8B5CF6] bg-[#8B5CF6]/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                      : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10 text-gray-300"
                    }`}
                  onClick={() => handleOptionSelect(option)}
                  onMouseEnter={() => !isAnswered && playHover()}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/5 shrink-0 transition-colors">
                    <RadioGroupItem
                      value={option}
                      id={option}
                      disabled={isAnswered}
                      checked={selectedOption === option}
                      className="sr-only text-sm"
                    />
                    {isAnswered && option === correctAnswer ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : isAnswered && option === selectedOption && option !== correctAnswer ? (
                      <XCircle className="h-5 w-5 text-rose-400" />
                    ) : (
                      <span className="text-sm font-semibold text-gray-200">
                        {String.fromCharCode(65 + optionsArray.indexOf(option))}
                      </span>
                    )}
                  </div>
                  <Label htmlFor={option} className="grow cursor-pointer ml-2 text-sm text-gray-200 font-medium">
                    {option}
                  </Label>
                </div>
              )))}
            </RadioGroup>
          </div>

          {isAnswered && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <div className="flex items-center">
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
                    {isCorrect ? "Great job!" : `The correct answer is: ${correctAnswer}`}
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
        </CardContent>
        <CardFooter className="flex justify-center mt-4">
          {!isAnswered && (
            <Button
              disabled={!selectedOption || submitting}
              variant="default"
              className="px-8"
              onClick={checkAnswer}
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
}
