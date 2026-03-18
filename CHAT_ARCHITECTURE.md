# Chat Feature - Technical Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          TAXORA CHAT SYSTEM                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React/TypeScript)                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────┐         ┌──────────────────────┐               │
│  │   App.tsx Router    │         │   Layout Component   │               │
│  │  (Main Entry Point) │         │  (Menu Integration)  │               │
│  └──────────┬──────────┘         └──────────┬───────────┘               │
│             │                               │                            │
│             ▼                               ▼                            │
│  ┌─────────────────────────────────────────────────────┐                │
│  │         ChatComponent (Chat.tsx)                    │                │
│  │  ┌──────────────┐         ┌──────────────────────┐ │                │
│  │  │ Conversation │         │   Message Display    │ │                │
│  │  │   List View  │         │   & Input Area       │ │                │
│  │  │              │         │                      │ │                │
│  │  │ • Active     │         │ • Auto-scroll        │ │                │
│  │  │ • Pending    │         │ • Read status        │ │                │
│  │  │ • All        │         │ • Timestamps         │ │                │
│  │  │ • Unread     │         │ • Message composer   │ │                │
│  │  └──────────────┘         └──────────────────────┘ │                │
│  └─────────────────────────────────────────────────────┘                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                │
│  │      Chat Service (chat.ts)                         │                │
│  │                                                      │                │
│  │  • getConversations()                               │                │
│  │  • getConversation(id)                              │                │
│  │  • sendConnectionRequest(caId)                      │                │
│  │  • acceptConnectionRequest(id)                      │                │
│  │  • rejectConnectionRequest(id)                      │                │
│  │  • sendMessage(convId, content, file)              │                │
│  │  • getMessages(convId)                              │                │
│  │  • markConversationAsRead(convId)                   │                │
│  │  • Polling every 2 seconds                          │                │
│  └─────────────────────────────────────────────────────┘                │
│             │                                                            │
│             │ REST API Calls (JSON)                                      │
│             │ with JWT Authentication                                    │
│             ▼                                                            │
└──────────────────────────────────────────────────────────────────────────┘
                         HTTP/REST Boundary
┌──────────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Django REST API)                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────┐                │
│  │         API URLs (urls.py)                          │                │
│  │                                                      │                │
│  │  GET    /api/chat/conversations/                    │                │
│  │  POST   /api/chat/conversations/                    │                │
│  │  GET    /api/chat/conversations/{id}/               │                │
│  │  PATCH  /api/chat/conversations/{id}/accept/        │                │
│  │  PATCH  /api/chat/conversations/{id}/reject/        │                │
│  │  PATCH  /api/chat/conversations/{id}/mark_as_read/  │                │
│  │  GET    /api/chat/conversations/{id}/messages/      │                │
│  │  POST   /api/chat/conversations/{id}/messages/      │                │
│  └─────────────────────────────────────────────────────┘                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                │
│  │    ViewSets (views.py)                              │                │
│  │                                                      │                │
│  │  ┌─────────────────────────────────────────────┐   │                │
│  │  │ ConversationViewSet                         │   │                │
│  │  │  • list()                                   │   │                │
│  │  │  • retrieve()                               │   │                │
│  │  │  • create()                                 │   │                │
│  │  │  • accept()                                 │   │                │
│  │  │  • reject()                                 │   │                │
│  │  │  • mark_as_read()                           │   │                │
│  │  └─────────────────────────────────────────────┘   │                │
│  │  ┌─────────────────────────────────────────────┐   │                │
│  │  │ MessageViewSet                              │   │                │
│  │  │  • list()                                   │   │                │
│  │  │  • create()                                 │   │                │
│  │  └─────────────────────────────────────────────┘   │                │
│  └─────────────────────────────────────────────────────┘                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                │
│  │    Serializers (serializers.py)                     │                │
│  │                                                      │                │
│  │  • ConversationListSerializer                       │                │
│  │  • ConversationDetailSerializer                     │                │
│  │  • MessageSerializer                                │                │
│  │  • MessageCreateSerializer                          │                │
│  │  • ConversationCreateSerializer                     │                │
│  └─────────────────────────────────────────────────────┘                │
│             │                                                            │
│             ▼                                                            │
│  ┌─────────────────────────────────────────────────────┐                │
│  │    Models (models.py)                               │                │
│  │                                                      │                │
│  │  ┌──────────────────────┐                           │                │
│  │  │ Conversation         │                           │                │
│  │  │                      │                           │                │
│  │  │ • id (UUID)          │                           │                │
│  │  │ • ca (FK→User)       │                           │                │
│  │  │ • sme (FK→User)      │                           │                │
│  │  │ • status             │                           │                │
│  │  │ • created_at         │                           │                │
│  │  │ • updated_at         │                           │                │
│  │  │ • last_message_at    │                           │                │
│  │  │ • unread_by_ca       │                           │                │
│  │  │ • unread_by_sme      │                           │                │
│  │  └──────────────────────┘                           │                │
│  │  ┌──────────────────────┐                           │                │
│  │  │ Message              │                           │                │
│  │  │                      │                           │                │
│  │  │ • id (UUID)          │                           │                │
│  │  │ • conversation (FK)  │                           │                │
│  │  │ • sender (FK→User)   │                           │                │
│  │  │ • content            │                           │                │
│  │  │ • is_read            │                           │                │
│  │  │ • read_at            │                           │                │
│  │  │ • created_at         │                           │                │
│  │  │ • attachment (opt)   │                           │                │
│  │  └──────────────────────┘                           │                │
│  └─────────────────────────────────────────────────────┘                │
│             │                                                            │
│             ▼                                                            │
└──────────────────────────────────────────────────────────────────────────┘
                      Database Boundary (ORM)
