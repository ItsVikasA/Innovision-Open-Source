import { describe, it, expect, vi } from 'vitest';
import { POST, formatTimestamp } from './route';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      _data: data,
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}));

function makeRequest(body) {
  return { json: async () => body };
}

// --- formatTimestamp unit tests ---

describe('formatTimestamp', () => {
  it('returns "0:00" for 0 seconds', () => {
    expect(formatTimestamp(0)).toBe('0:00');
  });

  it('returns "0:00" for null/undefined input', () => {
    expect(formatTimestamp(null)).toBe('0:00');
    expect(formatTimestamp(undefined)).toBe('0:00');
  });

  it('formats sub-minute offsets correctly', () => {
    expect(formatTimestamp(5)).toBe('0:05');
    expect(formatTimestamp(59)).toBe('0:59');
  });

  it('formats minute-range offsets correctly', () => {
    expect(formatTimestamp(60)).toBe('1:00');
    expect(formatTimestamp(65)).toBe('1:05');
    expect(formatTimestamp(600)).toBe('10:00');
    expect(formatTimestamp(3599)).toBe('59:59');
  });

  it('formats hour-range offsets correctly', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00');
    expect(formatTimestamp(3661)).toBe('1:01:01');
    expect(formatTimestamp(7384)).toBe('2:03:04');
  });

  it('floors fractional seconds from the library', () => {
    expect(formatTimestamp(65.789)).toBe('1:05');
    expect(formatTimestamp(3661.999)).toBe('1:01:01');
  });

  it('does not divide by 1000 (regression: offset was treated as milliseconds)', () => {
    // If the old ms/1000 bug were present, formatTimestamp(65) would return "0:00"
    expect(formatTimestamp(65)).not.toBe('0:00');
  });
});

// --- POST route integration tests ---

describe('POST /api/youtube/transcript', () => {
  it('returns 400 when videoId is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Video ID is required');
  });

  it('uses second-based offsets from the library correctly', async () => {
    const { YoutubeTranscript } = await import('youtube-transcript');
    YoutubeTranscript.fetchTranscript.mockResolvedValue([
      { text: 'Hello', offset: 65, duration: 2, lang: 'en' },
      { text: 'World', offset: 130, duration: 2, lang: 'en' },
    ]);

    const res = await POST(makeRequest({ videoId: 'dQw4w9WgXcQ' }));
    const data = await res.json();

    expect(data.success).toBe(true);
    expect(data.detailedTranscript[0].timestamp).toBe('1:05');
    expect(data.detailedTranscript[1].timestamp).toBe('2:10');
    expect(data.timestampedTranscript).toContain('[1:05] Hello');
    expect(data.timestampedTranscript).toContain('[2:10] World');
  });
});
