"use client";

import { useState, useMemo } from "react";
import { useStudyTime } from "@/contexts/studyTime";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Clock, Flame, Target, TrendingUp, Download, RefreshCw, BarChart2, Calendar, FileSpreadsheet, FileText, ArrowRight
} from "lucide-react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import jsPDF from "jspdf";
import { PageBackground, GridPattern, PageHeader, ScrollReveal } from "@/components/ui/PageWrapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function StudyAnalyticsDashboard() {
  const { studyGoal, dailyLogs, loading, updateGoal, resetStudyTime } = useStudyTime();
  const [goalValue, setGoalValue] = useState([studyGoal]);
  const [activeTab, setActiveTab] = useState("week");

  // Keep slider state in sync with context studyGoal
  useState(() => {
    setGoalValue([studyGoal]);
  }, [studyGoal]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Format seconds to hh:mm:ss or mm:ss
  const formatDuration = (seconds) => {
    if (!seconds) return "0m";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDurationLong = (seconds) => {
    if (!seconds) return "0 minutes";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = "";
    if (hrs > 0) result += `${hrs} hour${hrs > 1 ? "s" : ""} `;
    if (mins > 0) result += `${mins} minute${mins > 1 ? "s" : ""} `;
    if (secs > 0 && hrs === 0) result += `${secs} second${secs > 1 ? "s" : ""}`;
    return result.trim() || "0 minutes";
  };

  // 1. Calculate active statistics
  const stats = useMemo(() => {
    const todayTime = dailyLogs[todayStr] || 0;
    
    // Sort log dates
    const logDates = Object.keys(dailyLogs).sort();
    
    let totalSeconds = 0;
    let bestDayDate = "N/A";
    let maxSeconds = 0;

    logDates.forEach((date) => {
      const sec = dailyLogs[date] || 0;
      totalSeconds += sec;
      if (sec > maxSeconds) {
        maxSeconds = sec;
        bestDayDate = date;
      }
    });

    const activeDaysCount = logDates.filter(d => dailyLogs[d] > 0).length || 1;
    const averageSeconds = Math.round(totalSeconds / activeDaysCount);

    // Calculate dynamic study streak (consecutive days of study >= 1 min)
    let currentStreak = 0;
    const checkDate = new Date();
    
    // Check today first
    const todaySec = dailyLogs[checkDate.toISOString().split("T")[0]] || 0;
    if (todaySec >= 60) {
      currentStreak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
      while (true) {
        const dateKey = checkDate.toISOString().split("T")[0];
        if ((dailyLogs[dateKey] || 0) >= 60) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      // If didn't study today, check if studied yesterday. If so, streak is still active.
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterdaySec = dailyLogs[checkDate.toISOString().split("T")[0]] || 0;
      if (yesterdaySec >= 60) {
        currentStreak = 1;
        checkDate.setDate(checkDate.getDate() - 1);
        while (true) {
          const dateKey = checkDate.toISOString().split("T")[0];
          if ((dailyLogs[dateKey] || 0) >= 60) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    return {
      todayTime,
      totalSeconds,
      averageSeconds,
      bestDay: bestDayDate !== "N/A" ? new Date(bestDayDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
      bestDaySeconds: maxSeconds,
      streak: currentStreak
    };
  }, [dailyLogs, todayStr]);

  // 2. Prepare charts data
  const weeklyChartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    // Get last 7 days starting from Monday or just past 7 days. Mon-Sun fits nicely
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const mins = Math.round((dailyLogs[dateStr] || 0) / 60);
      data.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        minutes: mins,
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      });
    }
    return data;
  }, [dailyLogs]);

  const monthlyChartData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const mins = Math.round((dailyLogs[dateStr] || 0) / 60);
      data.push({
        dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        minutes: mins
      });
    }
    return data;
  }, [dailyLogs]);

  // Heatmap values format
  const heatmapData = useMemo(() => {
    const activityMap = {};
    const today = new Date();
    
    // Last 365 days
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      activityMap[dateStr] = 0;
    }

    Object.entries(dailyLogs).forEach(([date, sec]) => {
      if (activityMap[date] !== undefined) {
        activityMap[date] = Math.round(sec / 60); // minutes
      }
    });

    return Object.entries(activityMap).map(([date, count]) => ({
      date,
      count
    }));
  }, [dailyLogs]);

  const getHeatmapColorClass = (value) => {
    if (!value || value.count === 0) return "color-empty";
    if (value.count < 15) return "color-scale-1"; // < 15 mins
    if (value.count < 30) return "color-scale-2"; // < 30 mins
    if (value.count < 60) return "color-scale-3"; // < 60 mins
    return "color-scale-4"; // >= 60 mins
  };

  const heatmapStartDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, []);

  // CSV Exporter
  const exportToCSV = () => {
    const headers = ["Date", "Study Time (Seconds)", "Study Time (Minutes)", "Study Time (Formatted)"];
    const rows = Object.entries(dailyLogs).sort((a, b) => b[0].localeCompare(a[0])).map(([date, sec]) => [
      date,
      sec,
      Math.round(sec / 60),
      formatDuration(sec)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `study_analytics_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Exporter using jsPDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const primaryColor = "#3B82F6";
    const textColor = "#1F2937";

    // Border
    doc.setDrawColor(229, 231, 235);
    doc.rect(5, 5, 200, 287);

    // Title / Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(59, 130, 246);
    doc.text("InnoVision", 20, 25);
    doc.setFontSize(16);
    doc.setTextColor(107, 114, 128);
    doc.text("Study Time Analytics Report", 20, 33);
    doc.setLineWidth(0.5);
    doc.setDrawColor(209, 213, 219);
    doc.line(20, 38, 190, 38);

    // Summary Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(31, 41, 55);
    doc.text("Performance Summary", 20, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Generated On: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 130, 50);

    // Info Table
    doc.setFillColor(243, 244, 246);
    doc.rect(20, 55, 170, 60, "F");

    doc.setFont("helvetica", "bold");
    doc.text("Metric", 25, 65);
    doc.text("Value", 120, 65);
    doc.line(20, 70, 190, 70);

    doc.setFont("helvetica", "normal");
    doc.text("Current Daily Goal", 25, 77);
    doc.text(`${studyGoal} minutes`, 120, 77);

    doc.text("Study Time Completed Today", 25, 84);
    doc.text(formatDurationLong(stats.todayTime), 120, 84);

    doc.text("Cumulative Study Duration", 25, 91);
    doc.text(formatDurationLong(stats.totalSeconds), 120, 91);

    doc.text("Daily Average Study Session", 25, 98);
    doc.text(formatDurationLong(stats.averageSeconds), 120, 98);

    doc.text("Current Study Streak", 25, 105);
    doc.text(`${stats.streak} day${stats.streak === 1 ? "" : "s"}`, 120, 105);

    doc.text("Best Day Record", 25, 112);
    doc.text(`${stats.bestDay} (${formatDurationLong(stats.bestDaySeconds)})`, 120, 112);

    // Section 2: Last 7 Days logs
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Recent Activity Log (Last 7 Days)", 20, 130);

    let yOffset = 140;
    doc.setFillColor(249, 250, 251);
    doc.rect(20, 133, 170, 55, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Date", 25, 138);
    doc.text("Study Duration", 120, 138);
    doc.line(20, 142, 190, 142);
    
    doc.setFont("helvetica", "normal");
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const nameStr = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
      const sec = dailyLogs[dateStr] || 0;
      doc.text(nameStr, 25, yOffset + 8);
      doc.text(formatDurationLong(sec) || "0 minutes", 120, yOffset + 8);
      yOffset += 7;
    }

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text("Keep up the great work! Consistent learning leads to mastery.", 20, 275);
    doc.text("Powered by InnoVision Analytics Engine", 130, 275);

    doc.save(`innovision_study_report_${Date.now()}.pdf`);
  };

  const todayProgressPercent = Math.min(100, Math.round(((stats.todayTime / 60) / studyGoal) * 100)) || 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="text-muted-foreground animate-pulse">Loading study analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/40 backdrop-blur-md border-border/50 transition-all hover:scale-102 duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Study Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.todayTime)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Goal: {studyGoal}m ({todayProgressPercent}% met)
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50 transition-all hover:scale-102 duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.streak} Days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Consecutive days studying
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50 transition-all hover:scale-102 duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Daily Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(stats.averageSeconds)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              On active study days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50 transition-all hover:scale-102 duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Session Record</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{formatDuration(stats.bestDaySeconds)}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              Achieved on {stats.bestDay}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Goal & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Goal Settings Panel */}
        <Card className="lg:col-span-1 bg-card/40 backdrop-blur-md border-border/50 h-full flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Daily Study Goal
              </CardTitle>
              <CardDescription>Adjust your daily target to maintain consistency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-muted/20 relative overflow-hidden">
                <div className="relative z-10 text-center">
                  <span className="text-5xl font-extrabold text-blue-500">{studyGoal}</span>
                  <span className="text-lg text-muted-foreground ml-1">mins</span>
                </div>
                <div className="absolute inset-0 bg-blue-500/5 blur-xl pointer-events-none" />
              </div>

              <div className="space-y-3 mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Set new target</span>
                  <span className="font-medium text-foreground">{goalValue[0]} minutes</span>
                </div>
                <Slider
                  value={goalValue}
                  onValueChange={setGoalValue}
                  min={10}
                  max={180}
                  step={5}
                  className="w-full py-2"
                />
                <Button 
                  onClick={() => updateGoal(goalValue[0])}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20"
                >
                  Save Goal Target
                </Button>
              </div>
            </CardContent>
          </div>

          <CardContent className="pt-0 border-t border-border/40 mt-4">
            <div className="py-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Goal Motivation</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scientific research shows that setting small, bite-sized daily study targets (like 25-45 minutes) helps trigger long-term neuroplastic memory retention and blocks cognitive fatigue. Keep it up!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Charts Panel */}
        <Card className="lg:col-span-2 bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-500" />
                Study Patterns
              </CardTitle>
              <CardDescription>Visualize your commitment and learning frequency</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-3 w-full sm:w-[240px]">
                <TabsTrigger value="week">Weekly</TabsTrigger>
                <TabsTrigger value="month">Monthly</TabsTrigger>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="h-[320px] pb-4">
            {activeTab === "week" && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" unit="m" />
                  <Tooltip
                    cursor={{ fill: "rgba(156, 163, 175, 0.05)" }}
                    contentStyle={{
                      background: "rgba(17, 24, 39, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                    labelFormatter={(value, name) => {
                      const item = weeklyChartData.find(e => e.day === value);
                      return item ? `${item.date} (${value})` : value;
                    }}
                  />
                  <Bar dataKey="minutes" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} name="Minutes Studied">
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === "month" && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.15)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" unit="m" />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(17, 24, 39, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      color: "#fff"
                    }}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#areaBlueGradient)" name="Minutes Studied">
                    <defs>
                      <linearGradient id="areaBlueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeTab === "heatmap" && (
              <div className="w-full h-full flex flex-col justify-center">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Study consistency map over the last 365 days
                  </span>
                  <div className="flex items-center gap-1">
                    <span>Less</span>
                    <div className="flex gap-0.5">
                      <div className="w-3.5 h-3.5 rounded-xs bg-muted" />
                      <div className="w-3.5 h-3.5 rounded-xs bg-blue-200 dark:bg-blue-900" />
                      <div className="w-3.5 h-3.5 rounded-xs bg-blue-400 dark:bg-blue-700" />
                      <div className="w-3.5 h-3.5 rounded-xs bg-blue-500 dark:bg-blue-500" />
                      <div className="w-3.5 h-3.5 rounded-xs bg-blue-600 dark:bg-blue-400" />
                    </div>
                    <span>More</span>
                  </div>
                </div>

                <div className="heatmap-container w-full overflow-x-auto overflow-y-hidden pb-1">
                  <CalendarHeatmap
                    startDate={heatmapStartDate}
                    endDate={new Date()}
                    values={heatmapData}
                    classForValue={getHeatmapColorClass}
                    showWeekdayLabels
                    titleForValue={(value) => {
                      if (!value || !value.date) return "No activity";
                      return `${value.count} minutes studied on ${value.date}`;
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exporters and Utilities */}
      <Card className="bg-card/40 backdrop-blur-md border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4.5 w-4.5 text-blue-500" />
            Tools and Actions
          </CardTitle>
          <CardDescription>Export your analytics or clean your history</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button onClick={exportToCSV} variant="outline" className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <FileSpreadsheet className="h-4 w-4 text-green-500" />
              Export CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="flex items-center gap-2 w-full sm:w-auto justify-center">
              <FileText className="h-4 w-4 text-red-500" />
              Download PDF Report
            </Button>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto flex items-center gap-2 justify-center">
                <RefreshCw className="h-4 w-4" />
                Reset Study History
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset study time analytics?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is permanent and cannot be undone. All your daily study time logs will be deleted. Your daily goal setting will be retained.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetStudyTime} className="bg-destructive text-white hover:bg-destructive/95">
                  Confirm Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <style jsx global>{`
        .heatmap-container .react-calendar-heatmap {
          font-size: 10px;
          width: 100%;
          min-width: 720px;
        }
        .heatmap-container .react-calendar-heatmap text {
          fill: var(--muted-foreground);
          font-size: 8px;
        }
        .heatmap-container .react-calendar-heatmap svg {
          width: 100%;
          height: auto;
        }
        .heatmap-container .react-calendar-heatmap rect {
          rx: 2;
        }
        .heatmap-container .color-empty {
          fill: var(--muted);
        }
        .heatmap-container .color-scale-1 {
          fill: #bfdbfe;
        }
        .heatmap-container .color-scale-2 {
          fill: #60a5fa;
        }
        .heatmap-container .color-scale-3 {
          fill: #3b82f6;
        }
        .heatmap-container .color-scale-4 {
          fill: #1d4ed8;
        }
        .dark .heatmap-container .color-scale-1 {
          fill: #1e3a8a;
        }
        .dark .heatmap-container .color-scale-2 {
          fill: #1e40af;
        }
        .dark .heatmap-container .color-scale-3 {
          fill: #2563eb;
        }
        .dark .heatmap-container .color-scale-4 {
          fill: #60a5fa;
        }
      `}</style>
    </div>
  );
}
