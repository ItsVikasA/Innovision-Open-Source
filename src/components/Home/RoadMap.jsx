"use client";
import Link from "next/link";
// Added Share and Check icons
import { useEffect, useState, useContext } from "react";
import { CircleCheckIcon, Share2, Check } from "lucide-react"; 
import xpContext from "@/contexts/xp";
import { useAuth } from "@/contexts/auth";

function Roadmap({ roadMap, id }) {
  const [height, setHeight] = useState((roadMap.chapters.length - 1) * 34 * 4);
  const { awardXP } = useContext(xpContext);
  const { user } = useAuth();
  const [viewAwarded, setViewAwarded] = useState(false);
  
  // New state for copy feedback
  const [copied, setCopied] = useState(false);

  // Function to handle link copying
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy link: ", err);
    }
  };

  useEffect(() => {
    function updateHeight() {
      if (window.innerWidth < 640) {
        setHeight((roadMap.chapters.length - 1) * 44 * 4);
      } else {
        setHeight((roadMap.chapters.length - 1) * 34 * 4);
      }
    }
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [roadMap.chapters.length]);

  useEffect(() => {
    if (user && awardXP && !viewAwarded) {
      awardXP("view_course");
      setViewAwarded(true);
    }
  }, [user, awardXP, viewAwarded]);

  return (
    <div className="flex flex-col justify-center max-w-3xl">
      {/* Header section with Share Button */}
      <div className="ml-3 mb-3 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">{roadMap.courseTitle}</h1>
          <p className="text-primary ml-2">{roadMap.courseDescription}</p>
        </div>
        
        {/* NEW SHARE BUTTON */}
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
          title="Share Course"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-500 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-zinc-500" />
              <span className="text-zinc-500">Share</span>
            </>
          )}
        </button>
      </div>

      <div className="relative flex flex-col">
        <div
          className="absolute w-1 top-1 left-7.5 bg-zinc-100 dark:bg-zinc-900"
          style={{ height: `${height}px` }}
        ></div>

        {roadMap.chapters?.map((chapter, index) => (
          <div key={index} className="relative flex ml-5 gap-4 h-32 max-sm:h-44 last:mb-0 sm:mb-2">
            <div className="w-6 h-6 shrink-0 rounded-full border bg-zinc-100 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 flex justify-center items-center">
              {chapter.completed ? <CircleCheckIcon className="text-green-600 dark:text-green-400" /> : ""}
            </div>

            <Link
              href={`/chapter-test/${id}/${index + 1}`}
              className="flex flex-col border h-max max-w-xl w-[85%] rounded-md p-4 hover:border-blue-400 transition-colors"
            >
              <span className="text-secondary-foreground font-semibold">
                {chapter.chapterNumber || index + 1} . {chapter.chapterTitle || chapter.title || `Chapter ${index + 1}`}
              </span>
              <span className="text-secondary-foreground text-sm">
                {chapter.chapterDescription || chapter.description || ""}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Roadmap;