┌──────────────────────────────────────────────────────────────────────────┐
│                    DATABASE (SQLite/PostgreSQL)                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────────────────────────────────┐               │
│  │  conversations Table                                 │               │
│  │  ┌────┬────┬────┬────────┬──────┬────────────┬────┐ │               │
│  │  │ id │ ca │ sme│ status │ ...  │ created_at │ ... │ │               │
│  │  └────┴────┴────┴────────┴──────┴────────────┴────┘ │               │
│  │  Indexes: (ca, status), (sme, status), (last_msg)   │               │
│  └──────────────────────────────────────────────────────┘               │
│  ┌──────────────────────────────────────────────────────┐               │
│  │  messages Table                                      │               │
│  │  ┌────┬──────┬──────┬─────────┬──────┬──────────┬──┐ │               │
│  │  │ id │ conv │sender│ content │ ...  │created_at│..│ │               │
│  │  └────┴──────┴──────┴─────────┴──────┴──────────┴──┘ │               │
│  │  Indexes: (conversation, created_at), (sender)       │               │
│  └──────────────────────────────────────────────────────┘               │
│  ┌──────────────────────────────────────────────────────┐               │
│  │  users Table                                         │               │
│  │  ┌────┬──────┬──────┬──────┬──────┬──────┬─────────┐ │               │
│  │  │ id │ user │ pass │ role │ mail │ name │ created │ │               │
│  │  └────┴──────┴──────┴──────┴──────┴──────┴─────────┘ │               │
│  │  (Existing Taxora users table)                       │               │
│  └──────────────────────────────────────────────────────┘               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Flow 1: SME Sends Connection Request
```
SME Browser                              Backend                    Database
    │                                       │                           │
    │ 1. Click "Connect" on CA              │                           │
    ├──────────────────────►                │                           │
    │                 2. sendConnectionRequest(caId)                     │
    ├──────────────────────────────────────►                            │
    │                                   3. POST /api/chat/conversations/ │
    │                                       │                           │
    │                                   4. ConversationViewSet.create() │
    │                                       │                           │
    │                                   5. Validate CA exists           │
    │                                       │ Check unique constraint    │
    │                                       ├──────────────────────────►│
    │                                       │◄──────────────────────────┤
    │                                   6. Create Conversation          │
    │                                       │ status = "pending"        │
    │                                       ├──────────────────────────►│
    │                                       │◄──────────────────────────┤
    │                                   7. Return Conversation Data     │
    │◄──────────────────────────────────────────────────────────────────┤
    │ 8. Show "Request sent!"                │                           │
    │    status = "pending"                  │                           │
```

### Flow 2: CA Accepts Request & Chat Begins
```
CA Browser                              Backend                    Database
    │                                       │                           │
    │ 1. Open Messages → Pending tab        │                           │
    ├──────────────────────►                │                           │
    │                 2. getConversations() │                           │
    ├──────────────────────────────────────►                            │
    │                                       │                           │
    │                                   3. List pending conversations   │
    │                                       │                           │
    │                                       ├──────────────────────────►│
    │◄──────────────────────────────────────────────────────────────────┤
    │ 4. Display pending request            │                           │
    │    SME: "Tech Startup LLC"            │                           │
    │                                       │                           │
    │ 5. Click "Accept" button              │                           │
    ├──────────────────────►                │                           │
    │                 6. acceptConnectionRequest(convId)                │
    ├──────────────────────────────────────►                            │
    │                                       │                           │
    │                                   7. PATCH /api/chat/conv/accept/ │
    │                                       │                           │
    │                                   8. Update Conversation          │
    │                                       │ status = "active"         │
    │                                       ├──────────────────────────►│
    │                                       │◄──────────────────────────┤
    │                                   9. Return Updated Conversation  │
    │◄──────────────────────────────────────────────────────────────────┤
    │ 10. Show conversation in Active tab   │                           │
    │     Now can send messages             │                           │
```

