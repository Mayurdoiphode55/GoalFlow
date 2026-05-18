# GoalFlow — Enterprise Goal Setting & Tracking Portal

GoalFlow is a modern, AI-powered enterprise platform designed to help organizations align, track, and achieve their strategic objectives. It provides a structured framework for employees to set goals, managers to review and approve them, and administrators to gain real-time insights into organizational performance.

## 🌟 Key Features

### 🎯 Goal Management
- **Cyclical Goal Setting**: Administrators can define performance cycles (e.g., FY24, Q3-2024).
- **Weightage Validation**: strict 100% weightage enforcement for submitted goal sheets.
- **Approval Workflow**: Employees submit goals -> Managers review, return for rework, or approve -> Goals are locked.
- **Rich Check-ins**: Employees provide quarterly or monthly progress updates with actuals, computed scores, and status tracking (On Track, Completed, Behind).

### 🤖 AI Goal Coach (Powered by Groq + LLaMA)
- **Goal Suggestions**: Generates tailored goal suggestions based on the employee's role, department, and selected thrust area (e.g., Revenue Growth, Innovation).
- **Sheet Analysis**: Analyzes the balance, strengths, and weaknesses of a goal sheet before submission.
- **Check-in Coaching**: Provides actionable advice for employees who are falling behind on their targets.

### 📊 Real-time Analytics & Administration
- **Completion Dashboard**: Live WebSocket-powered activity feed tracking goal submissions and approvals across the organization.
- **Analytics Hub**: Quarter-over-Quarter (QoQ) trends, department completion heatmaps, and Manager Effectiveness scores.
- **Escalation Rules**: Automated escalation engine that flags overdue submissions to skip-level managers or HR.
- **Audit Logging**: Comprehensive tracking of all critical system changes.

## 🛠️ Technology Stack

**Frontend**
- React 18 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand (State Management)
- TanStack Query (Data Fetching & Caching)
- Recharts (Data Visualization)
- React Router (Routing)

**Backend**
- FastAPI + Python 3.10+
- SQLAlchemy 2.0 (Async) + SQLite (Development) / PostgreSQL (Production)
- Pydantic v2
- JWT Authentication
- APScheduler (Background Jobs)
- WebSockets (Real-time updates)

**Integrations**
- Groq AI (LLaMA models for the AI Coach)
- Brevo (Transactional Emails)

## 🚀 Getting Started

### Prerequisites
- Node.js (v20.18.0 or compatible)
- Python (3.10+)

### 1. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set up your `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```
Ensure you add your `GROQ_API_KEY` and `BREVO_API_KEY` in the `.env` file.

Run the database seed script to populate initial users and cycles:
```bash
python seed.py
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5174` (or `5173`).

### Default Test Accounts
If you ran the `seed.py` script, you can log in using the following credentials (password is `password123` for all):
- **Admin**: `admin@goalflow.app`
- **Manager**: `manager@goalflow.app`
- **Employee**: `employee@goalflow.app`

## 📁 Project Structure

```text
AtomQuest/
├── backend/
│   ├── app/
│   │   ├── core/         # Config, security, scheduler
│   │   ├── models/       # SQLAlchemy database models
│   │   ├── routers/      # FastAPI route handlers
│   │   ├── schemas/      # Pydantic validation schemas
│   │   └── services/     # Business logic & AI integrations
│   ├── requirements.txt
│   └── seed.py           # Database seeder
└── frontend/
    ├── src/
    │   ├── components/   # Reusable UI elements (goals, ai, layout, shared)
    │   ├── hooks/        # React Query custom hooks
    │   ├── lib/          # Axios API config, utilities
    │   ├── pages/        # Route views (admin, employee, manager)
    │   ├── store/        # Zustand global state
    │   └── types/        # TypeScript interfaces
    ├── index.css         # Tailwind v4 configuration
    └── package.json
```

## 📄 License
This project is proprietary and confidential. Unauthorized copying of files, via any medium, is strictly prohibited.
