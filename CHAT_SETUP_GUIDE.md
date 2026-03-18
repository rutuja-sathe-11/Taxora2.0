# Quick Setup Guide - Chat Feature

## Prerequisites
- Python 3.8+
- Node.js 14+
- Django 4.2.7
- React 18+

## Backend Setup (Django)

### 1. Install Dependencies
```bash
cd backend
pip install drf-nested-routers
```

### 2. Run Migrations
```bash
python manage.py migrate chat
```

### 3. Create Test Users
```bash
# Access Django shell
python manage.py shell

# Create CA user
from django.contrib.auth import get_user_model
User = get_user_model()
ca = User.objects.create_user(
    username='ca_user@example.com',
    email='ca_user@example.com',
    password='testpass123',
    role='CA',
    business_name='Smith & Associates'
)

# Create SME user
sme = User.objects.create_user(
    username='sme_user@example.com',
    email='sme_user@example.com',
    password='testpass123',
    role='SME',
    business_name='Tech Startup LLC'
)
```

### 4. Start Development Server
```bash
python manage.py runserver
```

Server will be available at: `http://localhost:8000`

## Frontend Setup (React)

### 1. Install Dependencies
The chat service and component are already included. No new dependencies needed for basic functionality.

### 2. Start Development Server
```bash
cd frontend
npm run dev
```

Frontend will be available at: `http://localhost:5173` (or check console for actual port)

## Testing the Chat Feature

### Test Scenario: SME → CA Connection → Chat

#### Step 1: Login as SME
1. Go to frontend (http://localhost:5173)
2. Click "Sign Up"
3. Fill in:
   - Email: `sme_user@example.com`
   - Password: `testpass123`
   - Business Name: `Tech Startup LLC`
   - Role: **SME**
4. Click "Sign Up"

#### Step 2: Send Connection Request
1. After login, go to **CA Connect** (left sidebar)
2. Search or scroll to find CA user: "Smith & Associates"
3. Click **Connect** button
4. See confirmation: "Connection request sent!"

#### Step 3: Login as CA (New Browser/Tab)
1. Open new incognito/private window
2. Go to frontend
3. Click "Sign Up"
4. Fill in:
   - Email: `ca_user@example.com`
   - Password: `testpass123`
   - Business Name: `Smith & Associates`
   - Role: **CA**
5. Click "Sign Up"

#### Step 4: Accept Connection Request
1. After login, go to **Messages** (left sidebar)
2. Click on **Pending** tab
3. See request from "Tech Startup LLC"
4. Click **Accept Request**
5. Conversation status changes to "Active"

#### Step 5: Start Chatting
1. SME browser: Go to **Messages** and click on conversation
2. Type message: "Hello, I need help with GST filing"
3. Click Send
4. CA browser: Refresh or wait 2 seconds
5. See message from SME
6. Type reply: "Sure! I can help you with that."
7. Click Send
8. Messages exchange works both ways!

## API Endpoints Reference

### Authentication
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"ca_user@example.com","password":"testpass123"}'

# Response includes: user, tokens (access & refresh)
```

### Conversations
```bash
# List conversations
curl http://localhost:8000/api/chat/conversations/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Create connection request (SME → CA)
curl -X POST http://localhost:8000/api/chat/conversations/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ca":"CA_USER_ID"}'

# Get specific conversation
curl http://localhost:8000/api/chat/conversations/CONV_ID/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Accept connection request (CA only)
curl -X PATCH http://localhost:8000/api/chat/conversations/CONV_ID/accept/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Reject connection request (CA only)
curl -X PATCH http://localhost:8000/api/chat/conversations/CONV_ID/reject/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Messages
```bash
# List messages in conversation
curl "http://localhost:8000/api/chat/conversations/CONV_ID/messages/?page=1&page_size=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send message
curl -X POST http://localhost:8000/api/chat/conversations/CONV_ID/messages/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello CA!"}'

# Send message with attachment
curl -X POST http://localhost:8000/api/chat/conversations/CONV_ID/messages/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "content=Check this invoice" \
  -F "attachment=@/path/to/invoice.pdf" \
  -F "attachment_type=invoice"
```

## Common Issues & Fixes

### Issue: "No module named 'rest_framework_nested'"
**Fix**: Run `pip install drf-nested-routers`

### Issue: Migration errors
**Fix**: 
```bash
python manage.py migrate chat --run-syncdb
# or
python manage.py migrate --fake-initial
```

### Issue: Messages not showing up
**Fix**: Check browser console for errors. Ensure:
1. Conversation status is "active" or "accepted"
2. User has JWT token stored
3. API is running on correct port

### Issue: Can't send connection request
**Fix**: Ensure:
1. Logged in user is SME role
2. Target CA exists and has role='CA'
3. No existing conversation between these users

## Database Admin Access

### Access Django Admin
1. Create superuser: `python manage.py createsuperuser`
2. Go to: `http://localhost:8000/admin/`
3. Login with superuser credentials
4. View conversations and messages in "Chat" section

## Backend Configuration

### Settings.py
All chat configuration is already in place:
- Chat app registered in INSTALLED_APPS
- URLs configured in main urls.py
- JWT authentication enabled
- CORS enabled for frontend

### Modify Chat Settings
If needed, edit `backend/chat/views.py` for:
- Pagination page size (change `page_size = 50`)
- Polling interval (frontend change: 2000ms in Chat.tsx)

## Frontend Configuration

### Environment Variables
Create `.env` in frontend directory if needed:
```
VITE_API_URL=http://localhost:8000
```

### Modify Chat Component
Edit `frontend/src/components/Chat.tsx`:
- Line 61: Change polling interval (currently 2000ms)
- Line 150: Modify message display format
- Styling: Update Tailwind classes as needed

## Production Deployment

### Before Going Live

1. **Backend**
   - Set `DEBUG = False` in settings.py
   - Use environment variables for secrets
   - Enable HTTPS
   - Set proper ALLOWED_HOSTS
   - Use production database (PostgreSQL recommended)
   - Set up proper logging
   - Configure static/media file storage

2. **Frontend**
   - Run `npm run build` for production build
   - Update API URL to production backend
   - Enable CSP headers
   - Set up analytics/monitoring

3. **Database**
   - Backup before migration
   - Test migrations in staging first
   - Monitor database performance
   - Set up indexes

4. **Real-time Enhancement**
   - Consider WebSocket upgrade using Django Channels
   - Implement message queuing (Redis)
   - Add caching layer

## Support & Troubleshooting

For more details, see:
- [CHAT_FEATURE.md](CHAT_FEATURE.md) - Complete documentation
- [CHAT_FEATURE_SUMMARY.md](CHAT_FEATURE_SUMMARY.md) - Implementation summary

---

**Happy Chatting! 💬**
