# Collaboration Components Guide

## Overview

The collaboration workspace provides React components for building real-time communication features into your application.

## Components

### WorkspacePanel

Main container for collaboration features.

```jsx
import WorkspacePanel from '@/components/collaboration/WorkspacePanel';

export default function CollaborationPage() {
  return (
    <WorkspacePanel 
      roomId="general"
      title="#general"
    />
  );
}
```

**Props:**
- `roomId` (required) - Unique room identifier
- `title` (optional) - Display title, defaults to "Collaboration"

**Features:**
- Real-time message synchronization
- Presence tracking
- Auto-scroll to latest messages
- Responsive design (600px height)

---

### MessageThread

Chat interface component.

```jsx
import { CollaborationProvider } from '@/contexts/collaboration';
import MessageThread from '@/components/collaboration/MessageThread';

export default function ChatApp() {
  return (
    <CollaborationProvider roomId="room-123">
      <MessageThread />
    </CollaborationProvider>
  );
}
```

**Features:**
- Send/receive messages in real-time
- Display author avatar and timestamp
- Enter key to send
- Auto-scroll on new messages
- Empty state message

**Message Format:**
```javascript
{
  id: "msg-123",
  content: "Message text",
  authorId: "user-456",
  authorName: "John Doe",
  authorAvatar: "https://...",
  timestamp: Timestamp,
  edited: false
}
```

---

### PresenceIndicator

Shows online contributors.

```jsx
import { CollaborationProvider } from '@/contexts/collaboration';
import PresenceIndicator from '@/components/collaboration/PresenceIndicator';

export default function Header() {
  return (
    <CollaborationProvider roomId="room-123">
      <PresenceIndicator />
    </CollaborationProvider>
  );
}
```

**Features:**
- Display online user count
- Show avatar badges (up to 5)
- Hover tooltip with user info
- Green online indicator
- Responsive badge styling

---

### IssueLinkedChannel

Discussion channel tied to a GitHub issue.

```jsx
import IssueLinkedChannel from '@/components/collaboration/IssueLinkedChannel';

export default function IssueDetail({ issueId, issueTitle }) {
  return (
    <IssueLinkedChannel 
      issueId={issueId}
      issueTitle={issueTitle}
    />
  );
}
```

**Props:**
- `issueId` (required) - GitHub issue number
- `issueTitle` (optional) - Issue title to display

**Features:**
- Automatic room creation per issue
- Presence tracking for issue collaborators
- Scoped message history
- Issue reference display

**Room ID Pattern:** `issue-{issueId}`

---

### ContributorActivityFeed

Real-time activity stream.

```jsx
import ContributorActivityFeed from '@/components/collaboration/ContributorActivityFeed';

export default function Dashboard() {
  return (
    <ContributorActivityFeed limit={10} />
  );
}
```

**Props:**
- `limit` (optional) - Number of activities to show, defaults to 10

**Supported Activities:**
| Type | Icon | Label |
|------|------|-------|
| `message` | 💬 | sent a message |
| `code_push` | 📝 | pushed code |
| `pr_created` | 🔄 | created a pull request |
| `issue_resolved` | ✅ | resolved an issue |
| `collaboration_started` | 👥 | started collaborating |

**Features:**
- Real-time activity updates
- Activity filtering by type
- Timestamp display
- Empty state handling
- Loading state

---

### ContributorDirectory

List of active contributors.

```jsx
import ContributorDirectory from '@/components/collaboration/ContributorDirectory';

export default function Team() {
  return (
    <ContributorDirectory />
  );
}
```

**Features:**
- Filter by online/all
- Real-time online status
- Show rooms per contributor
- Contributor count display
- Loading state

**Filters:**
- `all` - All contributors
- `online` - Only online contributors

---

## Context

### useCollaboration

Access collaboration state and methods.

```jsx
import { useCollaboration } from '@/contexts/collaboration';

export default function MyComponent() {
  const { messages, presence, roomId } = useCollaboration();

  return (
    <div>
      <p>Room: {roomId}</p>
      <p>Online: {presence.filter(u => u.online).length}</p>
      <p>Messages: {messages.length}</p>
    </div>
  );
}
```

**Context Value:**
```javascript
{
  messages: Message[],      // Array of messages
  presence: Presence[],      // Array of online users
  roomId: string             // Current room ID
}
```

### CollaborationProvider

Wrap components to enable collaboration features.

```jsx
import { CollaborationProvider } from '@/contexts/collaboration';

export default function App() {
  return (
    <CollaborationProvider roomId="room-123">
      {/* Components can now use useCollaboration() */}
    </CollaborationProvider>
  );
}
```

**Props:**
- `roomId` (required) - Room identifier
- `children` (required) - Child components

---

## Services

### collaboration-service.js

```javascript
import { createRoom, getRoom, subscribeToMessages } 
  from '@/lib/collaboration-service';

// Create a room
const roomId = await createRoom({
  name: 'General Discussion',
  type: 'repository',
  linkedRepo: 'Innovision-Open-Source',
  linkedIssue: '123'
});

// Get room metadata
const room = await getRoom('room-abc123');

// Subscribe to messages
const unsubscribe = subscribeToMessages('room-abc123', (messages) => {
  console.log('Messages:', messages);
});
```

