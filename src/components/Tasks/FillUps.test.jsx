import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FillUps from "./FillUps";
import xpContext from "@/contexts/xp";
import React from "react";

// Mock sound effects
vi.mock("@/hooks/useSoundEffects", () => ({
  useSoundEffects: () => ({
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

describe("FillUps Component", () => {
  const mockTaskCaseInsensitive = {
    id: "test-fillups-1",
    type: "fillup",
    question: "React is a JavaScript ________.",
    acceptableAnswers: ["library", "lib"],
    caseSensitive: false,
    answer: "library",
    explanation: "React is a JavaScript library.",
  };

  const mockTaskCaseSensitive = {
    id: "test-fillups-2",
    type: "fillup",
    question: "Vue is a progressive ________.",
    acceptableAnswers: ["Framework"],
    caseSensitive: true,
    answer: "Framework",
    explanation: "Vue is a progressive Framework.",
  };

  const mockContextVal = {
    getXp: vi.fn(),
    combo: 0,
    incrementCombo: vi.fn(),
    resetCombo: vi.fn(),
    getCurrentMultiplier: vi.fn().mockReturnValue(1),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render fill-in-the-blank question prompt and input", () => {
    render(
      <xpContext.Provider value={mockContextVal}>
        <FillUps
          task={mockTaskCaseInsensitive}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    expect(screen.getByText("Fill in the blank")).toBeDefined();
    expect(screen.getByText("React is a JavaScript ________.")).toBeDefined();
    expect(screen.getByPlaceholderText("Type here...")).toBeDefined();
  });

  it("should update input state when typing", () => {
    render(
      <xpContext.Provider value={mockContextVal}>
        <FillUps
          task={mockTaskCaseInsensitive}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    const input = screen.getByPlaceholderText("Type here...");
    fireEvent.change(input, { target: { value: "library" } });
    expect(input.value).toBe("library");
  });

  it("should evaluate case-insensitive answers correctly", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ courseCompleted: false }),
    });

    render(
      <xpContext.Provider value={mockContextVal}>
        <FillUps
          task={mockTaskCaseInsensitive}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    const input = screen.getByPlaceholderText("Type here...");
    
    // Type with uppercase mixed letters
    fireEvent.change(input, { target: { value: "LiBrArY" } });

    // Click submit
    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          task: mockTaskCaseInsensitive,
          isCorrect: true,
          roadmap: "test-roadmap",
          chapter: 1,
          userAnswer: "LiBrArY",
        }),
      }));
      expect(screen.getByText("Correct!")).toBeDefined();
      expect(mockContextVal.incrementCombo).toHaveBeenCalled();
    });
  });

  it("should evaluate case-sensitive answers correctly", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ courseCompleted: false }),
    });

    // RENDER: Case Sensitive Task
    const { rerender } = render(
      <xpContext.Provider value={mockContextVal}>
        <FillUps
          task={mockTaskCaseSensitive}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    let input = screen.getByPlaceholderText("Type here...");
    let submitBtn = screen.getByRole("button", { name: "Submit" });

    // Type with wrong casing ("framework" instead of "Framework")
    fireEvent.change(input, { target: { value: "framework" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith("/api/tasks", expect.objectContaining({
        body: JSON.stringify({
          task: mockTaskCaseSensitive,
          isCorrect: false,
          roadmap: "test-roadmap",
          chapter: 1,
          userAnswer: "framework",
        }),
      }));
      expect(screen.getByText("Incorrect!")).toBeDefined();
      expect(mockContextVal.resetCombo).toHaveBeenCalled();
    });
  });

  it("should support submitting answer by pressing Enter key", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ courseCompleted: false }),
    });

    render(
      <xpContext.Provider value={mockContextVal}>
        <FillUps
          task={mockTaskCaseInsensitive}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    const input = screen.getByPlaceholderText("Type here...");
    fireEvent.change(input, { target: { value: "lib" } });

    // Press Enter key
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(screen.getByText("Correct!")).toBeDefined();
    });
  });
});
