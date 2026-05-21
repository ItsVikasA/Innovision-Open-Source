"use client";
import Link from "next/link";
import { useEffect, useState, useContext, useRef } from "react";
import { CircleCheckIcon, Clock, Copy } from "lucide-react";
import xpContext from "@/contexts/xp";
import { useAuth } from "@/contexts/auth";
import { calculateEstimatedTime } from "@/lib/time-utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { loader } from "@/components/ui/Custom/ToastLoader";
import { useRouter } from "next/navigation";
import ExportCourse from "@/components/export/ExportCourse";
import ShareCourse from "@/components/share/ShareCourse";

/**
 * @typedef {Object} Chapter
 * @property {string} chapterTitle - The title of the chapter
 * @property {string} chapterDescription - Summary of what the chapter covers
 * @property {number} chapterNumber - The 1-based order index of the chapter
 * @property {boolean} completed - Whether the user has completed this chapter's task
 */

/**
 * @typedef {Object} RoadMapData
 * @property {string} courseTitle - The overall course title
 * @property {string} courseDescription - The overall course description
 * @property {string} difficulty - The level of difficulty (e.g. Beginner, Intermediate, Advanced)
 * @property {Chapter[]} chapters - The chronological list of chapters in the course
 * @property {boolean} [isPublic] - Whether this course is shared publicly
 */

/**
 * Roadmap component displays an interactive celestial learning path.
 * Connects chapter cards using a dynamically-updated SVG Bezier curve connector path
 * with neon glow accents. Responsive to resizing and scrolling.
 *
 * @param {Object} props
 * @param {RoadMapData} props.roadMap - The roadmap data object
 * @param {string} props.id - The unique ID of the roadmap
 * @returns {JSX.Element} The rendered Roadmap component
 */
