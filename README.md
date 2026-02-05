# Expense Explorer

Professional Credit Card Expense Tracking Application

## Features
- Multi-user authentication
- Bank account management
- CSV & PDF statement parsing
- Automated expense categorization
- Interactive dashboards
- Multi-currency support

## Quick Start

### Development
```bash
# Start with Docker
docker-compose up --build

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Access:
# Frontend: http://localhost:5173
# Backend: http://localhost:8000/api
```

### Local Setup
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Deployment
See deployment guides for Railway, Vercel, or AWS.
