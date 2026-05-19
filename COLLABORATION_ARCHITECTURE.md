# Collaboration Workspace - Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Pages                 Components              Contexts      │
│  ├── /collaboration   ├── WorkspacePanel     ├── collaboration
│  │                    ├── MessageThread      │   (useCollaboration)
│  │                    ├── PresenceIndicator │
│  │                    ├── IssueLinkedChannel│
│  │                    ├── ActivityFeed      │
│  │                    └── Directory         │
│  │                                           │
│  │ ┌──────────────────────────────────────┤
│  └─┤         React Hooks & State            │
│    ├── useEffect (listeners)                │
│    ├── useState (local state)               │
│    └── useCollaboration (context)           │
│                                              │
└─────────────────────────────────────────────────────────────┘
             │
             │ HTTP/WebSocket
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Layer (Next.js Routes)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  /api/collaboration                                          │
│  ├── /rooms (POST, GET)                                      │
│  ├── /messages (POST)                                        │
│  ├── /presence (POST)                                        │
│  └── /activity (POST)                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
             │
             │ Firestore SDK
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Services Layer (src/lib)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ├── collaboration-service.js (room management)              │
│  ├── message-store.js (message operations)                   │
│  ├── presence-manager.js (status tracking)                   │
│  └── activity-stream.js (activity logging)                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
             │
             │ Real-time Listeners
             ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Firestore (Database)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Collections                                                 │
│  ├── collaborationRooms                                      │
│  ├── roomMessages                                            │
│  ├── presence                                                │
│  └── contributorActivity                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Message Sending

```
User Input
    ↓
MessageThread Component
    ↓
sendMessage(api call)
    ↓
/api/collaboration/messages (route)
    ↓
message-store.js
    ↓
Firestore addDoc
    ↓
Real-time listener triggered
    ↓
subscribeToMessages callback
    ↓
Update React state
    ↓
MessageThread re-renders
    ↓
New message displayed
```

### Presence Update

```
User joins room
    ↓
CollaborationProvider useEffect
    ↓
setPresence(api call)
    ↓
/api/collaboration/presence (route)
    ↓
presence-manager.js
    ↓
Firestore setDoc
    ↓
Real-time listener triggered
    ↓
subscribeToPresence callback
    ↓
Update presence state
    ↓
PresenceIndicator re-renders
    ↓
Online count updated
```

## Collection Schema

### collaborationRooms

```javascript
{
  id: "room-uuid",
  name: "Architecture Discussion",
  type: "repository|issue|discussion|workspace",
  linkedRepo: "Innovision-Open-Source",
  linkedIssue: "123",
  createdAt: Timestamp,
  lastActivity: Timestamp,
  createdBy: "user-uuid"
}
```

**Indexes:**
- `type, createdAt (desc)`
- `linkedIssue, createdAt (desc)`
- `linkedRepo, lastActivity (desc)`

### roomMessages

```javascript
// Collection path: roomMessages/{roomId}/messages

{
  id: "msg-uuid",
  content: "Message text...",
  authorId: "user-uuid",
  authorName: "John Doe",
  authorAvatar: "https://example.com/avatar.jpg",
  timestamp: Timestamp,
  edited: false,
  editedAt: Timestamp | null,
  reactions: { "👍": ["user1", "user2"], "❤️": ["user3"] }
}
```

**Indexes:**
- `timestamp (asc)`
- `authorId, timestamp (desc)`

### presence

```javascript
// Collection path: presence/{roomId}/{userId}

{
  online: true,
  status: "active|idle|offline",
  lastSeen: Timestamp,
  roomList: ["room-1", "room-2"]
}
```

**Indexes:**
- `online, lastSeen (desc)`

### contributorActivity

```javascript
// Collection path: contributorActivity/{userId}/activities

{
  id: "activity-uuid",
  type: "message|code_push|pr_created|issue_resolved|collaboration_started",
  timestamp: Timestamp,
  metadata: {
    roomId: "room-uuid",
    username: "John Doe",
    prNumber: 456,
    issueNumber: 123,
    branch: "feature/auth"
  }
}
```

**Indexes:**
- `timestamp (desc)`
- `type, timestamp (desc)`

## Real-Time Synchronization

### Firestore Listeners

The system uses Firestore's `onSnapshot` listeners for real-time updates:

```javascript
// Message listener
onSnapshot(
  query(collection(db, 'roomMessages', roomId, 'messages'), orderBy('timestamp')),
  (snapshot) => {
    // Update component state on changes
    setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }
);
```

**Advantages:**
- Built-in real-time synchronization
- Automatic client-side caching
- Handles connection drops gracefully
- No additional server infrastructure

