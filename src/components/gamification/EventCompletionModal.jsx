"use client";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, X, CheckCircle2, Zap } from "lucide-react";

export default function EventCompletionModal({
  isOpen,
  onClose,
  event,
  xpAwarded,
  milestonesUnlocked,
  goalReached,
}) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !firedRef.current) {
      firedRef.current = true;

      // Fire confetti
      const origin = { y: 0.6 };
      const colors = goalReached
        ? ["#22c55e", "#16a34a", "#fde047", "#facc15"]
        : ["#3b82f6", "#8b5cf6", "#f97316"];

      confetti({
        particleCount: goalReached ? 150 : 80,
        spread: 80,
        origin,
        colors,
        zIndex: 9999,
      });

      if (goalReached) {
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors,
            zIndex: 9999,
          });
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors,
            zIndex: 9999,
          });
        }, 400);
      }
    }

    // Reset on close
    if (!isOpen) {
      firedRef.current = false;
    }
  }, [isOpen, goalReached]);

  if (!isOpen || !event) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Event achievement modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm bg-background border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header with gradient */}
        <div
          className={`px-6 pt-8 pb-6 text-center relative overflow-hidden ${
            goalReached
              ? "bg-gradient-to-b from-green-500/20 to-transparent"
              : "bg-gradient-to-b from-blue-500/20 to-transparent"
          }`}
        >
          {/* Big emoji */}
          <div className="text-5xl mb-3 animate-bounce">{event.icon}</div>

          {goalReached ? (
            <>
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Community Goal Achieved!
                </span>
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-bold">{event.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                The community reached the goal! 🌍
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Milestone Unlocked!
                </span>
              </div>
              <h2 className="text-xl font-bold">{event.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                You helped the community hit a new milestone!
              </p>
            </>
          )}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* XP Gained */}
          {xpAwarded > 0 && (
            <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold text-sm">XP Earned</span>
              </div>
              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 font-bold text-xl">
                <Zap className="h-4 w-4" />+{xpAwarded}
              </div>
            </div>
          )}

          {/* Milestones unlocked */}
          {milestonesUnlocked?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                Milestones Reached
              </div>
              <div className="space-y-2">
                {milestonesUnlocked.map((m) => (
                  <div
                    key={m.at}
                    className="flex items-center gap-2 p-2.5 border rounded-lg bg-accent/30"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Community reached {m.at.toLocaleString()} {event.unit}
                      </div>
                    </div>
                    <Badge className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-300">
                      +{m.xpBonus} XP
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Badge earned */}
          {goalReached && event.badgeId && (
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-center">
              <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">
                🏆 Badge Unlocked
              </div>
              <div className="font-bold text-sm capitalize">
                {event.badgeId.replace(/_/g, " ")}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            onClick={onClose}
            id="event-completion-modal-close"
          >
            Keep contributing! 🌱
          </Button>
        </div>
      </div>
    </div>
  );
}
