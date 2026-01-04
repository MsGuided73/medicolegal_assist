# MediCase - AI-Powered IME Platform

AI-powered medico-legal assessment platform for orthopedic physicians performing independent medical evaluations (IMEs) in personal injury cases.

## Features

- **Document Processing**: OCR and normalization of scanned medical records
- **AI Extraction**: Automated extraction of clinical data using Claude/GPT-4
- **Timeline Generation**: Chronological visualization of treatment history
- **Inconsistency Detection**: Automated comparison of patient statements
- **Report Generation**: Template-based IME report creation with auto-population
- **HIPAA Compliant**: Encrypted storage, audit logging, role-based access

## Tech Stack

**Backend:**
- Python 3.11+ with FastAPI
- PostgreSQL via Supabase
- AWS Textract (OCR)
- Anthropic Claude API / OpenAI GPT-4 (AI)

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- React Query + Zustand

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- Supabase account
- AWS account (for Textract)
- Anthropic or OpenAI API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run development server
python -m app.main
```

Backend runs on http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

Frontend runs on http://localhost:5173

## Project Structure

```
medicase/
├── backend/          # FastAPI application
│   ├── app/          # Application code
│   │   ├── api/      # API routes
│   │   ├── core/     # Core utilities
│   │   ├── models/   # Data models
│   │   ├── services/ # Business logic
│   │   └── utils/    # Helpers
│   └── tests/        # Tests
├── frontend/         # React application
│   ├── src/          # Source code
│   │   ├── api/      # API client
│   │   ├── components/ # React components
│   │   ├── pages/    # Page components
│   │   ├── hooks/    # Custom hooks
│   │   └── store/    # State management
│   └── tests/        # Tests
└── docs/             # Documentation
```

## Development

### Running Tests

**Backend:**
```bash
cd backend
pytest --cov=app
```

### Google AI Studio (Gemini) API Smoke Test

This repo includes a small script that verifies your **Google AI Studio API key** works
and that the Gemini API responds with valid JSON.

**Prereq:** set `GOOGLE_AI_STUDIO_API_KEY` in `medicase/backend/.env` (see `medicase/backend/.env.example`).

**Run (PowerShell):**
```powershell
python medicase/backend/scripts/test_google_ai_studio.py --dotenv medicase/backend/.env
```

**Expected output:** a JSON blob that includes `latency_s` and `response_json.status == "ok"`.

**Frontend:**
```bash
cd frontend
npm run test
```

### Code Quality

**Backend:**
```bash
black .          # Format
ruff check .     # Lint
mypy app/        # Type check
```

**Frontend:**
```bash
npm run lint     # Lint
npm run format   # Format
npm run type-check  # Type check
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## License

Proprietary - All Rights Reserved

## Support

For support, email support@medicase.com
