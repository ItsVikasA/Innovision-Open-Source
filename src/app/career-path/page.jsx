"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  BarChart3,
  Briefcase,
  GraduationCap,
  Lightbulb,
  RefreshCw,
  Flame,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const DEMAND_COLORS = {
  High: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const LEVEL_COLORS = {
  Beginner: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Intermediate: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Advanced: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

function ProgressRing({ percentage, size = 80, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (pct) => {
    if (pct >= 75) return "text-green-500";
    if (pct >= 50) return "text-blue-500";
    if (pct >= 25) return "text-yellow-500";
    return "text-red-400";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${getColor(percentage)}`}
        />
      </svg>
      <span className="absolute text-sm font-bold">{percentage}%</span>
    </div>
  );
}

function ProgressBar({ value, className = "" }) {
  const getColor = (pct) => {
    if (pct >= 75) return "bg-green-500";
    if (pct >= 50) return "bg-blue-500";
    if (pct >= 25) return "bg-yellow-500";
    return "bg-red-400";
  };

  return (
    <div className={`h-2 w-full rounded-full bg-muted/30 ${className}`}>
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${getColor(value)}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function CareerPathCard({ path, index }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const handleGenerateRoadmap = (skill) => {
    const prompt = encodeURIComponent(skill);
    router.push(`/generate?topic=${prompt}`);
  };

  return (
    <Card className="overflow-hidden border-border/50 transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="text-xs font-mono">
                #{index + 1}
              </Badge>
              <Badge className={`text-xs ${LEVEL_COLORS[path.level] || ""}`}>
                {path.level}
              </Badge>
              <Badge className={`text-xs ${DEMAND_COLORS[path.demandLevel] || ""}`}>
                <Flame className="h-3 w-3 mr-1" />
                {path.demandLevel} Demand
              </Badge>
            </div>
            <CardTitle className="text-xl">{path.title}</CardTitle>
            <CardDescription className="mt-1">{path.description}</CardDescription>
          </div>
          <ProgressRing percentage={path.matchPercentage} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{path.estimatedTimeToComplete}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 shrink-0" />
            <span>{path.salaryRange}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4 shrink-0" />
            <span>
              {path.coveredSkills?.length || 0}/
              {(path.coveredSkills?.length || 0) + (path.missingSkills?.length || 0)} skills
            </span>
          </div>
        </div>

        <ProgressBar value={path.matchPercentage} />

        {/* Skills sections */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Covered Skills */}
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Skills You Have
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {path.coveredSkills?.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs bg-green-100/50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Missing Skills */}
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Skills to Learn
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {path.missingSkills?.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => handleGenerateRoadmap(skill)}
                  title={`Generate a course for "${skill}"`}
                >
                  {skill}
                  <Sparkles className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Expandable next steps */}
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {expanded ? "Hide" : "Show"} Next Steps ({path.nextSteps?.length || 0})
          </button>

          {expanded && (
            <ul className="mt-2 space-y-2">
              {path.nextSteps?.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <ArrowRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  {step}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Generate roadmap button for top missing skill */}
        {path.missingSkills?.length > 0 && (
          <Button
            onClick={() => handleGenerateRoadmap(path.missingSkills[0])}
            className="w-full"
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Course: {path.missingSkills[0]}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisSummary({ analysis }) {
  if (!analysis) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Personalized Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{analysis.recommendation}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Your Strengths
            </h4>
            <ul className="space-y-1">
              {analysis.strengths?.map((s, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-green-500 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Areas to Improve
            </h4>
            <ul className="space-y-1">
              {analysis.gaps?.map((g, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-orange-500 shrink-0" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsOverview({ summary }) {
  if (!summary) return null;

  const overallProgress =
    summary.totalChapters > 0
      ? Math.round((summary.totalChaptersCompleted / summary.totalChapters) * 100)
      : 0;

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      <Card className="text-center">
        <CardContent className="pt-4 pb-3">
          <GraduationCap className="h-6 w-6 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{summary.completedCourses}</p>
          <p className="text-xs text-muted-foreground">Completed</p>
        </CardContent>
      </Card>
      <Card className="text-center">
        <CardContent className="pt-4 pb-3">
          <BarChart3 className="h-6 w-6 mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold">{summary.inProgressCourses}</p>
          <p className="text-xs text-muted-foreground">In Progress</p>
        </CardContent>
      </Card>
      <Card className="text-center">
        <CardContent className="pt-4 pb-3">
          <Target className="h-6 w-6 mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold">{summary.totalChaptersCompleted}</p>
          <p className="text-xs text-muted-foreground">Chapters Done</p>
        </CardContent>
      </Card>
      <Card className="text-center">
        <CardContent className="pt-4 pb-3">
          <TrendingUp className="h-6 w-6 mx-auto mb-1 text-orange-500" />
          <p className="text-2xl font-bold">{overallProgress}%</p>
          <p className="text-xs text-muted-foreground">Overall Progress</p>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="text-center">
            <CardContent className="pt-4 pb-3">
              <Skeleton className="h-6 w-6 mx-auto mb-2 rounded-full" />
              <Skeleton className="h-8 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function CareerPathPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [careerData, setCareerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const analyzeCareerPaths = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/career-path", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to analyze career paths");
      }
      const data = await res.json();
      setCareerData(data);
      setHasAnalyzed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Compass className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Career Path Architect</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          AI-powered career analysis based on your completed courses. Discover which
          roles you&apos;re ready for, identify skill gaps, and generate targeted
          learning roadmaps.
        </p>
      </div>

      {/* Analyze / Re-analyze button */}
      {!loading && (
        <div className="flex justify-center">
          <Button
            onClick={analyzeCareerPaths}
            size="lg"
            className="gap-2"
            disabled={loading}
          >
            {hasAnalyzed ? (
              <>
                <RefreshCw className="h-4 w-4" />
                Re-analyze Career Paths
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze My Career Paths
              </>
            )}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Analyzing your courses and mapping career paths...
            </p>
          </div>
          <LoadingSkeleton />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {hasAnalyzed && careerData?.careerPaths?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Career Paths Yet</h3>
            <p className="text-sm text-muted-foreground">
              {careerData.message ||
                "Complete some courses first to get AI-powered career suggestions."}
            </p>
            <Link href="/generate">
              <Button variant="outline" className="mt-2">
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Your First Course
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {hasAnalyzed && careerData && careerData.careerPaths?.length > 0 && (
        <>
          <StatsOverview summary={careerData.summary} />
          <AnalysisSummary analysis={careerData.overallAnalysis} />

          <div className="space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Suggested Career Paths
            </h2>
            <p className="text-sm text-muted-foreground">
              Click any missing skill badge to generate a targeted learning course.
            </p>
          </div>

          <div className="space-y-4">
            {careerData.careerPaths.map((path, index) => (
              <CareerPathCard key={index} path={path} index={index} />
            ))}
          </div>
        </>
      )}

      {/* Info section before first analysis */}
      {!hasAnalyzed && !loading && (
        <div className="grid gap-4 sm:grid-cols-3 mt-8">
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <Target className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-medium">Skill Analysis</h3>
              <p className="text-xs text-muted-foreground">
                AI analyzes your completed courses to identify your current skills and knowledge areas.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <Compass className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-medium">Career Matching</h3>
              <p className="text-xs text-muted-foreground">
                Get matched to real career paths with progress percentages showing how close you are.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-primary" />
              <h3 className="font-medium">Roadmap Generation</h3>
              <p className="text-xs text-muted-foreground">
                One-click generation of new courses to fill skill gaps and accelerate your career.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
