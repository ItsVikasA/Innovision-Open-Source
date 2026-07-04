import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import CodeReorderTask from "./CodeReorderTask";
import xpContext from "@/contexts/xp";

// Mock framer-motion to avoid animation layout constraints in JSDOM
vi.mock("framer-motion", () => ({
  Reorder: {
    Group: ({ children, values, onReorder }) => <div data-testid="reorder-group">{children}</div>,
    Item: ({ children, value }) => <div data-testid="reorder-item">{children}</div>,
  },
}));

// Mock syntax highlighter
vi.mock("react-syntax-highlighter", () => ({
  Prism: ({ children }) => <pre>{children}</pre>,
}));

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

// Mock nightMode context
vi.mock("@/contexts/nightMode", () => ({
  useNightMode: () => ({ nightMode: false }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("CodeReorderTask Component", () => {
  const mockTask = {
    type: "code-reorder",
    question: "Reorder the lines to compute the square of a number.",
    lines: ["def square(x):", "  return x * x"],
    language: "python",
    explanation: "This function multiplies x by itself.",
  };

  const mockXpValue = {
    getXp: vi.fn(),
    combo: 0,
    incrementCombo: vi.fn(),
    resetCombo: vi.fn(),
    getCurrentMultiplier: () => 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ courseCompleted: false }),
      })
    );
  });

  it("renders task description and code lines", () => {
    render(
      <xpContext.Provider value={mockXpValue}>
        <CodeReorderTask
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber="1"
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    expect(screen.getByText("Objective:")).toBeDefined();
    expect(screen.getByText(mockTask.question)).toBeDefined();
    expect(screen.getByText(/def square/)).toBeDefined();
    expect(screen.getByText(/return x \* x/)).toBeDefined();
  });

  it("handles resetting and re-shuffling", () => {
    render(
      <xpContext.Provider value={mockXpValue}>
        <CodeReorderTask
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber="1"
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    const resetButton = screen.getByRole("button", { name: /reset/i });
    expect(resetButton).toBeDefined();
    fireEvent.click(resetButton);
  });

  it("submits the reordered code and calls tasks API", async () => {
    render(
      <xpContext.Provider value={mockXpValue}>
        <CodeReorderTask
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber="1"
          onCourseComplete={vi.fn()}
        />
      </xpContext.Provider>
    );

    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).toBeDefined();
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", expect.any(Object));
    });
  });
});
