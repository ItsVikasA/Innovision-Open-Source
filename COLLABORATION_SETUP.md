# Real-Time Collaboration Workspace - Setup Guide

## Overview

The Collaboration Workspace is a real-time communication and coordination system for contributors and maintainers. It uses Firebase Firestore for real-time synchronization and requires no additional server infrastructure.

## Prerequisites

- Node.js v18+
- Firebase Project with Firestore enabled
- Valid Firebase credentials in `.env.local`

## Installation

### 1. Environment Setup

Ensure your `.env.local` contains Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_PROJECT_ID=your-project-id
NEXT_PUBLIC_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_APP_ID=your-app-id
```

### 2. Firestore Collections Setup

The following collections will be auto-created on first use:

```
collaborationRooms/          # Store room metadata
roomMessages/                # Store all messages per room
presence/                    # Track online users
contributorActivity/         # Log contributor activities
```

### 3. Security Rules (Firebase Console)

Add these Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write collaboration rooms
    match /collaborationRooms/{roomId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.createdBy;
    }

    // Allow messages in rooms
    match /roomMessages/{roomId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if request.auth.uid == resource.data.authorId;
    }

    // Allow presence tracking
    match /presence/{roomId}/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Allow activity logging
    match /contributorActivity/{userId}/activities/{activityId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### 4. Start Development Server

```bash
npm run dev
```

Access at: `http://localhost:3000/collaboration`

## Feature Access

### Main Routes
- **Collaboration Workspace**: `/collaboration`
- **API Endpoints**: `/api/collaboration/*`

### Components
- `WorkspacePanel` - Main collaboration UI
- `MessageThread` - Chat interface
- `PresenceIndicator` - Online status display
- `IssueLinkedChannel` - Issue-specific discussions
- `ContributorActivityFeed` - Activity stream
- `ContributorDirectory` - Contributor listing

## Testing

### Manual Testing

1. **Open two browser tabs** to `http://localhost:3000/collaboration`
2. **Send a message** in Tab 1
3. **Verify real-time sync** in Tab 2
4. **Check presence indicator** shows both users online

### Run Test Suite

```bash
npm run test
npm run test:watch
```

## Configuration

### Room Types

Supported room types in `collaborationRooms`:
- `repository` - Project-wide discussions
- `issue` - Issue-specific threads
- `discussion` - General discussions
- `workspace` - Team coordination

### Activity Types

Logged in `contributorActivity`:
- `message` - Message sent
- `code_push` - Code pushed
- `pr_created` - Pull request created
- `issue_resolved` - Issue resolved
- `collaboration_started` - Joined workspace

## Monitoring

### Check Real-Time Connections

Firebase Console → Firestore → View collections:
- Monitor `presence` collection for active users
- Check `roomMessages` for message throughput
- Review `contributorActivity` for engagement metrics

### Performance Tips

1. **Limit message history** - Only load last 50 messages initially
2. **Optimize presence updates** - Batch updates every 5 seconds
3. **Archive old messages** - Move messages older than 90 days to backup collection
4. **Index important queries** - Add composite indexes for message filters

## Troubleshooting

### Issue: "Firebase: Error (auth/invalid-api-key)"
**Solution**: Verify `.env.local` has correct Firebase credentials

### Issue: Messages not syncing
**Solution**: Check Firestore security rules and user authentication

### Issue: Presence not updating
**Solution**: Verify presence collection exists and user permissions are set

### Issue: High Firestore costs
**Solution**: Implement message pagination and archive old messages

## Scaling Considerations

### For Large Teams (100+ contributors)

1. **Message Pagination**
   ```javascript
   // Load 50 messages initially, paginate on scroll
   const q = query(..., limit(50));
   ```

2. **Activity Sampling**
   ```javascript
   // Log activities at 10% sample rate for high-traffic rooms
   if (Math.random() < 0.1) logActivity(...);
   ```

3. **Presence Batching**
   ```javascript
   // Update presence every 5 seconds instead of on every action
   const presenceInterval = setInterval(() => updatePresence(), 5000);
   ```

4. **Archive Strategy**
   ```javascript
   // Move messages older than 90 days to archive
   const archiveOldMessages = async () => {
     // Move to archvedRoomMessages collection
   };
   ```

## Future Enhancements

- [ ] Message search and filtering
- [ ] Thread replies and reactions
- [ ] File sharing and attachments
- [ ] Voice/video chat integration
- [ ] Mention notifications (@username)
- [ ] Integration with GitHub notifications
- [ ] Contributor analytics dashboard

## Support

For issues or questions:
1. Check this setup guide
2. Review API documentation
3. Open an issue on GitHub
4. Check Firebase console for errors

## License

Part of InnoVision open-source project. See LICENSE for details.
