# Chat Feature - Quick Reference Guide

## 🚀 Getting Started (5 minutes)

### Backend Setup
```bash
# 1. Install dependency
pip install drf-nested-routers

# 2. Run migration
python manage.py migrate chat

# 3. Start server
python manage.py runserver
```

### Frontend Setup
```bash
# Already integrated! Just run:
npm run dev
```

## 📱 How to Use

### For SME Users
1. **Find a CA**
   - Go to "CA Connect" from sidebar
   - Browse available CAs
   - Click "Connect" button

2. **Send Message**
   - Go to "Messages" from sidebar
   - Click on CA conversation
   - Type message and click Send

3. **Wait for Response**
   - Messages auto-refresh every 2 seconds
   - New messages appear at bottom
   - Unread badge shows count

### For CA Users
1. **Check Requests**
   - Go to "Messages" from sidebar
   - Click "Pending" tab
   - See incoming requests from SMEs

2. **Accept or Reject**
   - Click on request conversation
   - Choose "Accept Request" or "Reject Request"
   - Accepted conversations become active

3. **Chat with SME**
   - Active conversations show in "Active" tab
   - Type and send messages
   - Messages marked as read when viewed

## 🔌 API Quick Reference

### Base URL
```
http://localhost:8000/api/chat/
```

### Authentication
All requests need header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Common Endpoints

**Get all conversations**
```bash
GET /conversations/
```

**Get specific conversation with messages**
```bash
GET /conversations/{conversation_id}/
```

**Send connection request (SME)**
```bash
POST /conversations/
Body: {"ca": "ca_user_id"}
```

**Accept connection request (CA)**
```bash
PATCH /conversations/{conversation_id}/accept/
```

**Reject connection request (CA)**
```bash
PATCH /conversations/{conversation_id}/reject/
```

**Send message**
```bash
POST /conversations/{conversation_id}/messages/
Body: {"content": "Your message here"}
```

**Get messages in conversation**
```bash
GET /conversations/{conversation_id}/messages/?page=1&page_size=50
```

## 📊 Database Schema

### Conversations Table
```
id              UUID (Primary Key)
ca_id           UUID (Foreign Key to User)
sme_id          UUID (Foreign Key to User)
status          String (pending/accepted/rejected/active/closed)
created_at      DateTime
updated_at      DateTime
last_message_at DateTime
unread_by_ca    Integer
unread_by_sme   Integer
```

### Messages Table
```
id              UUID (Primary Key)
conversation_id UUID (Foreign Key)
sender_id       UUID (Foreign Key to User)
content         Text
is_read         Boolean
read_at         DateTime
created_at      DateTime
updated_at      DateTime
attachment      File (optional)
attachment_type String (optional)
```

## 🔐 Security Features

- ✅ JWT Authentication on all endpoints
- ✅ Role-based access control
- ✅ Users can only see their conversations
- ✅ CAs can only accept/reject their requests
- ✅ CORS protection enabled
- ✅ CSRF protection enabled

## ⚡ Performance Tips

1. **Database**
   - Indexes optimized for queries
   - Pagination: 50 messages per page
   - Last message cached in conversation

2. **Frontend**
   - Polling every 2 seconds (configurable)
   - Can be upgraded to WebSocket later
   - Messages auto-scroll to latest

3. **API**
   - Efficient filtering and ordering
   - No N+1 queries
   - Serialization optimized

## 🐛 Troubleshooting

### "Conversation already exists"
**Problem**: Tried to send connection request to same CA twice
**Solution**: Check existing conversations first

### "Cannot send messages"
**Problem**: Trying to message pending conversation
**Solution**: Wait for CA to accept request first

### "404 on /api/chat/"
**Problem**: Migration not run
**Solution**: 
```bash
python manage.py migrate chat
```

### "401 Unauthorized"
**Problem**: Missing or invalid JWT token
**Solution**: Login again and get fresh token

### "403 Forbidden"
**Problem**: User doesn't have permission
**Solution**: Verify:
- CA can only accept their own requests
- SME can only create requests as SME
- Both can only access their conversations

