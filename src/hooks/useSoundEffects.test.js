import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock implementation of AudioContext and its sub-nodes
class MockAudioParam {
  constructor(value = 0) {
    this.value = value;
  }
  setValueAtTime = vi.fn().mockReturnThis();
  exponentialRampToValueAtTime = vi.fn().mockReturnThis();
  linearRampToValueAtTime = vi.fn().mockReturnThis();
}

class MockAudioNode {
  connect = vi.fn().mockReturnThis();
  disconnect = vi.fn();
}

class MockOscillatorNode extends MockAudioNode {
  type = "sine";
  frequency = new MockAudioParam(440);
  start = vi.fn();
  stop = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1);
}

class MockAudioContext {
  state = "suspended";
  currentTime = 0;
  destination = {};

  createOscillator() {
    return new MockOscillatorNode();
  }

  createGain() {
    return new MockGainNode();
  }

  suspend = vi.fn().mockImplementation(async () => {
    this.state = "suspended";
  });

  resume = vi.fn().mockImplementation(async () => {
    this.state = "running";
  });
}

describe("useSoundEffects Procedural Audio Hook", () => {
  let mockCtx;
  let useSoundEffects;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("./useSoundEffects");
    useSoundEffects = mod.useSoundEffects;

    vi.useFakeTimers();
    mockCtx = new MockAudioContext();
    window.AudioContext = vi.fn().mockImplementation(function() {
      return mockCtx;
    });
    window.webkitAudioContext = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Reset global state in useSoundEffects module by modifying variables if possible,
    // or we can recreate/reload tests.
  });

  it("should lazily initialize AudioContext on interaction click", () => {
    // Before click, AudioContext constructor not called
    expect(window.AudioContext).not.toHaveBeenCalled();

    // Trigger click on window
    const clickEvent = new Event("click");
    window.dispatchEvent(clickEvent);

    // AudioContext should be initialized
    expect(window.AudioContext).toHaveBeenCalled();
  });

  it("should throttle hover playbacks to avoid audio thread congestion", () => {
    const clickEvent = new Event("click");
    window.dispatchEvent(clickEvent);

    const { playHover } = useSoundEffects();

    const spyCreateOsc = vi.spyOn(mockCtx, "createOscillator");

    playHover();
    expect(spyCreateOsc).toHaveBeenCalledTimes(1);

    // Call again immediately, should be throttled
    playHover();
    expect(spyCreateOsc).toHaveBeenCalledTimes(1);

    // Fast-forward past throttle limit (120ms)
    vi.advanceTimersByTime(200);
    playHover();
    expect(spyCreateOsc).toHaveBeenCalledTimes(2);
  });

  it("should schedule disconnect cleanup for oscillator and gain node to prevent memory leaks", () => {
    const clickEvent = new Event("click");
    window.dispatchEvent(clickEvent);

    const { playClick } = useSoundEffects();

    let createdOsc, createdGain;
    vi.spyOn(mockCtx, "createOscillator").mockImplementation(() => {
      createdOsc = new MockOscillatorNode();
      return createdOsc;
    });
    vi.spyOn(mockCtx, "createGain").mockImplementation(() => {
      createdGain = new MockGainNode();
      return createdGain;
    });

    playClick();

    expect(createdOsc).toBeDefined();
    expect(createdGain).toBeDefined();
    expect(createdOsc.disconnect).not.toHaveBeenCalled();
    expect(createdGain.disconnect).not.toHaveBeenCalled();

    // Fast-forward past cleanup timer (150ms for click)
    vi.advanceTimersByTime(200);

    expect(createdOsc.disconnect).toHaveBeenCalled();
    expect(createdGain.disconnect).toHaveBeenCalled();
  });

  it("should suspend the AudioContext when document is hidden and resume when visible", () => {
    const clickEvent = new Event("click");
    window.dispatchEvent(clickEvent);
    mockCtx.state = "running";

    // Set document.hidden getter
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });

    const visEvent = new Event("visibilitychange");
    document.dispatchEvent(visEvent);

    expect(mockCtx.suspend).toHaveBeenCalled();

    // Make visible again
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(visEvent);

    expect(mockCtx.resume).toHaveBeenCalled();
  });
});
