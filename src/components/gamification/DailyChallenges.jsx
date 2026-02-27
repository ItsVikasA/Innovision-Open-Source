"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, Clock, BookOpen, Award } from "lucide-react";

export default function DailyChallenges({ userId }) {
  const [challenges, setChallenges] = useState([
    { id: 1, title: "Complete 2 Chapters", progress: 0, goal: 2, xp: 100, icon: BookOpen, color: "text-blue-500" },
    { id: 2, title: "Study for 30 Minutes", progress: 0, goal: 30, xp: 50, icon: Clock, color: "text-orange-500" },
    { id: 3, title: "Perfect Quiz Score", progress: 0, goal: 1, xp: 200, icon: Award, color: "text-purple-500" },
  ]);

  const totalXP = challenges.reduce((sum, c) => sum + (c.progress >= c.goal ? c.xp : 0), 0);
  const completedCount = challenges.filter(c => c.progress >= c.goal).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Daily Challenges
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{completedCount}/{challenges.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {challenges.map((challenge) => {
          const isComplete = challenge.progress >= challenge.goal;
          const progressPercent = (challenge.progress / challenge.goal) * 100;

          return (
            <div key={challenge.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded bg-slate-100 dark:bg-slate-800 ${challenge.color}`}>
                    <challenge.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1.5">
                      {challenge.title}
                      {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {challenge.progress}/{challenge.goal} • +{challenge.xp} XP
                    </div>
                  </div>
                </div>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Total Daily XP</span>
            <Badge className="bg-green-500 text-xs">{totalXP} XP</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
