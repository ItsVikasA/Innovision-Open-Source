"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Clock,
  Trophy,
  Zap,
  ChevronRight,
  Plus,
  Minus,
  CheckCircle2,
  Sparkles,
  CalendarDays,
} from "lucide-react";

const THEME_STYLES = {
  green: {
    gradient: "from-emerald-500/10 via-green-500/5 to-transparent",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    progress: "bg-emerald-500",
    milestone: "bg-emerald-500",
    button:
      "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600",
    glow: "shadow-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  blue: {
    gradient: "from-blue-500/10 via-indigo-500/5 to-transparent",
    border: "border-blue-500/30",
    badge: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    progress: "bg-blue-500",
    milestone: "bg-blue-500",
    button:
      "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600",
    glow: "shadow-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  cyan: {
    gradient: "from-cyan-500/10 via-sky-500/5 to-transparent",
    border: "border-cyan-500/30",
    badge: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    progress: "bg-cyan-500",
    milestone: "bg-cyan-500",
    button:
      "bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-700 dark:hover:bg-cyan-600",
    glow: "shadow-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-400",
  },
};

function useCountdown(endDate) {
  const getTimeLeft = useCallback(() => {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
      expired: false,
    };
  }, [endDate]);

  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [getTimeLeft]);

  return timeLeft;
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-bold tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

