export const QUEST_TEMPLATES = [
  { id: "complete_chapter", title: "Chapter Champion", description: "Complete 1 chapter", target: 1, xpReward: 25, icon: "BookOpen", type: "chapters_completed" },
  { id: "complete_2_chapters", title: "Double Down", description: "Complete 2 chapters", target: 2, xpReward: 50, icon: "BookMarked", type: "chapters_completed" },
  { id: "complete_lesson", title: "Lesson Learner", description: "Complete 3 lessons", target: 3, xpReward: 20, icon: "GraduationCap", type: "lessons_completed" },
  { id: "earn_50_xp", title: "XP Hunter", description: "Earn 50 XP today", target: 50, xpReward: 15, icon: "Sparkles", type: "xp_earned" },
  { id: "earn_100_xp", title: "XP Master", description: "Earn 100 XP today", target: 100, xpReward: 30, icon: "Zap", type: "xp_earned" },
  { id: "earn_200_xp", title: "XP Legend", description: "Earn 200 XP today", target: 200, xpReward: 50, icon: "Crown", type: "xp_earned" },
  { id: "perfect_quiz", title: "Perfect Score", description: "Get 100% on a quiz", target: 1, xpReward: 35, icon: "Trophy", type: "perfect_quizzes" },
  { id: "complete_quiz", title: "Quiz Taker", description: "Complete 2 quizzes", target: 2, xpReward: 20, icon: "ClipboardCheck", type: "quizzes_completed" },
  { id: "login_streak", title: "Consistent Learner", description: "Maintain your streak", target: 1, xpReward: 10, icon: "Flame", type: "streak_maintained" },
  { id: "view_course", title: "Explorer", description: "View 2 different courses", target: 2, xpReward: 15, icon: "Compass", type: "courses_viewed" },
  { id: "generate_course", title: "Creator", description: "Generate a new course", target: 1, xpReward: 40, icon: "Wand2", type: "courses_generated" },
  { id: "study_15min", title: "Quick Study", description: "Study for 15 minutes", target: 15, xpReward: 20, icon: "Clock", type: "study_minutes" },
  { id: "study_30min", title: "Dedicated Learner", description: "Study for 30 minutes", target: 30, xpReward: 40, icon: "Timer", type: "study_minutes" },
];

export function getDailyQuests(dateStr) {
  const seed = dateStr.split("-").reduce((acc, num) => acc + parseInt(num, 10), 0);
  const shuffled = [...QUEST_TEMPLATES].sort((a, b) => {
    const hashA = (seed * a.id.length) % 100;
    const hashB = (seed * b.id.length) % 100;
    return hashA - hashB;
  });

  const types = new Set();
  const selected = [];

  for (const quest of shuffled) {
    if (!types.has(quest.type) && selected.length < 3) {
      types.add(quest.type);
      selected.push(quest);
    }
  }

  return selected;
}

export function buildDailyQuestState(dateStr) {
  return {
    date: dateStr,
    quests: getDailyQuests(dateStr).map((quest) => ({
      ...quest,
      progress: 0,
      completed: false,
      claimed: false,
    })),
    totalXPEarned: 0,
  };
}

export function mergeDailyQuestProgress(dateStr, userProgress = {}) {
  const questTemplates = getDailyQuests(dateStr);
  const quests = questTemplates.map((template, idx) => {
    const saved = userProgress.quests?.find((quest) => quest.id === template.id) || userProgress.quests?.[idx];

    return {
      ...template,
      progress: saved?.progress || 0,
      completed: saved?.completed || false,
      claimed: saved?.claimed || false,
    };
  });

  return {
    date: dateStr,
    quests,
    totalXPEarned: userProgress.totalXPEarned || 0,
  };
}
