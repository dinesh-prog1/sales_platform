# AI Sales Platform — Django Backend

Python/Django conversion of the original Go backend.

## Stack
- Python 3.11+
- Django 4.2 + Django REST Framework
- PostgreSQL
- Redis + Celery (replaces Go worker)
- JWT Authentication (SimpleJWT)

## Setup

### 1. Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
copy .env.example .env
# Edit .env with your DB, SMTP, and Redis credentials
```

### 4. Create database
```bash
psql -U postgres -c "CREATE DATABASE aisales_django;"
```

### 5. Run migrations
```bash
python manage.py migrate
```

### 6. Create admin user
```bash
python manage.py createsuperuser
```

### 7. Start the API server
```bash
python manage.py runserver 8080
```

### 8. Start Celery worker (new terminal)
```bash
celery -A ai_sales worker --loglevel=info
```

### 9. Start Celery beat scheduler (new terminal)
```bash
celery -A ai_sales beat --loglevel=info
```

## API Endpoints (same as Go backend)

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/v1/auth/login/ | Get JWT token |
| GET | /api/v1/companies/ | List companies |
| POST | /api/v1/companies/ | Bulk create |
| GET | /api/v1/companies/stats/status/ | Status stats |
| GET | /api/v1/companies/stats/size/ | Size stats |
| POST | /api/v1/companies/upload/ | Excel upload |
| GET | /api/v1/demos/ | List demos |
| POST | /api/v1/demos/book/ | Book a demo (public) |
| POST | /api/v1/demos/{id}/confirm/ | Confirm demo |
| GET | /api/v1/trials/ | List trials |
| GET | /api/v1/trials/stats/ | Trial stats |
| GET | /api/v1/emails/ | Email logs |
| GET | /api/v1/emails/config/ | Email config |
| PATCH | /api/v1/emails/config/ | Update config + SMTP |
| POST | /api/v1/emails/test-smtp/ | Send test email |
| GET | /api/v1/emails/templates/ | List templates |
| PATCH | /api/v1/emails/templates/{type}/ | Update template |
| POST | /api/v1/emails/respond-outreach/ | Interest response (public) |
| GET | /api/v1/analytics/ | Dashboard analytics |
| POST | /api/v1/interest/detect/ | Detect interest keywords |
| POST | /api/v1/interest/mark/ | Mark interest |

## Project Structure

```
django_backend/
├── manage.py
├── requirements.txt
├── .env.example
├── ai_sales/           ← Django project config
│   ├── settings.py
│   ├── urls.py
│   └── celery.py
├── companies/          ← Company pipeline
├── demos/              ← Demo booking
├── trials/             ← Trial management
├── emails/             ← Email logs, templates, SMTP
├── analytics/          ← Dashboard metrics
├── interest/           ← Interest detection
└── utils/              ← Mailer, helpers
```
