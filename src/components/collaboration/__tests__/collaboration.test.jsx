import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase FIRST - before any imports
vi.mock('@/lib/firebase', () => ({
  db: { _name: 'mock-db' },
  auth: { currentUser: null }
}));

// Mock dependencies
vi.mock('@/contexts/collaboration', () => ({
  useCollaboration: () => ({
    presence: [
      { userId: 'user1', online: true, status: 'active' },
      { userId: 'user2', online: true, status: 'active' },
    ],
    messages: [],
    roomId: 'test-room',
  }),
  CollaborationProvider: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/contexts/auth', () => ({
  useAuth: () => ({
    user: {
      uid: 'user1',
      displayName: 'Test User',
      photoURL: '',
    },
  }),
}));

// NOW import components after all mocks are set up
import { render, screen } from '@testing-library/react';
import PresenceIndicator from '@/components/collaboration/PresenceIndicator';
import MessageThread from '@/components/collaboration/MessageThread';
import WorkspacePanel from '@/components/collaboration/WorkspacePanel';

describe('Collaboration Components', () => {
  describe('PresenceIndicator', () => {
    it('should display online user count', () => {
      render(<PresenceIndicator />);
      expect(screen.getByText('2 online')).toBeInTheDocument();
    });

    it('should show online indicator badge', () => {
      render(<PresenceIndicator />);
      const badge = screen.getByText('2 online');
      expect(badge.parentElement).toHaveClass('flex');
    });
  });

  describe('MessageThread', () => {
    it('should render empty message state', () => {
      render(<MessageThread />);
      expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
    });

    it('should have send button', () => {
      render(<MessageThread />);
      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('should have message input', () => {
      render(<MessageThread />);
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });
  });

  describe('WorkspacePanel', () => {
    it('should render with title', () => {
      render(<WorkspacePanel roomId="test" title="Test Room" />);
      expect(screen.getByText('Test Room')).toBeInTheDocument();
    });

    it('should display presence indicator', () => {
      render(<WorkspacePanel roomId="test" />);
      expect(screen.getByText(/online/)).toBeInTheDocument();
    });
  });
});
