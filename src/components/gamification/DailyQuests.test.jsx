import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const {
  getXpMock,
  toastSuccessMock,
  toastErrorMock,
  confettiMock,
  mockedModules,
} = vi.hoisted(() => ({
  getXpMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  confettiMock: vi.fn(),
  mockedModules: {
    xpContext: null,
  },
}));

vi.mock("@/contexts/xp", async () => {
  const ReactModule = await import("react");
  mockedModules.xpContext = ReactModule.createContext({ getXp: getXpMock });

  return {
    default: mockedModules.xpContext,
  };
});

import DailyQuests from "./DailyQuests";
import xpContext from "@/contexts/xp";

vi.mock("canvas-confetti", () => ({
  default: confettiMock,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("@/components/ui/animated-progress", () => ({
  AnimatedProgress: ({ value }) => React.createElement("div", { "data-testid": "progress" }, value),
}));

function renderWithXp(ui) {
  return render(
    <xpContext.Provider value={{ getXp: getXpMock }}>
      {ui}
    </xpContext.Provider>
  );
}

describe("DailyQuests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders fetched quests and claims rewards", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quests: [
            {
              id: "quest-1",
              title: "Chapter Champion",
              description: "Complete 1 chapter",
              icon: "BookOpen",
              progress: 1,
              target: 1,
              xpReward: 25,
              completed: true,
              claimed: false,
            },
          ],
          totalXPEarned: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          xpAwarded: 25,
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    renderWithXp(<DailyQuests userId="learner@example.com" />);

    expect(screen.getByText("Daily Quests")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Chapter Champion")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /claim/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(getXpMock).toHaveBeenCalledTimes(1);
      expect(toastSuccessMock).toHaveBeenCalledWith("+25 XP claimed!");
      expect(confettiMock).toHaveBeenCalled();
      expect(screen.getByText("Today's earnings:")).toBeTruthy();
    });
  });

  it("shows an empty state when the API returns no quests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        quests: [],
        totalXPEarned: 0,
      }),
    }));

    renderWithXp(<DailyQuests userId="learner@example.com" />);

    await waitFor(() => expect(screen.getByText("No quests available right now.")).toBeTruthy());
  });

  it("shows an error state and retries fetching quests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "boom" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          quests: [
            {
              id: "quest-2",
              title: "XP Hunter",
              description: "Earn 50 XP today",
              icon: "Sparkles",
              progress: 10,
              target: 50,
              xpReward: 15,
              completed: false,
              claimed: false,
            },
          ],
          totalXPEarned: 0,
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    renderWithXp(<DailyQuests userId="learner@example.com" />);

    await waitFor(() => expect(screen.getByText("Failed to load daily quests")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() => expect(screen.getByText("XP Hunter")).toBeTruthy());
  });
});
