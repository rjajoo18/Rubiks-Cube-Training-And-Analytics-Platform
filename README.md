# Rubik’s Cube Training and Analytics Platform

A full-stack Rubik’s Cube training and analytics platform that allows users to time solves, generate scrambles, compute optimal solutions, analyze performance trends, and score solves using heuristic and machine learning–based models.

This project was built as an end-to-end software engineering and machine learning learning exercise, integrating frontend UI/UX, backend APIs, database persistence, and model training/inference into a single cohesive system.

---

## Overview

Speedcubers rely on multiple disconnected tools to practice: timers, scramble generators, spreadsheets, and third-party analytics. This project consolidates that workflow into a single platform while introducing objective performance scoring based on historical context and modeled expectations.

The long-term goal is to move beyond raw time tracking and toward skill-aware evaluation, answering questions like:

- Was this solve good relative to my current ability?

- How risky was this solve (DNF / +2)?

- How am I trending over time, not just session-to-session?

---

## Core Features

### Solve Timing and Scramble Generation
- In-browser solve timer with state transitions (idle, ready, running, stopped)
- Automatic scramble generation for 3x3 solves
- Support for penalties such as +2 and DNF
- Persistent solve storage tied to authenticated users

### Solve History and Analytics
- Full solve history view with editing and deletion support
- Session level live statistics
- Dashboard with aggregated long-term metrics
- Rolling averages (Ao5, Ao12), personal bests, and trends

### Automatic Solution Computation
- Cube state and scramble processing
- Optimal or near-optimal solution generation using a two-phase solving algorithm (Kociemba)
- Solution data stored alongside each solve for analysis and future extensions
- Designed for future extensions such as efficiency analysis

### Authentication and Persistence
- JWT-based authentication
- Per-user data isolation
- Database-backed persistence using SQLAlchemy
- Designed to work with Supabase Postgres or any compatible SQL database

## Machine Learning and Scoring System

### Scoring Philosophy
Raw solve time alone is a weak signal. This platform assigns a normalized score (0–100) that contextualizes each solve based on:
- User skill prior (WCA profile or self-reported average)
- Recent performance history
- Penalties and solve characteristics
- Expected vs actual performance

### Current Architecure
- Feature engineering pipeline (rolling averages, variance, skill priors)
- Versioned model bundles to track scoring logic evolution
- Heuristic baseline + Gradient Boosted Model inference
- ML inference is cached per process to avoid repeated disk I/O
- Scoring runs out-of-band from solve creation to preserve UX latency

### Training and Retraining
- Retraining is triggered after a configurable number of solves
- Jobs are recorded in a database-backed queue
- Training runs outside request paths for safety and scalability

## System Design Decisions
- Write-through analytics snapshots to make dashboard reads O(1)
- Cursor pagination to avoid offset-based performance degradation
- Idempotent solve creation to protect against frontend retries
- Clear separation of concerns between API, ML inference, and training
- Designed to scale from a single user to many without architectural changes

## Tech Stack

### Frontend
- React
- TypeScript
- TailwindCSS
- Vite

### Backend
- Python
- Flask
- Flask-CORS
- SQLAlchemy
- JWT authentication

### Database
- Supabase Postgres (recommended)
- Compatible with standard PostgreSQL or MySQL setups

### Machine Learning
- NumPy
- Pandas
- scikit-learn
- Gradient boosting framework (planned / optional)

---

## System Architecture

1. The frontend requests or generates a scramble.
2. The user completes a timed solve in the browser.
3. Solve data is submitted to the backend via REST APIs.
4. The backend persists the solve and optionally:
   - Computes an optimal solution
   - Computes a heuristic or ML-based score
5. Aggregated statistics are returned to the frontend for visualization.

---

## Local Setup

### Prerequisites
- Python 3.10 or newer
- Node.js 18 or newer
- PostgreSQL database (local or Supabase)

---
### Backend Setup

Navigate to backend directory:
```bash
cd backend
```

Create and activate virtual environment:
```bash
# Create virtual environment
python -m venv .venv

# Activate on Windows
.venv\Scripts\activate

# Activate on macOS/Linux
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Configure environment variables by creating a `.env` file inside `backend/`:
```env
FLASK_ENV=development
SECRET_KEY=your_secret_key

SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://USER:PASSWORD@HOST:PORT/DBNAME
JWT_SECRET=your_jwt_secret

CORS_ORIGINS=http://localhost:5173
```

Run the backend server:
```bash
python app.py
```

Backend will be available at: http://localhost:5000

### Frontend Setup

Navigate to frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Run development server:
```bash
npm run dev
```

Frontend will be available at: http://localhost:5173

Optional: Configure API base URL by creating `.env` in `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user info |
| POST | /api/auth/me/skill/self-reported | Set self-reported 3x3 average |
| POST | /api/auth/me/skill/wca | Link WCA ID and fetch 3x3 stats (avg + single) |

### Solve + Scramble Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/solves | Create new solve |
| GET | /api/solves | Get all solves for user |
| POST | /api/solves/:id/score | Calculate ML score for solve |
| GET | /api/scramble | Generate a new scramble (+ cube state) for an event (currently 3x3 only) |
| GET | /api/solves/:id | Get full solve details |
| PATCH | /api/solves/:id | Update solve |
| DELETE | /api/solves/:id | Delete solve |
| GET | /api/solves/live-stats | Compute live stats from recent solves|
| POST | /api/solves/optimal | Compute optimal solution from cube state |

### Dashboard Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/summary | Dashboard summary stats + daily trends (snapshot cached) |

### Cube Utilities

- Scramble generation
- Solution computation from cube state

## Machine Learning Pipeline

### Current Implementation

- Heuristic-based scoring using solve time, penalties, and user baselines
- Scores normalized to a consistent scale (0-1000)
- Stored with version metadata for reproducibility

### Planned Extensions

- Dataset generation from historical solves
- Gradient Boosted Model (GBM) training
- Advanced feature engineering:
  - Solve statistics and rolling averages
  - Time-of-day patterns
  - User performance trends
- Model versioning and reproducible inference
- Real-time score predictions

## Tech Stack

### Backend

- Flask - Web framework
- SQLAlchemy - ORM
- PostgreSQL - Database
- JWT - Authentication
- scikit-learn - Machine learning
- pandas/numpy - Data processing

### Frontend

- React - UI framework
- Vite - Build tool

### ML/Analytics

- joblib - Model serialization
- matplotlib/seaborn - Visualization
- scipy - Scientific computing

## Known Issues and Debugging

- Ensure SQLALCHEMY_DATABASE_URI is set before running training or backend scripts
- Run backend commands from the correct working directory to avoid import errors
- Configure CORS correctly to allow frontend-backend communication during development

## Roadmap

- Improved 3D cube visualization
- Session-based analytics and statistics
- Fully deployed ML scoring model with real-time predictions
- WCA profile integration
- Production deployment with Docker
- CI/CD pipeline setup
- Advanced performance forecasting
- Personalized training recommendations

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
