/**
 * Calculate estimated time to complete a course
 * @param {number} chapterCount - Number of chapters in the course
 * @param {string} difficulty - Course difficulty level (fast, balanced, in-depth)
 * @returns {string} Human-readable time estimate (e.g., "2-3 hours", "1-2 days")
 */
export function calculateEstimatedTime(chapterCount, difficulty = "balanced") {
  if (!chapterCount || chapterCount === 0) return "~30 mins";

  // Base time per chapter in minutes
  const timePerChapter = {
    fast: 15, // Fast-paced: 15 mins per chapter
    balanced: 20, // Balanced: 20 mins per chapter
    "in-depth": 30, // In-depth: 30 mins per chapter
  };

  const minutesPerChapter = timePerChapter[difficulty] || timePerChapter.balanced;
  const totalMinutes = chapterCount * minutesPerChapter;

  return formatTime(totalMinutes);
}

/**
 * Format minutes into human-readable time
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time string
 */
export function formatTime(minutes) {
  if (minutes < 60) {
    return `~${minutes} mins`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 8) {
    // Less than 8 hours - show in hours
    if (remainingMinutes === 0) {
      return `~${hours} ${hours === 1 ? "hour" : "hours"}`;
    }
    const minHours = hours;
    const maxHours = remainingMinutes > 30 ? hours + 1 : hours;
    return minHours === maxHours ? `~${hours} hours` : `${minHours}-${maxHours} hours`;
  }

  // More than 8 hours - show in days
  const days = Math.ceil(hours / 4); // Assuming 4 hours of study per day
  if (days === 1) {
    return "~1 day";
  }
  if (days < 7) {
    return `${days - 1}-${days} days`;
  }
  if (days < 30) {
    const weeks = Math.ceil(days / 7);
    return weeks === 1 ? "~1 week" : `${weeks - 1}-${weeks} weeks`;
  }

  const months = Math.ceil(days / 30);
  return months === 1 ? "~1 month" : `${months - 1}-${months} months`;
}

/**
 * Get time estimate with icon color
 * @param {number} chapterCount - Number of chapters
 * @param {string} difficulty - Course difficulty
 * @returns {object} { time: string, color: string }
 */
export function getTimeEstimateWithColor(chapterCount, difficulty = "balanced") {
  const time = calculateEstimatedTime(chapterCount, difficulty);

  // Determine color based on time commitment
  let color = "text-green-500"; // Short courses

  if (time.includes("day") || time.includes("week")) {
    color = "text-yellow-500"; // Medium courses
  } else if (time.includes("month")) {
    color = "text-orange-500"; // Long courses
  }

  return { time, color };
}