function Roadmap({ roadMap, id }) {
  const [points, setPoints] = useState([]);
  const containerRef = useRef(null);
  const nodesRef = useRef([]);
  nodesRef.current = [];

  const { awardXP } = useContext(xpContext);
  const { user } = useAuth();
  const [viewAwarded, setViewAwarded] = useState(false);
  const { showLoader, hideLoader } = loader();
  const router = useRouter();

  // Calculate estimated time
  const estimatedTime = calculateEstimatedTime(roadMap?.chapters?.length || 0, roadMap?.difficulty || "Beginner");

  useEffect(() => {
    const updatePoints = () => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newPoints = [];
      (roadMap?.chapters || []).forEach((chapter, index) => {
        const node = nodesRef.current[index];
        if (node) {
          const nodeRect = node.getBoundingClientRect();
          newPoints.push({
            x: (nodeRect.left + nodeRect.right) / 2 - containerRect.left,
            y: (nodeRect.top + nodeRect.bottom) / 2 - containerRect.top,
            completed: chapter.completed,
          });
        }
      });
      setPoints(newPoints);
    };

    // Calculate initial positions once mounted/rendered
    const timer = setTimeout(updatePoints, 100);

    const observer = new ResizeObserver(updatePoints);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", updatePoints);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener("resize", updatePoints);
    };
  }, [roadMap?.chapters]);

  // Award XP for viewing the course (only once per session)
  useEffect(() => {
    if (user && awardXP && !viewAwarded) {
      awardXP("view_course");
      setViewAwarded(true);
    }
  }, [user, awardXP, viewAwarded]);

  // Duplicate course handler
  const handleDuplicate = async () => {
    showLoader();
    try {
      const response = await fetch("/api/roadmap/duplicate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roadmapId: id }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Course duplicated successfully!");
        hideLoader();

        // Redirect to the new duplicated course
        setTimeout(() => {
          router.push(`/roadmap/${data.newRoadmapId}`);
        }, 1000);
      } else {
        hideLoader();
        toast.error(data.message || "Failed to duplicate course");
      }
    } catch (error) {
      hideLoader();
      toast.error("An error occurred while duplicating the course");
      console.error("Duplicate error:", error);
    }
  };

  return (
    <div className="flex flex-col justify-center max-w-3xl">
      <div className="ml-3 mb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">{roadMap.courseTitle}</h1>
            <p className="text-primary ml-2">{roadMap.courseDescription}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            <ExportCourse
              courseId={id}
              courseTitle={roadMap.courseTitle}
            />
            <ShareCourse
              courseId={id}
              courseTitle={roadMap.courseTitle}
              userId={user?.email}
              isPublic={roadMap.isPublic || false}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
          </div>
        </div>

        {/* Estimated Time Badge */}
        <div className="flex items-center gap-2 mt-3 ml-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-sm">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{estimatedTime}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {roadMap.chapters.length} {roadMap.chapters.length === 1 ? "chapter" : "chapters"}
          </div>
        </div>
      </div>
      <div ref={containerRef} className="relative flex flex-col mt-6">
        {/* Dynamic Curved SVG Connector Path */}
        {points.length > 1 && (
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
            {points.map((pt, i) => {
              if (i === points.length - 1) return null;
              const nextPt = points[i + 1];
              const dy = nextPt.y - pt.y;
              
              // Draw a smooth wave-like Bezier curve bending slightly to the right to frame nodes
              const controlX1 = pt.x + 35;
              const controlY1 = pt.y + dy * 0.25;
              const controlX2 = nextPt.x + 35;
              const controlY2 = nextPt.y - dy * 0.25;
              const pathData = `M ${pt.x} ${pt.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${nextPt.x} ${nextPt.y}`;
              
              const isCompleted = pt.completed && nextPt.completed;
              const isActive = pt.completed && !nextPt.completed;
              const strokeColor = isCompleted ? "#10B981" : (isActive ? "#5865F2" : "#8B5CF6");
              const strokeWidth = isCompleted ? 3 : (isActive ? 2.5 : 2);
              const strokeDash = isCompleted ? "none" : (isActive ? "4,4" : "6,6");
              const strokeOpacity = isCompleted ? 0.9 : (isActive ? 0.7 : 0.3);
              const glowColor = isCompleted ? "rgba(16, 185, 129, 0.4)" : (isActive ? "rgba(88, 101, 242, 0.2)" : "rgba(139, 92, 246, 0.05)");
              
              return (
                <g key={i}>
                  {/* Neon Glow Outer Shadow */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth * 3}
                    strokeOpacity={0.15}
                    style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
                  />
                  {/* Core Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDash}
                    strokeOpacity={strokeOpacity}
                    className="transition-all duration-300"
                  />
                </g>
              );
            })}
          </svg>
        )}

        {(roadMap?.chapters || []).map((chapter, index) => (
          <div key={index} className="relative flex ml-5 gap-6 h-32 max-sm:h-44 last:mb-0 sm:mb-4">
            {/* Winding Circle Node */}
            <div
              ref={(el) => { if (el) nodesRef.current[index] = el; }}
              className={`w-6 h-6 shrink-0 rounded-full border flex justify-center items-center relative z-10 transition-all duration-300 ${
                chapter.completed
                  ? "bg-green-500/10 border-green-500 text-green-400 neon-glow"
                  : "bg-zinc-900 border-zinc-700 text-zinc-500"
              }`}
            >
              {chapter.completed ? (
                <CircleCheckIcon className="h-4.5 w-4.5 text-green-400" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              )}
            </div>

            {/* Glowing Cyberpunk Card Link */}
            <Link
              href={`/chapter-test/${id}/${index + 1}`}
              className="flex flex-col border border-white/5 bg-white/[0.03] backdrop-blur-xs h-max max-w-xl w-[85%] rounded-lg p-4 hover:border-[#5865F2]/50 hover:bg-[#5865F2]/5 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(88,101,242,0.08)] transition-all duration-300 relative z-10"
            >
              <span className="text-white font-semibold text-sm sm:text-base mb-1 tracking-wide">
                {chapter.chapterNumber || index + 1} . {chapter.chapterTitle || chapter.title || `Chapter ${index + 1}`}
              </span>
              <span className="text-gray-400 text-xs font-light leading-relaxed">
                {chapter.chapterDescription || chapter.description || "Start studying this chapter to unlock achievements."}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Roadmap;
