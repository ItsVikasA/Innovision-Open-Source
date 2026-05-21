"use client";

/** @type {AudioContext|null} */
let audioCtx = null;

// Throttling for hover plucks to prevent audio congestion
/** @type {number} */
let lastHoverTime = 0;
const HOVER_THROTTLE_MS = 120;

/**
 * Returns the global AudioContext instance, initializing it if necessary.
 * Also handles resuming the context if it was suspended due to autoplay policies.
 * 
 * @returns {AudioContext|null} The active AudioContext instance or null.
 */
function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Try to resume if suspended (due to autoplay policies)
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

if (typeof window !== "undefined") {
  /**
   * Initializes the audio context upon the first user interaction.
   * Helps bypass browser autoplay restrictions.
   */
  const handleInteraction = () => {
    getAudioContext();
    window.removeEventListener("click", handleInteraction);
    window.removeEventListener("keydown", handleInteraction);
  };
  window.addEventListener("click", handleInteraction, { passive: true });
  window.addEventListener("keydown", handleInteraction, { passive: true });

  // Suspend/resume on document visibilitychange to save system resources and prevent memory leaks
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (audioCtx && audioCtx.state === "running") {
        audioCtx.suspend().catch(() => {});
      }
    } else {
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {});
      }
    }
  });
}

/**
 * Safely disconnects the oscillator and gain nodes after a delay to ensure
 * clean memory disposal and prevent Web Audio API graph congestion.
 * 
 * @param {OscillatorNode} osc - The oscillator node to disconnect.
 * @param {GainNode} gain - The gain node to disconnect.
 * @param {number} delayMs - The delay in milliseconds before disconnection.
 */
function scheduleCleanup(osc, gain, delayMs) {
  setTimeout(() => {
    try {
      osc.disconnect();
      gain.disconnect();
    } catch (err) {
      // Safe to ignore if context is closed or nodes are already disconnected
    }
  }, delayMs);
}

/**
 * Custom React hook providing procedural synthesizers for immersive space UI interaction sounds.
 * Generates plucks, sweeps, and chimes procedurally using the browser's Web Audio API.
 * 
 * @returns {{
 *   playHover: () => void,
 *   playClick: () => void,
 *   playSuccess: () => void,
 *   playError: () => void,
 *   playLevelUp: () => void
 * }} An object containing sound synthesis trigger functions.
 */
export function useSoundEffects() {
  /**
   * Triggers a subtle high-frequency synthesized pluck sound for hover states.
   * Throttled to prevent audio congestion from rapid hover triggers.
   */
  const playHover = () => {
    const now = Date.now();
    if (now - lastHoverTime < HOVER_THROTTLE_MS) return;
    lastHoverTime = now;

    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);

      scheduleCleanup(osc, gain, 200);
    } catch (e) {
      // Fail silently to avoid interrupting user flows
    }
  };

  /**
   * Triggers a fast low-frequency triangle sweep for click interactions.
   */
  const playClick = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);

      scheduleCleanup(osc, gain, 150);
    } catch (e) {
      // Fail silently
    }
  };

  /**
   * Triggers a premium four-note rising major chord arpeggio for task success states.
   */
  const playSuccess = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const now = ctx.currentTime;
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + index * 0.08);

        gain.gain.setValueAtTime(0, now + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.04, now + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.08);
        osc.stop(now + index * 0.08 + 0.4);

        scheduleCleanup(osc, gain, (index * 80) + 500);
      });
    } catch (e) {
      // Fail silently
    }
  };

  /**
   * Triggers a descending sawtooth frequency sweep for incorrect or error states.
   */
  const playError = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);

      scheduleCleanup(osc, gain, 350);
    } catch (e) {
      // Fail silently
    }
  };

  /**
   * Triggers an ascending 6-note grand arpeggio celebration fanfare for level-ups.
   */
  const playLevelUp = () => {
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [261.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, G4, C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + index * 0.1);

        gain.gain.setValueAtTime(0, now + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.04, now + index * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.1 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.6);

        scheduleCleanup(osc, gain, (index * 100) + 800);
      });
    } catch (e) {
      // Fail silently
    }
  };

  return {
    playHover,
    playClick,
    playSuccess,
    playError,
    playLevelUp,
  };
}
