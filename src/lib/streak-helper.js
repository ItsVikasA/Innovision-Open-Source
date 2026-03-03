/**
 * Centralized streak calculation helper.
 *
 * All streak-related logic lives here so that the gamification API
 * endpoints share a single, consistent implementation instead of
 * duplicating the day-diff maths in both GET and POST handlers.
 *
 * @see https://github.com/ItsVikasA/Innovision-Open-Source/issues/176
 */

/**
 * Calculate the updated streak value based on the user's last active date.
 *
 * @param {Object}  stats              – The current gamification document data.
 * @param {number}  [stats.streak]     – Current streak count.
 * @param {string}  [stats.lastActive] – ISO-8601 timestamp of last activity.
 * @param {Object}  [options]          – Optional flags.
 * @param {boolean} [options.isLearningAction=false] – Whether the caller is a
 *        learning action (POST). When false the streak is still evaluated but
 *        only a reset (daysDiff > 1) or zero-fix is applied – the streak is
 *        never *incremented* by a non-learning event (e.g. a daily check-in
 *        alone only ensures the streak doesn't sit at zero).
 * @returns {{ streak: number, lastActive: string, changed: boolean }}
 *          `changed` is true when the caller should persist the update.
 */
export function computeStreakUpdate(stats, { isLearningAction = false } = {}) {
  const now = new Date();
  const currentStreak = stats.streak ?? 0;
  const lastActiveRaw = stats.lastActive ? new Date(stats.lastActive) : null;

  // Normalise dates to midnight for day-diff comparison
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (!lastActiveRaw) {
    // First-ever activity – start at 1
    return { streak: 1, lastActive: now.toISOString(), changed: true };
  }

  const lastActiveDay = new Date(lastActiveRaw);
  lastActiveDay.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today - lastActiveDay) / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Same calendar day – ensure streak is at least 1
    if (currentStreak === 0) {
      return { streak: 1, lastActive: now.toISOString(), changed: true };
    }
    // No change required
    return { streak: currentStreak, lastActive: stats.lastActive, changed: false };
  }

  if (daysDiff === 1) {
    // Consecutive day — only increment on a *learning action* or check-in
    if (isLearningAction) {
      return {
        streak: currentStreak + 1,
        lastActive: now.toISOString(),
        changed: true,
      };
    }
    // For a plain check-in (GET / daily visit), touch lastActive so we don't
    // lose the window, but still let the actual learning POST do the increment.
    return { streak: currentStreak, lastActive: stats.lastActive, changed: false };
  }

  // daysDiff > 1 – streak broken, reset to 1
  return { streak: 1, lastActive: now.toISOString(), changed: true };
}

/**
 * Fix a zero-streak edge case.  If the streak is 0 it should be 1 because
 * the user is actively using the platform right now.
 *
 * @param {Object} stats – Current gamification document data.
 * @returns {{ streak: number, lastActive: string, changed: boolean }}
 */
export function fixZeroStreak(stats) {
  if ((stats.streak ?? 0) === 0) {
    return { streak: 1, lastActive: new Date().toISOString(), changed: true };
  }
  return {
    streak: stats.streak,
    lastActive: stats.lastActive,
    changed: false,
  };
}