**Performance:**
- Listeners are shallow subscriptions (not deeply nested queries)
- Pagination prevents loading too many documents
- Archive strategy for old messages

## Authentication Flow

```
User (Google/GitHub OAuth)
    ↓
Firebase Auth
    ↓
ID Token generated
    ↓
Stored in AuthContext
    ↓
Passed to API routes
    ↓
Firestore Security Rules enforce access
    ↓
Operations allowed/denied based on userId
```

## Security Model

### Firestore Security Rules

```javascript
// User can read all collaboration rooms
match /collaborationRooms/{roomId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null;
}

// User can only write their own messages
match /roomMessages/{roomId}/messages/{messageId} {
  allow create: if request.auth != null && 
                request.resource.data.authorId == request.auth.uid;
  allow update, delete: if request.auth.uid == resource.data.authorId;
}

// User can only update their own presence
match /presence/{roomId}/{userId} {
  allow write: if request.auth.uid == userId;
}
```

**Principles:**
1. All operations require authentication
2. Users can only modify their own data
3. Reads are generally allowed for authenticated users
4. Activity logs are write-only by user

## Scalability Considerations

### For 1000+ Contributors

#### 1. Message Partitioning
```javascript
// Store messages by date for easier archival
roomMessages/{roomId}/{YYYY-MM-DD}/{messageId}
```

#### 2. Activity Sampling
```javascript
// Log activities at configurable rate
const ACTIVITY_SAMPLE_RATE = 0.1; // 10% sample
if (Math.random() < ACTIVITY_SAMPLE_RATE) {
  logActivity(...);
}
```

#### 3. Presence Batching
```javascript
// Update presence every 5 seconds
const PRESENCE_UPDATE_INTERVAL = 5000;
setInterval(() => updatePresence(), PRESENCE_UPDATE_INTERVAL);
```

#### 4. Message Archival
```javascript
// Move old messages to archive collection after 90 days
const archiveOldMessages = async () => {
  const ninetyDaysAgo = new Date(Date.now() - 90*24*60*60*1000);
  // Query and archive messages
};
```

#### 5. Read Replicas
```javascript
// Maintain read-only replicas in different regions
replicateToRegion('us-east', collections);
replicateToRegion('eu-west', collections);
```

### Cost Optimization

| Operation | Cost | Optimization |
|-----------|------|-------------|
| Listener subscription | 1 read per snapshot | Batch subscriptions |
| Message send | 1 write | Combine with activity |
| Presence update | 1 write | Batch every 5s |
| Activity log | 1 write | Sample at 10% |

## Deployment

### Production Checklist

- [ ] Update Firestore security rules
- [ ] Enable Firestore backups
- [ ] Set up Firestore monitoring
- [ ] Configure authentication (OAuth)
- [ ] Enable API rate limiting
- [ ] Set up error logging (Sentry)
- [ ] Configure CDN for static assets
- [ ] Enable CORS properly
- [ ] Set up database indexes
- [ ] Configure cost alerts

## Monitoring & Observability

### Metrics to Track

1. **Real-time Metrics**
   - Active users per room
   - Messages per minute
   - Average response time
   - Firestore read/write rates

2. **Performance Metrics**
   - Page load time
   - Message latency (send to display)
   - Listener initialization time
   - Component render time

3. **Business Metrics**
   - Daily active contributors
   - Average session duration
   - Message volume trends
   - Activity type distribution

### Logging

```javascript
// Log to Firestore for analysis
logger.info('user_joined_room', {
  userId,
  roomId,
  timestamp: new Date(),
  duration: performance.now() - startTime
});
```

## Future Enhancements

### Phase 3 (Thread Replies)
```
roomMessages/{roomId}/messages/{messageId}/replies/{replyId}
```

### Phase 4 (File Sharing)
```
roomFiles/{roomId}/files/{fileId}
{
  name, url, uploadedBy, uploadedAt, size, type
}
```

### Phase 5 (Message Search)
```
Search via Algolia or ElasticSearch
messageIndex/{messageId} → searchable copy
```

### Phase 6 (Notifications)
```
userNotifications/{userId}/notifications/{notificationId}
Trigger via Firestore Functions or Webhooks
```

## Testing Strategy

### Unit Tests
- Service functions with mocked Firestore
- Component rendering with mocked context
- Context providers with mocked auth

### Integration Tests
- API routes with mock Firestore
- Real-time listener simulations
- Presence update flows

### E2E Tests
- User joins room
- Sends message
- Message appears in other tab
- Presence updates
- Activity logs

## References

- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)
- [React Hooks Guide](https://react.dev/reference/react)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Tailwind CSS](https://tailwindcss.com)