export default function EventCard({
  event,
  userId,
  userContribution = 0,
  onContribute,
}) {
  const theme = THEME_STYLES[event.theme] || THEME_STYLES.green;
  const timeLeft = useCountdown(
    event.status === "upcoming" ? event.startDate : event.endDate
  );
  const [contribution, setContribution] = useState(1);
  const [loading, setLoading] = useState(false);
  const [localProgress, setLocalProgress] = useState(event.communityProgress || 0);
  const [localUserContrib, setLocalUserContrib] = useState(userContribution);
  const [justMilestone, setJustMilestone] = useState(null);

  const progressPct = Math.min((localProgress / event.goal) * 100, 100);
  const milestones = event.milestones || [];

  const handleContribute = async () => {
    if (!userId || loading || event.status !== "active") return;
    setLoading(true);

    try {
      const res = await fetch("/api/community-events/participate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          eventId: event.id,
          amount: contribution,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setLocalProgress(data.communityProgress ?? localProgress + contribution);
        setLocalUserContrib((prev) => prev + contribution);

        if (data.milestonesUnlocked?.length > 0) {
          setJustMilestone(data.milestonesUnlocked[0]);
          setTimeout(() => setJustMilestone(null), 4000);
        }

        if (onContribute) {
          onContribute(data);
        }
      }
    } catch (e) {
      console.error("Error contributing:", e);
    } finally {
      setLoading(false);
    }
  };

  const isUpcoming = event.status === "upcoming";
  const isEnded = event.status === "ended";

  return (
    <Card
      className={`relative overflow-hidden border-2 ${theme.border} shadow-lg ${theme.glow} transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5`}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} pointer-events-none`}
      />

      {/* Seasonal badge */}
      {event.isSeasonal && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className={`${theme.badge} text-[10px] gap-1`}>
            <Sparkles className="h-2.5 w-2.5" />
            Seasonal
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-start gap-3">
          <div className="text-4xl leading-none select-none">{event.icon}</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-tight">{event.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mt-2">
          {isEnded ? (
            <Badge variant="secondary" className="text-[10px]">
              Event Ended
            </Badge>
          ) : isUpcoming ? (
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] gap-1">
              <CalendarDays className="h-2.5 w-2.5" />
              Starts in
            </Badge>
          ) : (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 text-[10px] gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        {/* Countdown timer */}
        {!isEnded && (
          <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-3">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
              <Clock className="h-3 w-3" />
              {isUpcoming ? "Starts in" : "Ends in"}
            </div>
            {timeLeft.expired ? (
              <div className="text-sm font-semibold text-muted-foreground">
                {isUpcoming ? "Starting soon..." : "Event ended"}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <CountdownUnit value={timeLeft.days} label="days" />
                <span className="text-lg font-bold text-muted-foreground pb-3">:</span>
                <CountdownUnit value={timeLeft.hours} label="hrs" />
                <span className="text-lg font-bold text-muted-foreground pb-3">:</span>
                <CountdownUnit value={timeLeft.minutes} label="min" />
                <span className="text-lg font-bold text-muted-foreground pb-3">:</span>
                <CountdownUnit value={timeLeft.seconds} label="sec" />
              </div>
            )}
          </div>
        )}

        {/* Community progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Community Progress</span>
            <span className={`font-bold ${theme.text}`}>
              {localProgress.toLocaleString()} / {event.goal.toLocaleString()}{" "}
              {event.unit}
            </span>
          </div>

          {/* Progress bar with milestone markers */}
          <div className="relative h-3 w-full">
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${theme.progress}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Milestone markers */}
            {milestones.map((m) => {
              const pos = (m.at / event.goal) * 100;
              const passed = localProgress >= m.at;
              return (
                <div
                  key={m.at}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${pos}%` }}
                  title={`${m.label}: ${m.at.toLocaleString()} ${event.unit}`}
                >
                  <div
                    className={`w-3 h-3 rounded-full border-2 border-background transition-all duration-300 ${
                      passed
                        ? `${theme.milestone} scale-110`
                        : "bg-muted-foreground/40"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Milestone labels */}
          {milestones.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {milestones.map((m) => (
                <div
                  key={m.at}
                  className={`flex items-center gap-0.5 text-[10px] transition-all ${
                    localProgress >= m.at
                      ? `${theme.text} font-semibold`
                      : "text-muted-foreground"
                  }`}
                >
                  {localProgress >= m.at ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : (
                    <div className="h-2.5 w-2.5 rounded-full border border-current opacity-40" />
                  )}
                  {m.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>
              {(event.participantCount || 0).toLocaleString()} participants
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="h-3 w-3" />
            <span>+{event.xpReward} XP</span>
          </div>
        </div>

        {/* User contribution + action */}
        {!isEnded && userId && (
          <div className="pt-1">
            {localUserContrib > 0 && (
              <div
                className={`text-xs ${theme.text} font-medium mb-2 flex items-center gap-1`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Your contribution: {localUserContrib.toLocaleString()} {event.unit}
              </div>
            )}

            {!isUpcoming && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border rounded-md overflow-hidden">
                  <button
                    onClick={() => setContribution((p) => Math.max(1, p - 1))}
                    className="p-1.5 hover:bg-muted transition-colors"
                    aria-label="Decrease"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">
                    {contribution}
                  </span>
                  <button
                    onClick={() => setContribution((p) => Math.min(100, p + 1))}
                    className="p-1.5 hover:bg-muted transition-colors"
                    aria-label="Increase"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <Button
                  size="sm"
                  className={`flex-1 ${theme.button} text-xs font-semibold gap-1`}
                  onClick={handleContribute}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  Contribute {contribution} {event.unit}
                </Button>
              </div>
            )}

            {isUpcoming && (
              <div
                className={`text-xs ${theme.badge} rounded-md px-3 py-2 text-center font-medium`}
              >
                Event starting soon — get ready!
              </div>
            )}
          </div>
        )}

        {/* Milestone unlock celebration */}
        {justMilestone && (
          <div className="border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 flex items-center gap-2 animate-pulse">
            <Sparkles className="h-4 w-4 text-yellow-500 shrink-0" />
            <div>
              <div className="text-xs font-bold text-yellow-700 dark:text-yellow-300">
                🎉 Milestone Unlocked!
              </div>
              <div className="text-[11px] text-yellow-600 dark:text-yellow-400">
                {justMilestone.label} — +{justMilestone.xpBonus} XP
              </div>
            </div>
          </div>
        )}

        {/* Ended event completion state */}
        {isEnded && (
          <div className="text-center py-2">
            {localProgress >= event.goal ? (
              <div className="space-y-1">
                <div className="text-2xl">🎉</div>
                <div className="text-xs font-bold text-green-600 dark:text-green-400">
                  Community Goal Achieved!
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Event ended •{" "}
                {Math.round((localProgress / event.goal) * 100)}% of goal
                reached
              </div>
            )}
          </div>
        )}

        {/* View details link */}
        <div className={`flex justify-end`}>
          <button
            className={`text-xs ${theme.text} flex items-center gap-0.5 hover:underline`}
            onClick={() => {}}
          >
            View details
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
