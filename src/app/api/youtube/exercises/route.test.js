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
    get: vi.fn().mockResolvedValue(makeDocMock(courseData !== null, courseData ?? {})),
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

describe('PUT /api/youtube/exercises - XP farming regression', () => {
  it('awards XP on first exercise submission', async () => {
    const courseData = { exerciseProgress: {} };

    const txSet = vi.fn();
    const db = makeAdminDb({
      courseData,
      runTransaction: vi.fn().mockImplementation(async (fn) => {
        await fn({ get: vi.fn().mockResolvedValue(makeDocMock(false, null)), set: txSet });
      }),
    });
    mockGetAdminDb.mockReturnValue(db);

    const res = await PUT({
      json: async () => ({ courseId: 'c1', chapterNumber: 1, exerciseId: 'ex1', solution: 'done' }),
    });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(txSet).toHaveBeenCalledTimes(1);
  });

  it('does not award XP when the exercise was already completed (farming guard)', async () => {
    const courseData = {
      exerciseProgress: {
        chapter1: {
          ex1: { status: 'completed', submittedAt: '2026-05-23T00:00:00.000Z' },
        },
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

    const res = await PUT({
      json: async () => ({ courseId: 'c1', chapterNumber: 1, exerciseId: 'ex1', solution: 'resubmit' }),
    });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(txSet).not.toHaveBeenCalled();
  });

  it('awards XP for a different exercise in the same chapter', async () => {
    const courseData = {
      exerciseProgress: {
        chapter1: {
          ex1: { status: 'completed', submittedAt: '2026-05-23T00:00:00.000Z' },
        },
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

    const res = await PUT({
      json: async () => ({ courseId: 'c1', chapterNumber: 1, exerciseId: 'ex2', solution: 'new' }),
    });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(txSet).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await PUT({ json: async () => ({}) });
    expect(res.status).toBe(401);
  });
});
