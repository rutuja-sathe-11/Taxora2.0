# Setup Steps for New Laptop

## Prerequisites
- Python 3.8+ installed
- Node.js & npm installed
- PostgreSQL installed (optional - uses SQLite by default)

## Steps

### 1. Clone/Copy Project
```bash
# Copy project folder to new laptop (exclude backend/venv folder)
```

### 2. Backend Setup
```bash
cd backend

# Create new virtual environment
python -m venv venv

# Activate venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (copy from env.example)
copy env.example .env
# Or manually create .env with values from env.example

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver 8000
```

### 3. Frontend Setup
```bash
# From project root
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 4. Done
- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## Important Notes
- **Don't copy** `backend/venv/` folder (it has your laptop paths)
- **Don't copy** `node_modules/` folder
- **Do copy** `backend/.env` file (or create new one from `env.example`)
- Database will be fresh (SQLite file `db.sqlite3` will be created automatically)

