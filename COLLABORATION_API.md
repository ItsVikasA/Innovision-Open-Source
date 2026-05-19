# Collaboration Workspace - API Documentation

## Base URL

```
http://localhost:3000/api/collaboration
```

## Authentication

All endpoints require user authentication via Firebase Auth. Include Firebase ID token in requests:

```javascript
const idToken = await user.getIdToken();
fetch(url, {
  headers: { 'Authorization': `Bearer ${idToken}` }
});
```

---

## Endpoints

### Rooms

#### Create Room

**POST** `/rooms`

Create a new collaboration room.

**Request Body:**
```json
{
  "name": "Architecture Discussion",
  "type": "repository|issue|discussion|workspace",
  "linkedRepo": "Innovision-Open-Source",
  "linkedIssue": "123"
}
```

**Response:**
```json
{
  "roomId": "room-abc123"
}
```

**Status Codes:**
- `200` - Room created successfully
- `400` - Missing required fields
- `500` - Server error

---

#### Get Room

**GET** `/rooms?roomId=room-abc123`

Retrieve room metadata.

**Query Parameters:**
- `roomId` (required) - Room ID to fetch

**Response:**
```json
{
  "id": "room-abc123",
  "name": "Architecture Discussion",
  "type": "repository",
  "linkedRepo": "Innovision-Open-Source",
  "linkedIssue": "123",
  "createdAt": "2024-01-15T10:30:00Z",
  "lastActivity": "2024-01-15T14:45:30Z"
}
```

**Status Codes:**
- `200` - Room found
- `400` - Missing roomId parameter
- `404` - Room not found
- `500` - Server error

---

### Messages

#### Send Message

**POST** `/messages`

Send a message to a room.

**Request Body:**
```json
{
  "roomId": "room-abc123",
  "content": "This is a message",
  "authorId": "user-123",
  "authorName": "John Doe",
  "authorAvatar": "https://example.com/avatar.jpg"
}
```

**Response:**
```json
{
  "success": true
}
```

**Validation:**
- `content` - Required, max 2000 characters, trimmed
- `authorId` - Required
- `authorName` - Optional, defaults to "Anonymous"
- `authorAvatar` - Optional, defaults to empty string

**Status Codes:**
- `200` - Message sent successfully
- `400` - Missing required fields or invalid content
- `500` - Server error

---

### Presence

#### Update Presence

**POST** `/presence`

Update user online status in a room.

**Request Body:**
```json
{
  "roomId": "room-abc123",
  "userId": "user-123",
  "status": "active|idle|offline",
  "online": true
}
```

**Response:**
```json
{
  "success": true,
  "online": true,
  "status": "active"
}
```

**Status Values:**
- `active` - User is actively participating
- `idle` - User is idle but present
- `offline` - User is offline

**Status Codes:**
- `200` - Presence updated
- `400` - Missing required fields
- `500` - Server error

---

### Activity

#### Log Activity

**POST** `/activity`

Log a contributor activity.

**Request Body:**
```json
{
  "userId": "user-123",
  "type": "message|code_push|pr_created|issue_resolved|collaboration_started",
  "metadata": {
    "roomId": "room-abc123",
    "username": "John Doe",
    "prNumber": 456,
    "issueNumber": 123
  }
}
```

**Activity Types:**
| Type | Description | Metadata |
|------|-------------|----------|
| `message` | User sent a message | `roomId` |
| `code_push` | User pushed code | `branch`, `files` |
| `pr_created` | User created PR | `prNumber`, `title` |
| `issue_resolved` | User resolved issue | `issueNumber` |
| `collaboration_started` | User joined workspace | `roomId` |

**Response:**
```json
{
  "success": true,
  "type": "message",
  "timestamp": "2024-01-15T14:45:30Z"
}
```

**Status Codes:**
- `200` - Activity logged
- `400` - Missing fields or invalid activity type
- `500` - Server error

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing required fields` | Required field not provided | Check request body |
| `Invalid activity type` | Activity type not in allowed list | Use valid types |
| `Firebase: Error (permission-denied)` | Firestore security rules deny access | Check user auth |
| `Firebase: Error (failed-precondition)` | Firestore not initialized | Verify Firebase setup |

---

## Rate Limiting

- **Messages**: 10 messages per minute per user
- **Presence updates**: 1 update per 5 seconds per user
- **Activity logs**: 100 logs per minute per user

Exceeding limits returns `429 Too Many Requests`.

---

## Usage Examples

### JavaScript/Node.js

```javascript
// Send a message
const response = await fetch('/api/collaboration/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({
    roomId: 'room-abc123',
    content: 'Hello team!',
    authorId: user.uid,
    authorName: user.displayName
  })
});

const result = await response.json();
console.log(result); // { success: true }
```

### React Component

```jsx
async function sendCollaborationMessage() {
  const { user } = useAuth();
  const { roomId } = useCollaboration();

  const response = await fetch('/api/collaboration/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId,
      content: message,
      authorId: user.uid,
      authorName: user.displayName
    })
  });

  if (response.ok) {
    setMessage(''); // Clear input
  }
}
```

### cURL

```bash
curl -X POST http://localhost:3000/api/collaboration/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -d '{
    "roomId": "room-abc123",
    "content": "Hello from CLI",
    "authorId": "user-123",
    "authorName": "CLI User"
  }'
```

---

## WebSocket Events (Future)

These will be added in a future update for improved real-time performance:

- `message:new` - New message received
- `presence:update` - User presence changed
- `room:users-updated` - Room user list changed

---

## Versioning

Current API version: **1.0.0**

Future versions will maintain backward compatibility unless major version changes.

---

## Support

For API issues:
1. Check error response message
2. Verify Firebase security rules
3. Review this documentation
4. Open an issue with API error details
