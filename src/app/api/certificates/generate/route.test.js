import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { getDoc, getDocs, addDoc } from 'firebase/firestore';

// Mock dependencies
vi.mock('@/lib/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
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
  nanoid: vi.fn(() => 'test-cert-id'),
}));

describe('POST /api/certificates/generate - Bug Condition Exploration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 1.1, 1.6, 2.1, 2.6**
   * 
   * Property 1: Fault Condition - Generic Error Messages Returned (Certificate Database Error)
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * DO NOT attempt to fix the test or the code when it fails
   * 
   * For any certificate generation request where a Firestore error occurs, the fixed 
   * endpoint SHALL return a specific error message indicating the failure type 
   * (e.g., "Database error occurred. Please try again.") and include error details 
   * in the response for client-side error handling.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - Returns generic "Failed to generate certificate" message
   * - No error type or details in response
   * - This proves the bug exists
   * 
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES
   * - Returns specific error message about database error
   * - Includes errorType and details fields
   * - Provides actionable information to users
   */

  it('should return specific error message for database errors (not generic)', async () => {
    // Arrange - Mock Firestore to throw a database error
    const mockError = new Error('Firestore connection timeout');
    mockError.code = 'unavailable';
    
    getDoc.mockRejectedValue(mockError);

    const request = new Request('http://localhost:3000/api/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test@example.com',
        courseId: 'course123',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - This will FAIL on unfixed code because it returns generic message
    expect(response.status).toBe(503); // 503 for database unavailable/timeout
    expect(data.success).toBe(false);
    
    // The unfixed code returns: "Failed to generate certificate"
    // The fixed code should return something like: "Database connection timeout"
    expect(data.error).not.toBe('Failed to generate certificate');
    expect(data.error).toMatch(/database|connection|timeout/i);
    
    // The fixed code should include error details
    expect(data.errorType).toBeDefined();
    expect(data.details).toBeDefined();
  });
});