### Flow 3: Exchange Messages
```
SME Browser                             Backend                    Database
    │                                       │                           │
    │ 1. Type message: "Hello"              │                           │
    │    Click Send                         │                           │
    ├──────────────────────►                │                           │
    │              2. sendMessage(content)  │                           │
    ├──────────────────────────────────────►                            │
    │                                       │                           │
    │                                   3. Validate conversation status │
    │                                       │ (must be "active")        │
    │                                       │                           │
    │                                   4. Create Message              │
    │                                       │ sender = SME              │
    │                                       │ content = "Hello"         │
    │                                       ├──────────────────────────►│
    │                                       │◄──────────────────────────┤
    │                                   5. Update Conversation          │
    │                                       │ last_message_at = now()   │
    │                                       │ unread_by_ca += 1         │
    │                                       ├──────────────────────────►│
    │                                       │◄──────────────────────────┤
    │                                   6. Return Message              │
    │◄──────────────────────────────────────────────────────────────────┤
    │ 7. Display message "Hello"            │                           │
    │    Status: "sent" ✓                   │                           │
    │                                       │                           │
    │ [2 second polling interval]           │                           │
    │                                       │                           │
                                         CA BROWSER (Polling)
                                       │                           │
                                   8. getConversation(convId)
                                   9. Get messages from DB
                                       ├──────────────────────────►│
                                       │◄──────────────────────────┤
                                   10. Return messages with SME msg
                                       │
                                   11. Display "Hello" from SME  ◄──┐
                                       │                            │
    │                                       │                           │
    │                        [CA responds]   │                           │
    │                                       │                           │
    │ [Polling continues showing new reply] │                           │
```

## Authentication & Authorization Flow

```
┌────────────────────────────────────────────────────────────────┐
│              JWT Authentication & Authorization               │
└────────────────────────────────────────────────────────────────┘

User Login
    │
    ▼
┌─────────────────────────────────────────────────┐
│ POST /api/auth/login/                           │
│ Body: {username, password}                      │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Generate JWT Tokens:                            │
│ • access_token (15 min expiry)                  │
│ • refresh_token (7 day expiry)                  │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Store tokens in localStorage                    │
│ • accessToken                                   │
│ • refreshToken                                  │
└─────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────┐
│ All API Requests                                │
│ Header: Authorization: Bearer {accessToken}    │
└─────────────────────────────────────────────────┘
    │
    ├──► Backend Validates Token
    │       │
    │       ├─► Valid? → Process Request
    │       │
    │       └─► Expired? → Try refresh_token
    │               │
    │               └─► Get new access_token
    │
    └──► Role-Based Checks (CA vs SME)
            │
            ├─► Only CA can: accept/reject requests
            │
            └─► Only SME can: create requests


Permission Checks in Views
    │
    ├─► Is user authenticated? (has valid JWT)
    │
    ├─► For Conversation endpoints:
    │   └─► User must be CA or SME in conversation
    │
    ├─► For Accept/Reject:
    │   └─► User must be CA in conversation
    │
    └─► For Message creation:
        └─► Conversation must be "active" or "accepted"
```

## Real-time Communication (Current: Polling)

```
Frontend Polling Mechanism:
┌──────────────────────────────────────────────┐
│ Initial Load                                  │
│ ├─ getConversations()                         │
│ └─ Load all conversations with last messages  │
└──────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│ Every 2 seconds (setInterval)                 │
│ ├─ getConversations()                         │
│ ├─ Check for new messages                     │
│ ├─ Update unread counts                       │
│ └─ Refresh UI with latest data                │
└──────────────────────────────────────────────┘
         │
         ├─► No new messages
         │   └─ No UI update
         │
         └─► New messages
             ├─ Update message list
             ├─ Scroll to new message
             ├─ Play notification (optional)
             └─ Update unread badge


Future: WebSocket Upgrade
┌──────────────────────────────────────────────┐
│ WebSocket Connection (django-channels)       │
│ ├─ ws://localhost:8000/ws/chat/{conv_id}/   │
│ │                                            │
│ ├─ Message sent immediately                  │
│ ├─ Status updates in real-time               │
│ ├─ Typing indicators                         │
│ └─ Connection status visible                 │
└──────────────────────────────────────────────┘
```

## Component Hierarchy

```
App
├─ LoginForm
│   └─ (Authentication)
│
└─ Layout
    ├─ Sidebar with Menu
    │   ├─ Dashboard
    │   ├─ Scan Invoice
    │   ├─ Transactions
    │   ├─ Documents
    │   ├─ CA Connect
    │   ├─ Messages  ◄───────── CHAT FEATURE
    │   └─ Settings
    │
    └─ Main Content Area
        └─ Current View Component
            │
            ├─ CAConnect (updated)
            │   └─ Uses chatService.sendConnectionRequest()
            │
            ├─ Chat (NEW)
            │   ├─ ConversationList (left sidebar)
            │   ├─ ChatArea (main area)
            │   ├─ MessageList
            │   └─ MessageComposer
            │
            └─ ... Other components
```

---

This architecture ensures:
- ✓ Clean separation of concerns (frontend/backend)
- ✓ RESTful API design
- ✓ Secure JWT authentication
- ✓ Real-time message delivery (polling, upgradeable to WebSocket)
- ✓ Scalable database design with proper indexes
- ✓ Role-based access control
- ✓ Error handling and validation at multiple layers
