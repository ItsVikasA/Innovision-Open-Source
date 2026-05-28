"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useNotifications } from "@/contexts/notifications";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Clock, ArrowRight, Loader2, BookOpen, Brain, Award } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecommendationCards() {
  const { user } = useAuth();
  const { fetchNotifications } = useNotifications();
  const router = useRouter();
  
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingId, setGeneratingId] = useState(null); // stores index of generating recommendation
  const [generatingStatus, setGeneratingStatus] = useState("");

  const getDifficultyColor = (difficulty = "Beginner") => {
    switch (difficulty.toLowerCase()) {
      case "advanced":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
      case "intermediate":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
      case "beginner":
      default:
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
    }
  };

  const fetchRecommendations = async (forceRefresh = false) => {
    if (!user?.email) return;
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 1. Fetch user roadmaps
      const roadmapsRes = await fetch("/api/roadmap/all");
      const roadmapsData = await roadmapsRes.json();
      const allCourseTitles = (roadmapsData.docs || []).map(r => r.courseTitle || r.title);

      // 2. Fetch gamification stats
      const statsRes = await fetch(`/api/gamification/stats?userId=${user.email}`);
      const statsData = await statsRes.json();

      // 3. Post to recommendations API
      const recRes = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedCourses: allCourseTitles,
          xp: statsData.xp || 0,
          badges: statsData.badges || [],
        }),
      });

      const recData = await recRes.json();
      if (recData.success) {
        setRecommendations(recData.recommendations || []);
      } else {
        toast.error("Failed to generate recommendations: " + (recData.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      toast.error("An error occurred while loading recommendations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchRecommendations();
    }
  }, [user?.email]);

  const handleGenerateCourse = async (rec, index) => {
    if (generatingId !== null) return;
    setGeneratingId(index);
    setGeneratingStatus("Initializing generation...");

    try {
      const prompt = `Generate a structured learning roadmap for "${rec.title}" 
Level: ${rec.difficulty.toLowerCase()}
Style: Balanced
Daily time: 1–2 hours
Complete in: ${rec.estimated_duration || "2 weeks"}
Generate maximum chapters if 3-months or longer.
Include: chapter titles, descriptions, learning objectives, key topics.
Return valid JSON only.`;

      setGeneratingStatus("Submitting prompt to AI...");
      const res = await fetch("/api/user_prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          difficulty: "balanced",
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.id) {
        toast.error(result.message || "Failed to start course generation.");
        setGeneratingId(null);
        return;
      }

      setGeneratingStatus("Designing syllabus...");
      toast.success("AI is generating your course! Hang tight...");

      // Poll for completion
      const interval = setInterval(async () => {
        try {
          const poll = await fetch(`/api/roadmap/${result.id}`);
          const status = await poll.json();

          if (status.process === "completed") {
            clearInterval(interval);
            setGeneratingStatus("Finished!");
            toast.success("Course generated successfully!");
            await fetchNotifications();
            setGeneratingId(null);
            router.push(`/roadmap/${result.id}`);
          } else if (status.process === "error" || status.process === "unsuitable") {
            clearInterval(interval);
            toast.error(status.message || "Course generation failed.");
            setGeneratingId(null);
          } else {
            // Keep updating status randomly for micro-interactions
            const statuses = ["Structuring chapters...", "Writing lesson outlines...", "Injecting learning objectives...", "Finalizing course layout..."];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            setGeneratingStatus(randomStatus);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);

      // Timeout safety
      setTimeout(() => {
        clearInterval(interval);
        setGeneratingId(prev => {
          if (prev === index) {
            toast.error("Generation timed out. Please check your courses tab in a moment.");
            return null;
          }
          return prev;
        });
      }, 120000);

    } catch (error) {
      console.error("Failed to generate course:", error);
      toast.error("Failed to generate course. Try again.");
      setGeneratingId(null);
    }
  };

  const handleRefreshClick = () => {
    if (refreshing || loading || generatingId !== null) return;
    fetchRecommendations(true);
  };

  if (loading) {
    return (
      <Card className="min-w-0 border-blue-500/5 bg-card/40 backdrop-blur-sm shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="border-border/40 bg-background/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-20 rounded" />
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                  <Skeleton className="h-6 w-full rounded" />
                  <Skeleton className="h-12 w-full rounded" />
                  <Skeleton className="h-8 w-full rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null; // Return nothing if no recommendations generated
  }

  return (
    <Card className="min-w-0 border-blue-500/10 bg-card/40 backdrop-blur-md shadow-lg overflow-hidden relative group">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/10 transition-colors duration-500" />
      
      <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl flex items-center gap-2 font-bold tracking-tight">
            <div className="bg-blue-500/10 p-1.5 rounded-lg text-blue-600 dark:text-blue-400">
              <Brain className="h-5 w-5 animate-pulse" />
            </div>
            AI Recommendations
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            Tailored suggestions based on your learning history, XP level, and achievements
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefreshClick}
          disabled={refreshing || generatingId !== null}
          className="h-9 w-9 rounded-xl hover:bg-blue-500/5 border-border/50 hover:border-blue-500/30 transition-all duration-300"
          title="Refresh recommendations"
        >
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${refreshing ? "animate-spin text-blue-500" : ""}`} />
        </Button>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {recommendations.map((rec, index) => {
              const isGenerating = generatingId === index;
              return (
                <motion.div
                  key={rec.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="h-full"
                >
                  <Card className="group/card h-full flex flex-col justify-between border-blue-500/5 hover:border-blue-500/30 bg-background/60 dark:bg-background/40 hover:bg-background dark:hover:bg-background/80 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    
                    {/* Inline Generation Loader Overlay */}
                    {isGenerating && (
                      <div className="absolute inset-0 bg-background/90 backdrop-blur-xs z-20 flex flex-col items-center justify-center p-4 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                        <p className="text-sm font-semibold text-foreground">{generatingStatus}</p>
                        <p className="text-xs text-muted-foreground mt-1">This will take a moment...</p>
                      </div>
                    )}

                    <div className="p-5 space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={getDifficultyColor(rec.difficulty)}>
                          {rec.difficulty}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 text-blue-500/60" />
                          <span>{rec.estimated_duration || "2 weeks"}</span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-foreground leading-snug group-hover/card:text-blue-500 transition-colors duration-300">
                          {rec.title}
                        </h3>
                        <p className="text-xs text-muted-foreground/80 leading-relaxed font-normal">
                          {rec.reason}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="p-5 pt-0 mt-auto">
                      <Button
                        onClick={() => handleGenerateCourse(rec, index)}
                        disabled={generatingId !== null}
                        className="w-full rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs py-2 shadow-md hover:shadow-lg transition-all duration-300 gap-1.5"
                      >
                        Generate Course
                        <ArrowRight className="h-3 w-3 group-hover/card:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
