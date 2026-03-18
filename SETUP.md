# Taxora - Complete Setup Guide

## Overview
Taxora is a full-stack AI-powered tax management platform with:
- **Frontend**: React + TypeScript + Tailwind + Vite
- **Backend**: Django + DRF + PostgreSQL
- **Features**: OCR invoice scanning, AI tax advisor, transaction management, compliance tracking

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create `backend/.env` file:

```env
# Database
DB_NAME=taxora_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Celery/Redis (optional for async tasks)
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# AI Services (optional)
GROQ_API_KEY=your_groq_api_key
HUGGING_FACE_TOKEN=your_hugging_face_token
```

### 3. Setup Database

```bash
# Create PostgreSQL database
createdb taxora_db

# Or using psql
psql -U postgres
CREATE DATABASE taxora_db;
\q
```

### 4. Run Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### 5. Create Superuser

```bash
python manage.py createsuperuser
```

### 6. Load Initial Data (Optional)

```bash
python manage.py loaddata fixtures/initial_data.json
```

### 7. Start Django Server

```bash
python manage.py runserver 8000
```

The backend API will be available at `http://localhost:8000`

---

## Frontend Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The `.env` file is already configured with:
```env
VITE_SUPABASE_URL=https://wokmfaexhqgrbjovxyrn.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

**Note**: These are for future Supabase integration. Currently, the app uses Django backend.

### 3. Start Development Server

```bash
npm run dev
```

Frontend will be available at `http://localhost:5173`

The Vite proxy automatically forwards `/api/*` requests to `http://localhost:8000`

---

## Running the Complete Stack

### Option 1: Manual (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver 8000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Option 2: Using the Start Script

The backend includes a convenient start script:

```bash
cd backend
python start_dev_server.py
```

This will:
1. Check if migrations are needed
2. Start Django development server
3. Handle hot reloading

---

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/auth/profile/` - Get user profile
- `PUT /api/auth/profile/` - Update profile

### Transactions
- `GET /api/transactions/` - List transactions (with filters)
- `POST /api/transactions/` - Create transaction
- `GET /api/transactions/<id>/` - Get transaction detail
- `PUT /api/transactions/<id>/` - Update transaction
- `DELETE /api/transactions/<id>/` - Delete transaction
- `GET /api/transactions/summary/` - Get summary & analytics
- `GET /api/transactions/export/` - Export to CSV
- `GET /api/transactions/categories/` - Get categories
- `POST /api/transactions/<id>/review/` - Review transaction (CA only)

### Documents
- `GET /api/documents/` - List documents
- `POST /api/documents/` - Upload document
- `GET /api/documents/<id>/` - Get document
- `DELETE /api/documents/<id>/` - Delete document
- `POST /api/documents/<id>/share/` - Share document
- `GET /api/documents/shared/` - Get shared documents
- `GET /api/documents/analytics/` - Document analytics

### AI Services
- `POST /api/ai/chat/` - Chat with AI advisor
- `GET /api/ai/chat/sessions/` - List chat sessions
- `GET /api/ai/insights/` - Get AI insights
- `POST /api/ai/insights/<id>/read/` - Mark insight as read
- `POST /api/ai/insights/<id>/dismiss/` - Dismiss insight
- `POST /api/ai/analyze-documents/` - Analyze documents
- `GET /api/ai/analytics/` - AI usage analytics

### Compliance
- `GET /api/compliance/calendar/` - Compliance calendar
- `POST /api/compliance/calendar/<id>/complete/` - Mark completed
- `GET /api/compliance/gst-returns/` - GST returns
- `GET /api/compliance/itr-filings/` - ITR filings
- `GET /api/compliance/score/` - Compliance score
- `POST /api/compliance/calculate-tax/` - Calculate tax
- `POST /api/compliance/calculate-gst/` - Calculate GST
- `GET /api/compliance/dashboard/` - Compliance dashboard
- `POST /api/compliance/generate-gstr3b/` - Generate GSTR-3B

### Clients (CA)
- `GET /api/auth/clients/` - List clients
- `POST /api/auth/connect-ca/` - SME connects with CA

---

## User Roles

### SME (Small & Medium Enterprise)
- Dashboard with financial metrics
- Invoice scanner with OCR
- Transaction management
- Document vault
- AI Tax Advisor chat
- CA Connect (find and connect with CAs)
- Compliance calendar
- Reports generation

### CA (Chartered Accountant)
- Client management dashboard
- Review queue for client transactions
- Document access across clients
- Tax filing assistant (GST, ITR, TDS)
- Reports generator
- Client analytics

---

## Features Status

### ✅ Completed & Integrated

#### Backend (Django)
- [x] User authentication (JWT)
- [x] User roles (SME/CA)
- [x] Transaction CRUD with filters
- [x] Document upload & management
- [x] AI insights generation
- [x] Compliance calendar
- [x] Client relationships
- [x] Audit logging
- [x] GST/Tax calculations
- [x] Data export (CSV)

#### Frontend (React)
- [x] Authentication flows
- [x] Role-based routing
- [x] SME Dashboard with charts
- [x] Transaction Manager
- [x] Document Manager
- [x] AI Tax Advisor
- [x] CA Dashboard
- [x] Client Management
- [x] Review Queue
- [x] Reports Generator
- [x] Settings page
- [x] Invoice Scanner UI
- [x] Responsive design

#### Integration
- [x] API service layer
- [x] Axios interceptors for JWT
- [x] Error handling
- [x] Loading states
- [x] Form validation
- [x] Vite proxy configuration

### 🚧 Requires Backend Implementation

These features need Django backend views/tasks to be fully implemented:

#### AI Services
- [ ] OCR processing (Tesseract/pytesseract integration)
- [ ] NER extraction (spaCy/Hugging Face)
- [ ] LLM integration (Groq/OpenAI for chat)
- [ ] Celery tasks for async processing

#### Compliance
- [ ] Actual GSTR-3B file generation
- [ ] ITR form generation
- [ ] TDS calculation logic
- [ ] Compliance scoring algorithm

#### Reports
- [ ] PDF generation (ReportLab)
- [ ] Excel export (openpyxl)
- [ ] Chart generation

### 📝 Backend Views to Complete

Create these in respective `views.py` files:

```python
# apps/ai_services/views.py
@api_view(['POST'])
def chat_with_ai(request):
    # Implement LLM integration
    pass