### Messages not appearing
**Problem**: Not seeing new messages
**Solution**:
- Check browser console for errors
- Verify conversation is active
- Try refreshing page
- Check that polling is running (every 2s)

## 📈 Monitoring

### Check Database
```bash
# Django shell
python manage.py shell

from chat.models import Conversation, Message

# See all conversations
Conversation.objects.all()

# See specific conversation messages
conv = Conversation.objects.first()
conv.messages.all()

# Check unread counts
conv.unread_by_ca
conv.unread_by_sme
```

### Check Logs
```bash
# Backend logs show:
# - Connection requests created
# - Messages sent
# - Errors during operations
```

### Admin Dashboard
```
http://localhost:8000/admin/
Go to: Chat → Conversations/Messages
```

## 📚 Documentation Files

1. **CHAT_FEATURE.md** - Complete technical documentation
2. **CHAT_SETUP_GUIDE.md** - Detailed setup instructions
3. **CHAT_ARCHITECTURE.md** - System architecture & diagrams
4. **CHAT_FEATURE_SUMMARY.md** - Implementation overview
5. **CHAT_IMPLEMENTATION_CHECKLIST.md** - Full checklist

## 🔄 Request/Response Examples

### Create Connection Request
```json
// Request
POST /api/chat/conversations/
{
  "ca": "550e8400-e29b-41d4-a716-446655440000"
}

// Response (201 Created)
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "ca": "550e8400-e29b-41d4-a716-446655440000",
  "ca_detail": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "ca_user",
    "email": "ca@example.com",
    "business_name": "CA Firm"
  },
  "sme": "550e8400-e29b-41d4-a716-446655440002",
  "sme_detail": { ... },
  "status": "pending",
  "created_at": "2026-03-12T10:30:00Z",
  "unread_count": 0,
  "other_participant": { ... }
}
```

### Send Message
```json
// Request
POST /api/chat/conversations/550e8400-e29b-41d4-a716-446655440001/messages/
{
  "content": "Hello, I need help with GST filing"
}

// Response (201 Created)
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "conversation": "550e8400-e29b-41d4-a716-446655440001",
  "sender": "550e8400-e29b-41d4-a716-446655440002",
  "sender_id": "550e8400-e29b-41d4-a716-446655440002",
  "content": "Hello, I need help with GST filing",
  "is_read": false,
  "read_at": null,
  "created_at": "2026-03-12T10:35:00Z"
}
```

### Accept Conversation
```json
// Request
PATCH /api/chat/conversations/550e8400-e29b-41d4-a716-446655440001/accept/

// Response (200 OK)
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "status": "active",
  "ca": "550e8400-e29b-41d4-a716-446655440000",
  "sme": "550e8400-e29b-41d4-a716-446655440002",
  "created_at": "2026-03-12T10:30:00Z",
  "updated_at": "2026-03-12T10:36:00Z"
}
```

## 🎯 Key Features Checklist

- ✅ SME sends connection requests to CA
- ✅ CA accepts/rejects requests
- ✅ Both send and receive messages
- ✅ Real-time updates (polling)
- ✅ Unread message counts
- ✅ Read receipts
- ✅ Message timestamps
- ✅ Status tracking
- ✅ Secure authentication
- ✅ Role-based permissions
- ✅ Admin interface
- ✅ Responsive UI

## 🚀 Next Steps

1. **Test locally** - Follow setup guide
2. **Deploy to staging** - Test in staging environment
3. **User acceptance testing** - Get feedback from users
4. **Refine features** - Based on feedback
5. **Production deployment** - Go live!

## 📞 Support Resources

- Check CHAT_SETUP_GUIDE.md for setup issues
- Check CHAT_ARCHITECTURE.md for technical details
- Check browser console for frontend errors
- Check server logs for backend errors
- Check admin panel for database verification

---

**You're all set! Happy chatting! 💬**

For more info, see the comprehensive documentation files included in the project.
