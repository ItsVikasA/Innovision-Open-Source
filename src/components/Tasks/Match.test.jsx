import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Match from "./Match";
import xpContext from "@/contexts/xp";
import React from "react";

// Mock sound effects hook
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
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("Match Component", () => {
  const mockTask = {
    id: "test-match-1",
    type: "match",
    terms: {
      lhs: ["React", "Vue", "Svelte"],
      rhs: ["Virtual DOM", "Reactivity System", "Compiler"],
    },
    answer: [0, 1, 2], // React -> Virtual DOM (0), Vue -> Reactivity System (1), Svelte -> Compiler (2)
    explanation: "Correct! React uses a virtual DOM, Vue uses reactivity, and Svelte compiles at build time.",
  };

  const mockGetXp = vi.fn();
  const mockOnCourseComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch globally
    global.fetch = vi.fn();

    // Mock requestAnimationFrame and cancelAnimationFrame
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => setTimeout(cb, 16));
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));

    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = vi.fn().mockImplementation(function() {
      // Differentiate LHS and RHS rects to simulate lines
      const text = this.textContent || "";
      if (text.includes("React")) {
        return { top: 100, left: 50, right: 150, bottom: 130, width: 100, height: 30 };
      }
      if (text.includes("Virtual DOM")) {
        return { top: 100, left: 350, right: 450, bottom: 130, width: 100, height: 30 };
      }
      return { top: 200, left: 200, right: 300, bottom: 230, width: 100, height: 30 };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render LHS and RHS terms correctly", () => {
    render(
      <xpContext.Provider value={{ getXp: mockGetXp }}>
        <Match
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={mockOnCourseComplete}
        />
      </xpContext.Provider>
    );

    expect(screen.getByText("Match the Following")).toBeDefined();
    expect(screen.getByText("React")).toBeDefined();
    expect(screen.getByText("Vue")).toBeDefined();
    expect(screen.getByText("Svelte")).toBeDefined();
    expect(screen.getByText("Virtual DOM")).toBeDefined();
    expect(screen.getByText("Reactivity System")).toBeDefined();
    expect(screen.getByText("Compiler")).toBeDefined();
  });

  it("should handle selecting and matching LHS to RHS items", async () => {
    render(
      <xpContext.Provider value={{ getXp: mockGetXp }}>
        <Match
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={mockOnCourseComplete}
        />
      </xpContext.Provider>
    );

    const reactEl = screen.getByText("React");
    const vdomEl = screen.getByText("Virtual DOM");

    // Select React (LHS index 0)
    fireEvent.click(reactEl);
    
    // Select Virtual DOM (RHS index 0)
    fireEvent.click(vdomEl);

    // After matching, path-0 should exist in the DOM
    await waitFor(() => {
      const path = document.querySelector("#path-0");
      expect(path).toBeDefined();
      expect(path.getAttribute("stroke")).toBe("#5865F2");
    });
  });

  it("should remove match when clicking the clear 'x' button", async () => {
    render(
      <xpContext.Provider value={{ getXp: mockGetXp }}>
        <Match
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={mockOnCourseComplete}
        />
      </xpContext.Provider>
    );

    const reactEl = screen.getByText("React");
    const vdomEl = screen.getByText("Virtual DOM");

    fireEvent.click(reactEl);
    fireEvent.click(vdomEl);

    // Find the cross button inside React item
    const crossButton = screen.getByText("×");
    expect(crossButton).toBeDefined();

    // Click cross button to clear match
    fireEvent.click(crossButton);

    await waitFor(() => {
      const path = document.querySelector("#path-0");
      expect(path).toBeNull();
    });
  });

  it("should submit matched answers to backend and display results", async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ courseCompleted: false }),
    });

    render(
      <xpContext.Provider value={{ getXp: mockGetXp }}>
        <Match
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={mockOnCourseComplete}
        />
      </xpContext.Provider>
    );

    // Match all items
    fireEvent.click(screen.getByText("React"));
    fireEvent.click(screen.getByText("Virtual DOM"));

    fireEvent.click(screen.getByText("Vue"));
    fireEvent.click(screen.getByText("Reactivity System"));

    fireEvent.click(screen.getByText("Svelte"));
    fireEvent.click(screen.getByText("Compiler"));

    // Click submit button
    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/tasks", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          task: mockTask,
          isCorrect: [true, true, true],
          roadmap: "test-roadmap",
          chapter: 1,
          userAnswer: [0, 1, 2],
        }),
      }));
      expect(mockGetXp).toHaveBeenCalled();
      expect(screen.getByText(/Score: 3\/3/)).toBeDefined();
      expect(screen.getByText(mockTask.explanation)).toBeDefined();
    });
  });

  it("should prevent submission and show toast when not all items are matched", async () => {
    const toast = await import("sonner");
    
    render(
      <xpContext.Provider value={{ getXp: mockGetXp }}>
        <Match
          task={mockTask}
          roadmapId="test-roadmap"
          chapterNumber={1}
          onCourseComplete={mockOnCourseComplete}
        />
      </xpContext.Provider>
    );

    // Only match one pair
    fireEvent.click(screen.getByText("React"));
    fireEvent.click(screen.getByText("Virtual DOM"));

    const submitBtn = screen.getByRole("button", { name: "Submit" });
    fireEvent.click(submitBtn);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast.toast.warning).toHaveBeenCalledWith("Please match all items before submitting");
  });
});
