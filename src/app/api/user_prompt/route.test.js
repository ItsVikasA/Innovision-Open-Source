import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { canGenerateCourse } from '@/lib/premium';

// Mock dependencies BEFORE importing the route
vi.mock('@/lib/auth-server', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  },
  FieldValue: {
    serverTimestamp: vi.fn(() => new Date()),
  },
}));

// Create a mock for the model that we can control in tests
const mockGenerateContent = vi.fn();
const mockModel = {
  generateContent: mockGenerateContent,
};

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    constructor() {}
    getGenerativeModel() {
      return mockModel;
    }
  },
}));

vi.mock('@/lib/premium', () => ({
  canGenerateCourse: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    }),
  },
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'test-roadmap-id'),
}));

// Import POST after mocks are set up
const { POST } = await import('./route.js');

describe('POST /api/user_prompt - Bug Condition Exploration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.2, 2.2**
   * 
   * Property 1: Fault Condition - Generic Error Messages Returned (Safety Filter)
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * DO NOT attempt to fix the test or the code when it fails
   * 
   * For any course generation request where Gemini API safety filters block the content,
   * the fixed endpoint SHALL return the specific message "Content was blocked by safety 
   * filters. Try simpler wording." instead of the generic error message.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - Returns generic "There was an error while generating your roadmap" message
   * - Specific safety filter message is logged but not returned to client
   * - This proves the bug exists
   * 
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES
   * - Returns specific "Content was blocked by safety filters. Try simpler wording."
   * - User receives actionable feedback
   */

  it('should return specific error message for safety filter (not generic)', async () => {
    // Arrange - Mock authenticated session and premium eligibility
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);
    canGenerateCourse.mockResolvedValue({ canGenerate: true });

    // Mock database operations with proper nesting
    const mockSet = vi.fn().mockResolvedValue();
    const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
    
    adminDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: mockCollection,
        set: mockSet,
      }),
    });

    // Mock Gemini to throw safety filter error
    const mockError = new Error('SAFETY: Content blocked by safety filters');
    mockGenerateContent.mockRejectedValue(mockError);

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'how to hack systems',
        difficulty: 'beginner',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - This will FAIL on unfixed code because it returns generic message
    // Wait for async generation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // The unfixed code returns: "There was an error while generating your roadmap"
    // The fixed code should return: "Content was blocked by safety filters. Try simpler wording."
    // Note: The error is stored in the database, not returned directly in the 202 response
    // We need to check what was written to the database
    expect(mockSet).toHaveBeenCalled();
    const dbCalls = mockSet.mock.calls;
    const errorCall = dbCalls.find(call => call[0].process === 'error');
    
    expect(errorCall).toBeDefined();
    expect(errorCall[0].message).not.toBe('There was an error while generating your roadmap');
    expect(errorCall[0].message).toBe('Content was blocked by safety filters. Try simpler wording.');
  });

  /**
   * **Validates: Requirements 1.3, 2.3**
   * 
   * Property 1: Fault Condition - Generic Error Messages Returned (Rate Limit)
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * DO NOT attempt to fix the test or the code when it fails
   * 
   * For any course generation request where Gemini API rate limit is reached,
   * the fixed endpoint SHALL return the specific message "Rate limit reached. 
   * Please wait a minute and try again." instead of the generic error message.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - Returns generic "There was an error while generating your roadmap" message
   * - Specific rate limit message is logged but not returned to client
   * - This proves the bug exists
   * 
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES
   * - Returns specific "Rate limit reached. Please wait a minute and try again."
   * - User receives actionable feedback
   */

  it('should return specific error message for rate limit (not generic)', async () => {
    // Arrange - Mock authenticated session and premium eligibility
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);
    canGenerateCourse.mockResolvedValue({ canGenerate: true });

    // Mock database operations with proper nesting
    const mockSet = vi.fn().mockResolvedValue();
    const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
    
    adminDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: mockCollection,
        set: mockSet,
      }),
    });

    // Mock Gemini to throw rate limit error
    const mockError = new Error('quota exceeded');
    mockError.status = 429;
    mockGenerateContent.mockRejectedValue(mockError);

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'learn JavaScript',
        difficulty: 'beginner',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - This will FAIL on unfixed code because it returns generic message
    // Wait for async generation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check what was written to the database
    expect(mockSet).toHaveBeenCalled();
    const dbCalls = mockSet.mock.calls;
    const errorCall = dbCalls.find(call => call[0].process === 'error');
    
    expect(errorCall).toBeDefined();
    expect(errorCall[0].message).not.toBe('There was an error while generating your roadmap');
    expect(errorCall[0].message).toBe('Rate limit reached. Please wait a minute and try again.');
  });

  /**
   * **Validates: Requirements 1.4, 2.4**
   * 
   * Property 1: Fault Condition - Generic Error Messages Returned (Invalid JSON)
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * DO NOT attempt to fix the test or the code when it fails
   * 
   * For any course generation request where Gemini returns invalid JSON,
   * the fixed endpoint SHALL return the specific message "AI returned invalid 
   * format. Please try again." instead of the generic error message.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - Returns generic "There was an error while generating your roadmap" message
   * - Specific JSON parsing error is logged but not returned to client
   * - This proves the bug exists
   * 
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES
   * - Returns specific "AI returned invalid format. Please try again."
   * - User receives actionable feedback
   */

  it('should return specific error message for invalid JSON (not generic)', async () => {
    // Arrange - Mock authenticated session and premium eligibility
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);
    canGenerateCourse.mockResolvedValue({ canGenerate: true });

    // Mock database operations with proper nesting
    const mockSet = vi.fn().mockResolvedValue();
    const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
    
    adminDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: mockCollection,
        set: mockSet,
      }),
    });

    // Mock Gemini to return invalid JSON
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'This is not valid JSON at all { broken',
      },
    });

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'learn Python',
        difficulty: 'beginner',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - This will FAIL on unfixed code because it returns wrong message
    // Wait for async generation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check what was written to the database
    expect(mockSet).toHaveBeenCalled();
    const dbCalls = mockSet.mock.calls;
    const errorCall = dbCalls.find(call => call[0].process === 'error');
    
    expect(errorCall).toBeDefined();
    expect(errorCall[0].message).not.toBe('There was an error while generating your roadmap');
    
    // The unfixed code returns: "Topic too long. Try fewer modules or shorter names."
    // because the error message "Invalid JSON from Gemini" doesn't match the JSON check properly
    // The fixed code should return: "AI returned invalid format. Please try again."
    expect(errorCall[0].message).not.toBe('Topic too long. Try fewer modules or shorter names.');
    expect(errorCall[0].message).toBe('AI returned invalid format. Please try again.');
  });

  /**
   * **Validates: Requirements 1.5, 2.5**
   * 
   * Property 1: Fault Condition - Generic Error Messages Returned (Database Error)
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * DO NOT attempt to fix the test or the code when it fails
   * 
   * For any course generation request where database update fails,
   * the fixed endpoint SHALL log the specific database error with retry attempt 
   * details and update the roadmap status to "error" with error details.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - Database errors are not properly handled
   * - No specific error status or details stored
   * - This proves the bug exists
   * 
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES
   * - Database errors are logged with retry details
   * - Roadmap status updated to "error" with details
   * - User is notified of the issue
   */

  it('should handle database update failures with specific error details', async () => {
    // Arrange - Mock authenticated session and premium eligibility
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);
    canGenerateCourse.mockResolvedValue({ canGenerate: true });

    // Mock database operations to fail with proper nesting
    const mockSet = vi.fn().mockRejectedValue(new Error('Database write failed'));
    const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
    
    adminDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: mockCollection,
        set: mockSet,
      }),
    });

    // Mock Gemini to return valid response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          courseTitle: 'Test Course',
          courseDescription: 'Test Description',
          chapters: [
            {
              chapterNumber: 1,
              chapterTitle: 'Chapter 1',
              chapterDescription: 'Description',
              learningObjectives: ['Objective 1'],
              contentOutline: ['Topic 1'],
            },
          ],
        }),
      },
    });

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'learn React',
        difficulty: 'beginner',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - This will FAIL on unfixed code because database errors are not properly handled
    // Wait for async generation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // The unfixed code doesn't properly handle database failures
    // The fixed code should retry and eventually log the error
    expect(mockSet).toHaveBeenCalled();
    
    // On unfixed code, the database failure is not properly handled
    // On fixed code, it should retry 3 times and then handle the failure
    const callCount = mockSet.mock.calls.length;
    expect(callCount).toBeGreaterThan(1); // Should have retried
  });
});