# apps/compliance/views.py
@api_view(['POST'])
def generate_gstr3b_data(request):
    # Implement GSTR-3B generation
    pass

@api_view(['GET'])
def compliance_score(request):
    # Implement scoring algorithm
    pass

# apps/ai_services/tasks.py (Celery)
@shared_task
def process_document_task(document_id):
    # OCR + NER processing
    pass

@shared_task
def analyze_transaction_task(transaction_id):
    # Anomaly detection, insights
    pass
```

---

## Testing the Application

### 1. Register Users

Register two accounts:
1. SME user (business owner)
2. CA user (chartered accountant)

### 2. Test SME Features

- Create transactions
- Upload invoice documents
- View dashboard metrics
- Chat with AI advisor
- Export reports
- Connect with CA

### 3. Test CA Features

- View client list
- Review client transactions
- Approve/reject/flag transactions
- Access client documents
- Generate client reports

---

## Database Models

### Core Models
- **User** - Custom user with role field (SME/CA)
- **Transaction** - Financial transactions with tax details
- **Document** - File uploads with OCR results
- **ClientRelationship** - CA-SME connections
- **AuditLog** - Activity tracking

### AI Models
- **ChatSession** - AI advisor conversations
- **ChatMessage** - Individual chat messages
- **AIInsight** - Automated insights/recommendations
- **AIModel** - AI model configurations

### Compliance Models
- **ComplianceCalendar** - Due dates and reminders
- **GSTReturn** - GST filing records
- **ITRFiling** - Income tax return records

---

## Production Deployment Checklist

### Backend
- [ ] Set DEBUG=False
- [ ] Configure proper SECRET_KEY
- [ ] Setup PostgreSQL database
- [ ] Configure Redis for Celery
- [ ] Setup Nginx/Gunicorn
- [ ] Enable HTTPS
- [ ] Setup media file storage (S3/CloudFront)
- [ ] Configure email backend
- [ ] Setup monitoring (Sentry)
- [ ] Run collectstatic

### Frontend
- [ ] Build production bundle: `npm run build`
- [ ] Setup CDN for static assets
- [ ] Configure environment variables
- [ ] Enable gzip compression
- [ ] Setup error tracking
- [ ] Add analytics

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is in use
lsof -i :8000
# Kill process if needed
kill -9 <PID>

# Check database connection
python manage.py dbshell
```

### Frontend API calls fail
- Ensure backend is running on port 8000
- Check Vite proxy configuration in `vite.config.ts`
- Verify JWT token in localStorage
- Check browser console for errors

### Database errors
```bash
# Reset database (CAUTION: deletes all data)
python manage.py flush
python manage.py migrate
python manage.py createsuperuser
```

---

## Tech Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Radix UI components
- Recharts for visualizations
- Axios for API calls
- Lucide React icons

### Backend
- Django 4.x
- Django REST Framework
- PostgreSQL
- Celery + Redis (async tasks)
- JWT authentication
- Cryptography for data encryption

### AI/ML (To be integrated)
- Tesseract OCR
- spaCy NER
- Groq LLM
- Hugging Face models

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Django logs: `backend/logs/django.log`
3. Check browser console for frontend errors
4. Ensure all environment variables are set

---

## Next Steps

1. **Start the backend**: `cd backend && python manage.py runserver`
2. **Start the frontend**: `npm run dev`
3. **Register accounts** for both SME and CA roles
4. **Test features** end-to-end
5. **Implement AI services** for OCR and chat functionality
6. **Add Celery workers** for async document processing
7. **Deploy to production** following the deployment checklist

---

**Project Status**: ✅ Core features integrated and functional. AI/ML features require backend implementation.
