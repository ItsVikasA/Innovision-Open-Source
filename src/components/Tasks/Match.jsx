"use client";

import { useState, useRef, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader } from "lucide-react";
import xpContext from "@/contexts/xp";
import { useSoundEffects } from "@/hooks/useSoundEffects";

/**
 * @typedef {Object} TaskTerms
 * @property {string[]} lhs - Left-hand side terms
 * @property {string[]} rhs - Right-hand side terms (shuffled/definitions)
 */

/**
 * @typedef {Object} MatchTask
 * @property {string} id - Unique identifier for the task
 * @property {string} type - Task type ('match')
 * @property {TaskTerms} terms - Left-hand and right-hand side terms to match
 * @property {number[]} answer - The indices of correct RHS matches for each LHS element
 * @property {string} explanation - Educational explanation of the answers
 * @property {boolean} [isAnswered] - Whether the user has already completed this task
 * @property {boolean[]} [isCorrect] - Array indicating correctness of each matched item
 * @property {number[]} [userAnswer] - Array of RHS indices selected by the user for each LHS
 */

/**
 * Match component provides a production-grade drag/click interactive matching interface.
 * Left items connect to right items via dynamic, responsive SVG Bezier connectors.
 *
 * @param {Object} props
 * @param {MatchTask} props.task - The match task configuration object
 * @param {string} props.roadmapId - The ID of the current learning roadmap
 * @param {number} props.chapterNumber - The current chapter index
 * @param {() => void} [props.onCourseComplete] - Callback triggered when the entire course is completed
 * @returns {JSX.Element} The rendered Match task component
 */