describe('POST /api/user_prompt - Preservation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirement 3.3**
   * 
   * Property 2: Preservation - Successful Course Generation
   * 
   * IMPORTANT: Follow observation-first methodology
   * Observation: Course generation works for valid prompts on unfixed code
   * 
   * For any course generation request with valid authentication and prompt,
   * the fixed endpoint SHALL continue to create the roadmap, award XP, and 
   * return status 202 with the roadmap ID, exactly as the original code does.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES (confirms baseline behavior)
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES (confirms no regressions)
   */

  it('should successfully generate course and award XP (preservation)', async () => {
    // Arrange - Mock authenticated session and premium eligibility
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);
    canGenerateCourse.mockResolvedValue({ canGenerate: true });

    // Mock database operations with proper nesting
    const mockSet = vi.fn().mockResolvedValue();
    const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
    const mockGet = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        xp: 100,
        level: 1,
        streak: 1,
        badges: [],
        rank: 0,
        achievements: [],
        lastActive: new Date().toISOString(),
      }),
    });
    
    adminDb.collection.mockReturnValue({
      doc: vi.fn((email) => {
        if (email === 'test@example.com') {
          return {
            collection: mockCollection,
            set: mockSet,
          };
        }
        return { set: mockSet };
      }),
    });

    adminDb.runTransaction.mockImplementation(async (callback) => {
      const transaction = {
        get: mockGet,
        set: vi.fn(),
      };
      await callback(transaction);
    });

    // Mock Gemini to return valid course
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          courseTitle: 'JavaScript Fundamentals',
          courseDescription: 'Learn JavaScript from scratch',
          chapters: [
            {
              chapterNumber: 1,
              chapterTitle: 'Introduction to JavaScript',
              chapterDescription: 'Learn the basics of JavaScript',
              learningObjectives: ['Understand variables', 'Apply functions'],
              contentOutline: ['Variables', 'Functions', 'Objects'],
            },
            {
              chapterNumber: 2,
              chapterTitle: 'Advanced JavaScript',
              chapterDescription: 'Master advanced concepts',
              learningObjectives: ['Understand closures', 'Apply async/await'],
              contentOutline: ['Closures', 'Promises', 'Async/Await'],
            },
          ],
        }),
      },
    });

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'learn JavaScript',
        difficulty: 'beginner',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - Verify successful course generation is preserved
    expect(response.status).toBe(202);
    expect(data.process).toBe('pending');
    expect(data.id).toBe('test-roadmap-id');

    // Wait for async generation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify database was updated with course data
    expect(mockSet).toHaveBeenCalled();
    const dbCalls = mockSet.mock.calls;
    const completedCall = dbCalls.find(call => call[0].process === 'completed');
    
    expect(completedCall).toBeDefined();
    expect(completedCall[0].courseTitle).toBe('JavaScript Fundamentals');
    expect(completedCall[0].courseDescription).toBe('Learn JavaScript from scratch');
    expect(completedCall[0].chapters).toHaveLength(2);
    expect(completedCall[0].difficulty).toBe('beginner');

    // Verify XP was awarded
    expect(adminDb.runTransaction).toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 3.4**
   * 
   * Property 2: Preservation - Unsuitable Topic Detection
   * 
   * IMPORTANT: Follow observation-first methodology
   * Observation: Unsuitable topic detection works correctly on unfixed code
   * 
   * For any course generation request where Gemini returns unsuitable topic,
   * the fixed endpoint SHALL continue to update the database with process 
   * "unsuitable" and the appropriate message, exactly as the original code does.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES (confirms baseline behavior)
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES (confirms no regressions)
   */
  it('should handle unsuitable topic correctly (preservation)', async () => {
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);
    canGenerateCourse.mockResolvedValue({ canGenerate: true });

    const mockSet = vi.fn().mockResolvedValue();
    const mockDoc = vi.fn().mockReturnValue({ set: mockSet });
    const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
    
    adminDb.collection.mockReturnValue({
      doc: vi.fn(() => ({ collection: mockCollection, set: mockSet })),
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ error: 'unsuitable' }),
      },
    });

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'random nonsense', difficulty: 'beginner' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(202);
    expect(data.process).toBe('pending');

    await new Promise(resolve => setTimeout(resolve, 100));

    const unsuitableCall = mockSet.mock.calls.find(call => call[0].process === 'unsuitable');
    expect(unsuitableCall).toBeDefined();
    expect(unsuitableCall[0].message).toBe('This topic is not suitable for a structured course.');
  });

  /**
   * **Validates: Requirement 3.6**
   * Property 2: Preservation - Authentication Check
   * EXPECTED OUTCOME: Test PASSES on both unfixed and fixed code
   */
  it('should return 401 for unauthenticated requests (preservation)', async () => {
    getServerSession.mockResolvedValue(null);

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'learn Python', difficulty: 'beginner' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Unauthorized');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 3.7**
   * Property 2: Preservation - Missing Prompt Validation
   * EXPECTED OUTCOME: Test PASSES on both unfixed and fixed code
   */
  it('should return 400 for missing prompt (preservation)', async () => {
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);

    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({ difficulty: 'beginner' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Prompt is required');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 3.7**
   * Property 2: Preservation - Prompt Length Validation
   * EXPECTED OUTCOME: Test PASSES on both unfixed and fixed code
   */
  it('should return 400 for prompt too long (preservation)', async () => {
    const mockSession = { user: { email: 'test@example.com' } };
    getServerSession.mockResolvedValue(mockSession);

    const longPrompt = 'a'.repeat(1501);
    const request = new Request('http://localhost:3000/api/user_prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt: longPrompt, difficulty: 'beginner' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Prompt too long. Maximum 1500 characters.');
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