describe('POST /api/certificates/generate - Preservation Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirement 3.1**
   * 
   * Property 2: Preservation - Successful Certificate Generation
   * 
   * IMPORTANT: Follow observation-first methodology
   * Observation: Certificate generation works for completed courses on unfixed code
   * 
   * For any certificate generation request where the course is completed and valid,
   * the fixed endpoint SHALL continue to generate and return a valid certificate 
   * with all required fields exactly as the original code does.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES (confirms baseline behavior)
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES (confirms no regressions)
   */

  it('should successfully generate certificate for completed course (preservation)', async () => {
    // Arrange - Mock successful certificate generation scenario
    const mockCourseData = {
      courseTitle: 'JavaScript Fundamentals',
      chapters: [
        { chapterNumber: 1, chapterTitle: 'Intro', completed: true },
        { chapterNumber: 2, chapterTitle: 'Advanced', completed: true },
      ],
    };

    const mockUserData = {
      displayName: 'John Doe',
      email: 'test@example.com',
    };

    // Mock Firestore responses for successful flow
    getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockCourseData,
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockUserData,
      });

    getDocs.mockResolvedValue({
      empty: true,
      docs: [],
    });

    addDoc.mockResolvedValue({
      id: 'cert-doc-id',
    });

    const request = new Request('http://localhost:3000/api/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test@example.com',
        courseId: 'course123',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - Verify successful certificate generation is preserved
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.certificate).toBeDefined();
    expect(data.certificate.certificateId).toBe('test-cert-id');
    expect(data.certificate.userId).toBe('test@example.com');
    expect(data.certificate.courseId).toBe('course123');
    expect(data.certificate.courseTitle).toBe('JavaScript Fundamentals');
    expect(data.certificate.userName).toBe('John Doe');
    expect(data.certificate.completionDate).toBeDefined();
    expect(data.certificate.chapterCount).toBe(2);
    expect(data.certificate.issuedAt).toBeDefined();
    expect(data.certificate.verified).toBe(true);

    // Verify certificate was saved to Firestore
    expect(addDoc).toHaveBeenCalled();
    const addDocCall = addDoc.mock.calls[0];
    expect(addDocCall[1]).toMatchObject({
      certificateId: 'test-cert-id',
      userId: 'test@example.com',
      courseId: 'course123',
      courseTitle: 'JavaScript Fundamentals',
      userName: 'John Doe',
      chapterCount: 2,
      verified: true,
    });
  });

  /**
   * **Validates: Requirement 3.2**
   * 
   * Property 2: Preservation - Existing Certificate Retrieval
   * 
   * IMPORTANT: Follow observation-first methodology
   * Observation: Existing certificate retrieval works on unfixed code
   * 
   * For any certificate generation request where a certificate already exists,
   * the fixed endpoint SHALL continue to return the existing certificate without 
   * creating a duplicate, exactly as the original code does.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES (confirms baseline behavior)
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES (confirms no regressions)
   */

  it('should return existing certificate without creating duplicate (preservation)', async () => {
    // Arrange - Mock scenario where certificate already exists
    const mockCourseData = {
      courseTitle: 'React Basics',
      chapters: [
        { chapterNumber: 1, chapterTitle: 'Intro', completed: true },
      ],
    };

    const mockExistingCert = {
      certificateId: 'existing-cert-123',
      userId: 'test@example.com',
      courseId: 'course456',
      courseTitle: 'React Basics',
      userName: 'Jane Smith',
      completionDate: 'January 15, 2024',
      chapterCount: 1,
      issuedAt: {
        toDate: () => new Date('2024-01-15T10:00:00Z'),
      },
      verified: true,
    };

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockCourseData,
    });

    getDocs.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'existing-doc-id',
          data: () => mockExistingCert,
        },
      ],
    });

    const request = new Request('http://localhost:3000/api/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test@example.com',
        courseId: 'course456',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - Verify existing certificate is returned without creating new one
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.certificate).toBeDefined();
    expect(data.certificate.id).toBe('existing-doc-id');
    expect(data.certificate.certificateId).toBe('existing-cert-123');
    expect(data.certificate.userId).toBe('test@example.com');
    expect(data.certificate.courseId).toBe('course456');
    expect(data.certificate.courseTitle).toBe('React Basics');
    expect(data.certificate.userName).toBe('Jane Smith');
    expect(data.certificate.completionDate).toBe('January 15, 2024');
    expect(data.certificate.chapterCount).toBe(1);
    expect(data.certificate.issuedAt).toBe('2024-01-15T10:00:00.000Z');
    expect(data.certificate.verified).toBe(true);

    // Verify no new certificate was created
    expect(addDoc).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 3.8**
   * 
   * Property 2: Preservation - Missing Fields Validation
   * 
   * IMPORTANT: Follow observation-first methodology
   * Observation: Missing fields validation returns 400 on unfixed code
   * 
   * For any certificate generation request with missing userId or courseId,
   * the fixed endpoint SHALL continue to return 400 Bad Request with 
   * "Missing required fields" message, exactly as the original code does.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES (confirms baseline behavior)
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES (confirms no regressions)
   */

  it('should return 400 for missing required fields (preservation)', async () => {
    // Arrange - Request with missing courseId
    const request = new Request('http://localhost:3000/api/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test@example.com',
        // courseId is missing
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - Verify validation is preserved
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Missing required fields: userId and courseId');

    // Verify no database operations were attempted
    expect(getDoc).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 3.5**
   * 
   * Property 2: Preservation - Course Not Found Validation
   * 
   * IMPORTANT: Follow observation-first methodology
   * Observation: Course not found returns 404 on unfixed code
   * 
   * For any certificate generation request where the course doesn't exist,
   * the fixed endpoint SHALL continue to return 404 Not Found with 
   * "Course not found" message, exactly as the original code does.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES (confirms baseline behavior)
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES (confirms no regressions)
   */

  it('should return 404 for non-existent course (preservation)', async () => {
    // Arrange - Mock course not found
    getDoc.mockResolvedValue({
      exists: () => false,
    });

    const request = new Request('http://localhost:3000/api/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test@example.com',
        courseId: 'nonexistent-course',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - Verify 404 response is preserved
    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Course not found');

    // Verify no certificate creation was attempted
    expect(addDoc).not.toHaveBeenCalled();
  });

  /**
   * **Validates: Requirement 3.5**
   * 
   * Property 2: Preservation - Incomplete Course Validation
   * 
   * IMPORTANT: Follow observation-first methodology
   * Observation: Incomplete course returns 400 on unfixed code
   * 
   * For any certificate generation request where not all chapters are completed,
   * the fixed endpoint SHALL continue to return 400 Bad Request with 
   * "Course not completed yet" message, exactly as the original code does.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES (confirms baseline behavior)
   * EXPECTED OUTCOME ON FIXED CODE: Test PASSES (confirms no regressions)
   */

  it('should return 400 for incomplete course (preservation)', async () => {
    // Arrange - Mock course with incomplete chapters
    const mockCourseData = {
      courseTitle: 'Python Basics',
      chapters: [
        { chapterNumber: 1, chapterTitle: 'Intro', completed: true },
        { chapterNumber: 2, chapterTitle: 'Advanced', completed: false },
      ],
    };

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockCourseData,
    });

    const request = new Request('http://localhost:3000/api/certificates/generate', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test@example.com',
        courseId: 'course789',
      }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert - Verify incomplete course validation is preserved
    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Course not completed yet');

    // Verify no certificate creation was attempted
    expect(addDoc).not.toHaveBeenCalled();
  });
});