export default function Match({ task, roadmapId, chapterNumber, onCourseComplete }) {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matches, setMatches] = useState(Array((task?.terms?.lhs || []).length).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState([]);
  const [score, setScore] = useState(0);
  const { getXp } = useContext(xpContext);
  const { playHover, playClick, playSuccess, playError } = useSoundEffects();

  const leftRefs = useRef([]);
  const rightRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const lhsLength = (task?.terms?.lhs || []).length;
    const rhsLength = (task?.terms?.rhs || []).length;
    leftRefs.current = leftRefs.current.slice(0, lhsLength);
    rightRefs.current = rightRefs.current.slice(0, rhsLength);
    if (task?.isAnswered) {
      setIsCorrect(task.isCorrect || []);
      setScore((task.isCorrect || []).filter(Boolean).length);
      setMatches(task.userAnswer || []);
      setSubmitted(task.isAnswered);
    }
  }, [task]);

  useEffect(() => {
    let animationFrameId;

    const updateLinePaths = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      matches.forEach((rightIndex, leftIndex) => {
        if (rightIndex === -1) return;
        const leftEl = leftRefs.current[leftIndex];
        const rightEl = rightRefs.current[rightIndex];
        const pathEl = containerRef.current.querySelector(`#path-${leftIndex}`);

        if (leftEl && rightEl && pathEl) {
          const leftRect = leftEl.getBoundingClientRect();
          const rightRect = rightEl.getBoundingClientRect();

          const fromX = leftRect.right - containerRect.left;
          const fromY = leftRect.top + leftRect.height / 2 - containerRect.top;
          const toX = rightRect.left - containerRect.left;
          const toY = rightRect.top + rightRect.height / 2 - containerRect.top;

          const controlPointX1 = fromX + (toX - fromX) * 0.45;
          const controlPointX2 = fromX + (toX - fromX) * 0.55;

          pathEl.setAttribute(
            "d",
            `M ${fromX} ${fromY} C ${controlPointX1} ${fromY}, ${controlPointX2} ${toY}, ${toX} ${toY}`
          );
        }
      });
    };

    const tick = () => {
      updateLinePaths();
      animationFrameId = requestAnimationFrame(tick);
    };

    // Run requestAnimationFrame loop
    animationFrameId = requestAnimationFrame(tick);

    // Initial positioning
    updateLinePaths();

    window.addEventListener("resize", updateLinePaths);
    window.addEventListener("scroll", updateLinePaths);
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", updateLinePaths);
      window.removeEventListener("scroll", updateLinePaths);
    };
  }, [matches, submitted, isCorrect]);

  /**
   * Handles selection of a left-hand side item.
   * If a right-hand side item is already selected, creates a match.
   * 
   * @param {number} index - Index of the left item.
   */
  const handleLeftSelect = (index) => {
    if (submitted) return;
    playClick();
    setSelectedLeft(index);

    if (selectedRight !== null) {
      createMatch(index, selectedRight);
    }
  };

  /**
   * Handles selection of a right-hand side item.
   * If a left-hand side item is already selected, creates a match.
   * 
   * @param {number} index - Index of the right item.
   */
  const handleRightSelect = (index) => {
    if (submitted) return;
    playClick();
    setSelectedRight(index);

    if (selectedLeft !== null) {
      createMatch(selectedLeft, index);
    }
  };

  /**
   * Creates a match pairing between a left item and a right item,
   * updating matches state and clearing existing connections.
   * 
   * @param {number} leftIndex - LHS item index.
   * @param {number} rightIndex - RHS item index.
   */
  const createMatch = (leftIndex, rightIndex) => {
    const newMatches = [...matches];

    const existingMatchIndex = matches.indexOf(rightIndex);
    if (existingMatchIndex !== -1) {
      newMatches[existingMatchIndex] = -1;
    }

    if (newMatches[leftIndex] !== -1) {
      newMatches[leftIndex] = -1;
    }

    newMatches[leftIndex] = rightIndex;
    setMatches(newMatches);

    setSelectedLeft(null);
    setSelectedRight(null);
  };

  /**
   * Removes an existing match connection from a left-hand side item.
   * 
   * @param {number} leftIndex - LHS item index.
   */
  const removeMatch = (leftIndex) => {
    if (submitted) return;
    playClick();
    const newMatches = [...matches];
    newMatches[leftIndex] = -1;
    setMatches(newMatches);
  };

  /**
   * Submits matched pairs to the server to check correctness, update XP,
   * trigger sound effects, and notify completion callbacks.
   */
  const handleSubmit = async () => {
    if (matches.includes(-1)) {
      toast.warning("Please match all items before submitting");
      return;
    }
    setSubmitting(true);

    try {
      const correctAnswers = task?.answer || [];

      const correctnessArray = matches.map((rightIndex, leftIndex) => {
        return correctAnswers[leftIndex] === rightIndex;
      });

      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          isCorrect: correctnessArray,
          roadmap: roadmapId,
          chapter: chapterNumber,
          userAnswer: matches,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsCorrect(correctnessArray);
        const correctCount = correctnessArray.filter(Boolean).length;
        setScore(correctCount);
        setSubmitted(true);

        const allCorrect = correctnessArray.every(Boolean);
        if (allCorrect) {
          playSuccess();
        } else {
          playError();
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
      console.error("Error submitting match:", error);
      toast.error("Network error. Please check your connection and try again.");
    }
    setSubmitting(false);
  };

  /**
   * Resolves the styling/color classes of a left-hand side item card
   * depending on whether it is selected, matched, or graded.
   * 
   * @param {number} index - Index of the LHS item.
   * @returns {string} Tailwind CSS class string.
   */
  const getLeftItemColor = (index) => {
    if (submitted) {
      return isCorrect[index]
        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
        : "bg-rose-500/15 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
    }
    if (index === selectedLeft) {
      return "bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]";
    }
    if (matches[index] !== -1) {
      return "bg-[#5865F2]/15 border-[#5865F2]/50 text-white shadow-[0_0_10px_rgba(88,101,242,0.1)]";
    }
    return "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300";
  };

  /**
   * Resolves the styling/color classes of a right-hand side item card
   * depending on whether it is selected, matched, or graded.
   * 
   * @param {number} index - Index of the RHS item.
   * @returns {string} Tailwind CSS class string.
   */
  const getRightItemColor = (index) => {
    if (submitted) {
      const leftIndex = matches.indexOf(index);
      if (leftIndex !== -1) {
        return isCorrect[leftIndex]
          ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
          : "bg-rose-500/15 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.15)]";
      }
    }
    if (index === selectedRight) {
      return "bg-[#8B5CF6]/20 border-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]";
    }
    if (matches.includes(index)) {
      return "bg-[#5865F2]/15 border-[#5865F2]/50 text-white shadow-[0_0_10px_rgba(88,101,242,0.1)]";
    }
    return "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300";
  };

  return (
    <Card className="w-full max-w-3xl border border-white/10 mx-auto">
      <CardHeader>
        <CardTitle>Match the Following</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative" ref={containerRef}>
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
            {matches.map((rightIndex, leftIndex) => {
              if (rightIndex === -1) return null;

              let strokeColor = "#5865F2";
              if (submitted) {
                strokeColor = isCorrect[leftIndex] ? "#10b981" : "#f43f5e";
              } else if (leftIndex === selectedLeft) {
                strokeColor = "#8B5CF6";
              }

              return (
                <path
                  key={`path-${leftIndex}`}
                  id={`path-${leftIndex}`}
                  stroke={strokeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  className="transition-colors duration-300 drop-shadow-[0_0_8px_rgba(88,101,242,0.3)]"
                />
              );
            })}
          </svg>

          <div className="flex gap-6 justify-center select-none md:gap-16">
            <div className="space-y-4">
              {(task?.terms?.lhs || []).map((term, index) => (
                <div
                  key={`left-${index}`}
                  ref={(el) => (leftRefs.current[index] = el)}
                  className={`p-3 border rounded-lg w-full cursor-pointer transition-all duration-300 ${getLeftItemColor(index)}`}
                  onClick={() => handleLeftSelect(index)}
                  onMouseEnter={() => !submitted && playHover()}
                >
                  <div className="flex justify-between items-center">
                    <span>{term}</span>
                    {matches[index] !== -1 && !submitted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeMatch(index);
                        }}
                        className="text-gray-400 hover:text-white transition-colors ml-2 font-bold"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {(task?.terms?.rhs || []).map((definition, index) => (
                <div
                  key={`right-${index}`}
                  ref={(el) => (rightRefs.current[index] = el)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all duration-300 ${getRightItemColor(index)}`}
                  onClick={() => handleRightSelect(index)}
                  onMouseEnter={() => !submitted && playHover()}
                >
                  {definition}
                </div>
              ))}
            </div>
          </div>
        </div>

        {submitted && (
          <Alert className="mt-6 border-white/10 glassmorphism">
            <AlertDescription>
              <p className="font-semibold text-white">
                Score: {score}/{(task?.terms?.lhs || []).length}
              </p>
              <p className="mt-2 text-gray-300">{task.explanation}</p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-center gap-2">
        {!submitted && (
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8"
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
  );
}