### message-store.js

```javascript
import { sendMessage } from '@/lib/message-store';

await sendMessage('room-abc123', {
  content: 'Hello team!',
  authorId: 'user-123',
  authorName: 'John Doe',
  authorAvatar: 'https://example.com/avatar.jpg'
});
```

### presence-manager.js

```javascript
import { setPresence, setOffline, subscribeToPresence } 
  from '@/lib/presence-manager';

// Set user online
await setPresence('room-abc123', 'user-123', 'active');

// Set user offline
await setOffline('room-abc123', 'user-123');

// Subscribe to presence changes
const unsubscribe = subscribeToPresence('room-abc123', (users) => {
  console.log('Online users:', users);
});
```

### activity-stream.js

```javascript
import { logActivity, subscribeToActivity } 
  from '@/lib/activity-stream';

// Log activity
await logActivity('user-123', {
  type: 'message',
  metadata: { roomId: 'room-abc123' }
});

// Subscribe to activities
const unsubscribe = subscribeToActivity('user-123', (activities) => {
  console.log('Activities:', activities);
});
```

---

## Styling

All components use Tailwind CSS and support dark mode:

```jsx
// Dark mode automatically applied
<MessageThread /> // Light/dark based on system
```

### Custom Styling

Override with className prop (when available):

```jsx
<div className="dark:bg-gray-900 dark:text-white">
  <MessageThread />
</div>
```

---

## Integration Examples

### With GitHub Issues

```jsx
// pages/issues/[id].jsx
import IssueLinkedChannel from '@/components/collaboration/IssueLinkedChannel';

export default function IssueDetail({ issue }) {
  return (
    <div>
      <h1>{issue.title}</h1>
      <p>{issue.body}</p>
      
      {/* Discussion channel for this issue */}
      <IssueLinkedChannel 
        issueId={issue.number}
        issueTitle={`Discussion: ${issue.title}`}
      />
    </div>
  );
}
```

### In Dashboard

```jsx
// pages/dashboard.jsx
import { CollaborationProvider } from '@/contexts/collaboration';
import WorkspacePanel from '@/components/collaboration/WorkspacePanel';
import ContributorActivityFeed from '@/components/collaboration/ContributorActivityFeed';

export default function Dashboard() {
  const [roomId, setRoomId] = useState('general');

  return (
    <CollaborationProvider roomId={roomId}>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <WorkspacePanel roomId={roomId} title={`#${roomId}`} />
        </div>
        <div>
          <ContributorActivityFeed limit={15} />
        </div>
      </div>
    </CollaborationProvider>
  );
}
```

### Multiple Rooms

```jsx
import { CollaborationProvider } from '@/contexts/collaboration';

export default function MultiRoom() {
  const [activeRoom, setActiveRoom] = useState('general');
  const rooms = ['general', 'architecture', 'issues'];

  return (
    <>
      {/* Room selector */}
      <div className="flex gap-2 mb-4">
        {rooms.map(room => (
          <button
            key={room}
            onClick={() => setActiveRoom(room)}
            className={activeRoom === room ? 'bg-blue-600' : 'bg-gray-200'}
          >
            #{room}
          </button>
        ))}
      </div>

      {/* Active room */}
      <CollaborationProvider roomId={activeRoom} key={activeRoom}>
        <WorkspacePanel roomId={activeRoom} title={`#${activeRoom}`} />
      </CollaborationProvider>
    </>
  );
}
```

---

## Performance Tips

1. **Memoize components** to prevent unnecessary re-renders:
   ```jsx
   const MemoizedMessageThread = React.memo(MessageThread);
   ```

2. **Lazy load activity feed**:
   ```jsx
   const ActivityFeed = lazy(() => import('@/components/collaboration/ContributorActivityFeed'));
   ```

3. **Limit presence updates**:
   ```jsx
   // In presence-manager.js, batch updates
   const presenceInterval = setInterval(() => updatePresence(), 5000);
   ```

4. **Paginate messages**:
   ```jsx
   const [page, setPage] = useState(0);
   const messages = allMessages.slice(page * 50, (page + 1) * 50);
   ```

---

## Accessibility

Components follow WCAG 2.1 AA standards:

- Keyboard navigation support
- ARIA labels on interactive elements
- Semantic HTML structure
- Color contrast compliance
- Focus management

---

## Troubleshooting

### Messages not appearing
- Check `roomId` prop
- Verify Firestore security rules
- Check browser console for errors

### Presence not updating
- Verify user authentication
- Check presence collection in Firestore
- Review security rules

### Performance issues
- Reduce message history limit
- Implement pagination
- Archive old messages
- Enable Firestore indexing

---

## Future Enhancements

- [ ] Message reactions (👍, ❤️, etc.)
- [ ] Thread replies
- [ ] File attachments
- [ ] Voice messages
- [ ] Code snippet highlighting
- [ ] Mention notifications
- [ ] Search functionality
- [ ] Message editing/deletion

---

## Support

For component issues:
1. Check this guide
2. Review component source code
3. Check browser console errors
4. Open an issue with reproduction steps
