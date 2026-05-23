import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      _data: data,
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

const mockGetAdminDb = vi.hoisted(() => vi.fn());

vi.mock('@/lib/firebase-admin', () => ({
  getAdminDb: mockGetAdminDb,
}));

const mockGetServerSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth-server', () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel() {
      return { generateContent: vi.fn() };
    }
  },
}));

import { PUT } from './route';

function makeDocMock(exists, data) {
  return { exists, data: () => data };
}

function makeAdminDb({ courseData, runTransaction }) {
  const courseRef = {
    get: vi.fn().mockResolvedValue(makeDocMock(true, courseData)),
    update: vi.fn().mockResolvedValue(undefined),
  };
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue(courseRef),
        }),
      }),
    }),
    runTransaction: runTransaction ?? vi.fn().mockImplementation(async (fn) => fn({ get: vi.fn().mockResolvedValue(makeDocMock(false, null)), set: vi.fn() })),
    _courseRef: courseRef,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { email: 'test@example.com' } });
});

describe('PUT /api/youtube/quiz - XP farming regression', () => {
  it('awards XP on first passing submission', async () => {
    const courseData = {
      chapters: [{
        quiz: {
          questions: [{ id: 'q1', correctAnswer: 0, explanation: '' }],
          passingScore: 70,
        },
      }],
      quizScores: {},
    };

    const txSet = vi.fn();
    const db = makeAdminDb({
      courseData,
      runTransaction: vi.fn().mockImplementation(async (fn) => {
        await fn({ get: vi.fn().mockResolvedValue(makeDocMock(false, null)), set: txSet });
      }),
    });
    mockGetAdminDb.mockReturnValue(db);

    const res = await PUT({ json: async () => ({ courseId: 'c1', chapterNumber: 1, answers: [0] }) });
    const data = await res.json();

    expect(data.passed).toBe(true);
    expect(txSet).toHaveBeenCalledTimes(1);
  });

  it('does not award XP when the chapter quiz was already passed (farming guard)', async () => {
    const courseData = {
      chapters: [{
        quiz: {
          questions: [{ id: 'q1', correctAnswer: 0, explanation: '' }],
          passingScore: 70,
        },
      }],
      quizScores: {
        chapter1: { score: 100, passed: true, completedAt: '2026-05-23T00:00:00.000Z', results: [] },
      },
    };

    const txSet = vi.fn();
    const db = makeAdminDb({
      courseData,
      runTransaction: vi.fn().mockImplementation(async (fn) => {
        await fn({ get: vi.fn().mockResolvedValue(makeDocMock(false, null)), set: txSet });
      }),
    });
    mockGetAdminDb.mockReturnValue(db);

    const res = await PUT({ json: async () => ({ courseId: 'c1', chapterNumber: 1, answers: [0] }) });
    const data = await res.json();

    expect(data.passed).toBe(true);
    expect(txSet).not.toHaveBeenCalled();
  });

  it('does not award XP when the submission fails (score below passing threshold)', async () => {
    const courseData = {
      chapters: [{
        quiz: {
          questions: [
            { id: 'q1', correctAnswer: 0, explanation: '' },
            { id: 'q2', correctAnswer: 1, explanation: '' },
          ],
          passingScore: 70,
        },
      }],
      quizScores: {},
    };

    const txSet = vi.fn();
    const db = makeAdminDb({
      courseData,
      runTransaction: vi.fn().mockImplementation(async (fn) => {
        await fn({ get: vi.fn().mockResolvedValue(makeDocMock(false, null)), set: txSet });
      }),
    });
    mockGetAdminDb.mockReturnValue(db);

    // Both answers wrong
    const res = await PUT({ json: async () => ({ courseId: 'c1', chapterNumber: 1, answers: [1, 0] }) });
    const data = await res.json();

    expect(data.passed).toBe(false);
    expect(txSet).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PUT({ json: async () => ({}) });
    expect(res.status).toBe(401);
  });

  it('returns 503 when Firebase is not configured', async () => {
    mockGetAdminDb.mockReturnValue(null);
    const res = await PUT({ json: async () => ({ courseId: 'c1', chapterNumber: 1, answers: [] }) });
    expect(res.status).toBe(503);
  });
});
