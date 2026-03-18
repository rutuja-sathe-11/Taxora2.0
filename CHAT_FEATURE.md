# Chat Feature Implementation

## Overview
The chat feature enables real-time communication between SME (Small & Medium Enterprise) users and CA (Chartered Accountant) users. SMEs can send connection requests to CAs, and once accepted, they can exchange messages.

## Architecture

### Backend (Django REST API)

#### Models
Located in `backend/chat/models.py`:

1. **Conversation Model**
   - Represents a chat session between one CA and one SME
   - Status: pending, accepted, rejected, active, closed
   - Tracks unread message counts for both participants
   - Unique constraint on (ca, sme) pairs

2. **Message Model**
   - Individual messages sent within conversations
   - Tracks sender, content, read status, and timestamps
   - Supports optional file attachments
   - Automatically marks timestamps when read

#### API Endpoints
Located in `backend/chat/urls.py`:

**Conversation Endpoints:**
- `GET /api/chat/conversations/` - List all conversations
- `GET /api/chat/conversations/{id}/` - Get conversation with all messages
- `POST /api/chat/conversations/` - SME creates new conversation (sends request to CA)
- `PATCH /api/chat/conversations/{id}/accept/` - CA accepts pending request
- `PATCH /api/chat/conversations/{id}/reject/` - CA rejects pending request
- `PATCH /api/chat/conversations/{id}/mark_as_read/` - Mark all messages as read

**Message Endpoints:**
- `GET /api/chat/conversations/{conversation_id}/messages/` - List messages (paginated)
- `POST /api/chat/conversations/{conversation_id}/messages/` - Send new message

#### Serializers
Located in `backend/chat/serializers.py`:
- `ConversationListSerializer` - For conversation lists with last message preview
- `ConversationDetailSerializer` - Full conversation with all messages
- `MessageSerializer` - Individual message details
- `MessageCreateSerializer` - Creating new messages
- `ConversationCreateSerializer` - Creating connection requests

### Frontend (React/TypeScript)

#### Chat Service
Located in `frontend/src/services/chat.ts`:
- `getConversations()` - Fetch all conversations
- `getConversation(id)` - Get specific conversation
- `sendConnectionRequest(caId)` - SME sends request to CA
- `acceptConnectionRequest(id)` - CA accepts request
- `rejectConnectionRequest(id)` - CA rejects request
- `sendMessage()` - Send message with optional attachment
- `getMessages()` - Fetch messages (paginated)
- `markConversationAsRead()` - Mark all messages as read

#### Chat Component
Located in `frontend/src/components/Chat.tsx`:
- Left sidebar showing conversation list
- Tabs for filtering (Active, Pending, All)
- Unread message badges
- Main chat area with message history
- Real-time message display with sender info
- Input area for composing messages
- Accept/Reject buttons for pending requests
- Auto-scroll to latest message

#### Integration Points
1. **Menu** - Added "Messages" menu item in Layout component
2. **App Router** - Chat component integrated into App.tsx
3. **CAConnect** - Updated to use chatService for connection requests

## Workflow

### SME → CA Connection Flow

1. **SME Initiates Connection**
   - SME visits "CA Connect" page
   - Clicks "Connect" button on desired CA
   - `chatService.sendConnectionRequest(caId)` is called
   - Backend creates Conversation with status="pending"

2. **CA Receives Request**
   - CA views "Messages" tab
   - Sees pending conversation in "Pending" filter
   - Can see SME's business info and request

3. **CA Accepts/Rejects**
   - CA clicks "Accept" or "Reject" button
   - Status updates to "active" or "rejected"

4. **Active Chat**
   - Both parties can now send messages
   - Messages are marked as read when viewed
   - Unread count updates in real-time (polling every 2 seconds)
   - New messages appear with timestamp and read status

## Database Schema

### Conversation Table
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    ca_id UUID NOT NULL,
    sme_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP AUTO,
    updated_at TIMESTAMP AUTO,
    last_message_at TIMESTAMP NULL,
    unread_by_ca INT DEFAULT 0,
    unread_by_sme INT DEFAULT 0,
    UNIQUE(ca_id, sme_id),
    FOREIGN KEY (ca_id) REFERENCES users(id),
    FOREIGN KEY (sme_id) REFERENCES users(id)
);
```

### Message Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP AUTO,
    updated_at TIMESTAMP AUTO,
    attachment VARCHAR(255) NULL,
    attachment_type VARCHAR(20) NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

## Authentication & Authorization

- All endpoints require JWT authentication
- Endpoints verify user is CA or SME
- Users can only access their own conversations
- CAs can only accept/reject conversations where they are the CA
- SMEs can only create conversations where they are the SME

## Polling vs WebSocket

Currently, the frontend uses **polling** (fetches every 2 seconds) for real-time updates. For production, consider:

### Future Enhancement: WebSocket
- Install `django-channels` for WebSocket support
- Implement real-time message delivery
- Update unread counts instantly
- Better performance for multiple concurrent conversations

## Installation & Setup

### Backend
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run migrations:
   ```bash
   python manage.py migrate chat
   ```

3. Create admin user and test in Django admin:
   ```bash
   python manage.py createsuperuser
   ```

### Frontend
1. No additional dependencies needed (already included)
2. Chat component automatically imported in App.tsx
3. Services available via `chatService` import

## Testing

### Manual Testing Workflow
1. Create two users: one SME, one CA
2. Login as SME
3. Go to "CA Connect" and click "Connect" on the CA
4. Login as CA
5. Go to "Messages" and see pending request
6. Accept the request
7. Both can now send messages

### API Testing with cURL
```bash
# Get conversations
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/chat/conversations/

# Send connection request
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ca": "ca-user-id"}' \
  http://localhost:8000/api/chat/conversations/

# Accept request
curl -X PATCH -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/chat/conversations/CONV-ID/accept/

# Send message
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello!"}' \
  http://localhost:8000/api/chat/conversations/CONV-ID/messages/
```

## Performance Considerations

1. **Message Pagination** - Messages are paginated with 50 items per page
2. **Indexes** - Database indexes on frequently queried fields
3. **Unread Count** - Cached at conversation level for quick access
4. **Query Optimization** - Uses select_related() and prefetch_related() where applicable

## Security Features

1. **JWT Authentication** - All endpoints require valid token
2. **Role-Based Access** - Different permissions for CA vs SME
3. **Conversation Privacy** - Users can only access their conversations
4. **CORS Enabled** - Cross-origin requests handled properly
5. **File Upload Validation** - Optional attachment support with type checking

## Future Enhancements

1. **WebSocket Support** - Real-time message delivery without polling
2. **File Attachments** - Full support for sharing documents, invoices
3. **Message Search** - Search functionality across conversations
4. **Message Reactions** - Emoji reactions to messages
5. **Typing Indicator** - Show when someone is typing
6. **Read Receipts** - Show when messages are read by recipient
7. **Message Editing** - Edit sent messages
8. **Message Deletion** - Delete messages with timestamp
9. **Group Conversations** - Multiple CAs per SME
10. **Video/Audio Calls** - Integration with WebRTC
