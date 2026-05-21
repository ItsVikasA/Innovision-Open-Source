import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Quiz from "./Quiz";
import xpContext from "@/contexts/xp";
import React from "react";

// Mock sound effects
vi.mock("@/hooks/useSoundEffects", () => ({
  useSoundEffects: () => ({
    playHover: vi.fn(),
    playClick: vi.fn(),
    playSuccess: vi.fn(),
    playError: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("Quiz Component", () => {
  const mockTaskArrayOptions = {
    id: "test-quiz-1",
    type: "quiz",
    question: "What is React?",
    options: ["A JS Library", "A Database", "A Styling Framework"],
    answer: "A JS Library",
    explanation: "React is a JS library for building user interfaces.",
  };

  const mockTaskObjectOptions = {
    id: "test-quiz-2",
    type: "quiz",
    question: "What is Vue?",
    options: {
      a: "A JS Framework",
      b: "A Database",
      c: "A Browser",
    },
    answer: "a", // Key format
    explanation: "Vue is a progressive JS framework.",
  };

  const mockContextVal = {
    getXp: vi.fn(),
    combo: 3,
    incrementCombo: vi.fn(),
    resetCombo: vi.fn(),
    getCurrentMultiplier: vi.fn().mockReturnValue(2),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render multiple choice options correctly for array-based options", () => {
    render(
      <xpContext.Provider value={mockContextVal}>
        <Quiz
          task={mockTaskArrayOptions}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    expect(screen.getByText("Multiple choice question")).toBeDefined();
    expect(screen.getByText("What is React?")).toBeDefined();
    expect(screen.getByText("A JS Library")).toBeDefined();
    expect(screen.getByText("A Database")).toBeDefined();
    expect(screen.getByText("A Styling Framework")).toBeDefined();
    
    // Check that combo multiplier shows (since combo = 3 >= 2)
    expect(screen.getByText("(3)")).toBeDefined();
    expect(screen.getByText("2x")).toBeDefined();
  });

  it("should render options correctly for object-based options", () => {
    render(
      <xpContext.Provider value={mockContextVal}>
        <Quiz
          task={mockTaskObjectOptions}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    expect(screen.getByText("What is Vue?")).toBeDefined();
    expect(screen.getByText("A JS Framework")).toBeDefined();
    expect(screen.getByText("A Database")).toBeDefined();
    expect(screen.getByText("A Browser")).toBeDefined();
  });

  it("should handle option selection and show selection styling", () => {
    render(
      <xpContext.Provider value={mockContextVal}>
        <Quiz
          task={mockTaskArrayOptions}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    const optionEl = screen.getByText("A JS Library");
    fireEvent.click(optionEl);

    // Option should have active style classes
    const parentContainer = optionEl.closest("div");
    expect(parentContainer.className).toContain("border-[#8B5CF6]");
  });

  it("should submit answer to api and trigger success flow on correct answer", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ courseCompleted: false }),
    });

    render(
      <xpContext.Provider value={mockContextVal}>
        <Quiz
          task={mockTaskArrayOptions}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    // Select correct option
    fireEvent.click(screen.getByText("A JS Library"));

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          task: mockTaskArrayOptions,
          isCorrect: true,
          roadmap: "test-roadmap",
          chapter: 1,
          userAnswer: "A JS Library",
        }),
      }));

      expect(mockContextVal.incrementCombo).toHaveBeenCalled();
      expect(mockContextVal.getXp).toHaveBeenCalled();
      expect(screen.getByText("Correct!")).toBeDefined();
      expect(screen.getByText(mockTaskArrayOptions.explanation)).toBeDefined();
    });
  });

  it("should submit answer to api and trigger error flow on incorrect answer", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ courseCompleted: false }),
    });

    render(
      <xpContext.Provider value={mockContextVal}>
        <Quiz
          task={mockTaskArrayOptions}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    // Select incorrect option
    fireEvent.click(screen.getByText("A Database"));

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          task: mockTaskArrayOptions,
          isCorrect: false,
          roadmap: "test-roadmap",
          chapter: 1,
          userAnswer: "A Database",
        }),
      }));

      expect(mockContextVal.resetCombo).toHaveBeenCalled();
      expect(mockContextVal.getXp).toHaveBeenCalled();
      expect(screen.getByText("Incorrect!")).toBeDefined();
      expect(screen.getByText(`The correct answer is: ${mockTaskArrayOptions.answer}`)).toBeDefined();
    });
  });
});
