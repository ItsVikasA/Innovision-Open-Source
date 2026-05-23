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

const mockAdminDb = vi.hoisted(() => ({ collection: vi.fn() }));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: mockAdminDb,
}));

import { GET, POST } from './route';

function makeDocMock(exists, data) {
  return { exists, data: () => data };
}

function makeGetRequest(params) {
  return { url: `http://localhost/api/gamification/daily-quests?${new URLSearchParams(params)}` };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- GET ---

describe('GET /api/gamification/daily-quests', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await GET(makeGetRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('userId required');
  });
});

// --- POST ---

describe('POST /api/gamification/daily-quests', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await POST({ json: async () => ({ action: 'claim', questId: 'x' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when no quests exist for today', async () => {
    const questsRef = {
      get: vi.fn().mockResolvedValue(makeDocMock(false, null)),
      update: vi.fn(),
    };
    mockAdminDb.collection.mockReturnValue({ doc: () => ({ collection: () => ({ doc: () => questsRef }) }) });

    const res = await POST({ json: async () => ({ userId: 'user1', action: 'claim', questId: 'x' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 for an unrecognised action', async () => {
    const questsData = { date: '2026-05-24', totalXPEarned: 0, quests: [] };
    const questsRef = {
      get: vi.fn().mockResolvedValue(makeDocMock(true, questsData)),
      update: vi.fn(),
    };
    mockAdminDb.collection.mockReturnValue({ doc: () => ({ collection: () => ({ doc: () => questsRef }) }) });

    const res = await POST({ json: async () => ({ userId: 'user1', action: 'bogus' }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid action');
  });

  it('writes claimed XP to gamification/{userId} (regression for path mismatch)', async () => {
    const questsData = {
      date: '2026-05-24',
      totalXPEarned: 0,
      quests: [{
        id: 'complete_chapter',
        title: 'Chapter Champion',
        type: 'chapters_completed',
        target: 1,
        xpReward: 25,
        progress: 1,
        completed: true,
        claimed: false,
      }],
    };

    const questsRef = {
      get: vi.fn().mockResolvedValue(makeDocMock(true, questsData)),
      update: vi.fn().mockResolvedValue(undefined),
    };

    const statsRef = {
      get: vi.fn().mockResolvedValue(makeDocMock(true, { xp: 100, level: 1 })),
      set: vi.fn().mockResolvedValue(undefined),
    };

    // Track every collection name the handler accesses
    const collectionsSeen = [];

    mockAdminDb.collection.mockImplementation((col) => {
      collectionsSeen.push(col);
      if (col === 'users') {
        return {
          doc: () => ({
            collection: (subCol) => {
              collectionsSeen.push(`users.${subCol}`);
              return { doc: () => questsRef };
            },
          }),
        };
      }
      if (col === 'gamification') {
        return { doc: () => statsRef };
      }
      return { doc: () => questsRef };
    });

    const res = await POST({ json: async () => ({ userId: 'user1', action: 'claim', questId: 'complete_chapter' }) });
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.xpAwarded).toBe(25);

    // Canonical path must have been accessed for stats
    expect(collectionsSeen).toContain('gamification');

    // The buggy nested path must NOT have been walked for stats
    expect(collectionsSeen).not.toContain('users.gamification');

    // XP written to stats document with correct value
    expect(statsRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ xp: 125 }),
      { merge: true }
    );
  });
});
