# Laboratory Appointment & Home Collection Booking System

Full-stack lab booking platform built with React + FastAPI + MySQL.

## Tech Stack

- **Frontend:** Vite, React, JavaScript, Tailwind CSS, shadcn/ui, React Router, React Hook Form, Zod, Axios
- **Backend:** FastAPI, SQLAlchemy, Alembic, Pydantic, JWT, bcrypt
- **Database:** MySQL

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your MySQL credentials
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Database Migrations

```bash
cd backend
alembic upgrade head
```

## API

- Health check: `GET /health`
- Standard response: `{ success, message, data, errors }`

## Documentation

See the specification documents in the project root for full feature requirements.
