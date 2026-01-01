# MediCase Architecture

## System Overview

MediCase is a full-stack web application with:
- React TypeScript frontend
- Python FastAPI backend
- PostgreSQL database (Supabase)
- AWS Textract for OCR
- Claude/GPT-4 for AI extraction

## High-Level Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   React     │◄────►│  FastAPI     │
│  Frontend   │      │   Backend    │
└─────────────┘      └──────┬───────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
              ┌──────────┐    ┌──────────┐
              │ Supabase │    │   AWS    │
              │   DB     │    │ Textract │
              └──────────┘    └──────────┘
                                   │
                              ┌────┴────┐
                              ▼         ▼
                         ┌────────┐ ┌─────────┐
                         │ Claude │ │  GPT-4  │
                         │   API  │ │   API   │
                         └────────┘ └─────────┘
```

## Data Flow: Document Processing

1. User uploads PDF → Frontend
2. Frontend → Backend `/api/v1/documents/upload`
3. Backend stores in Supabase Storage
4. Backend → Quality Assessment Service
   - Detects if PDF is text or image
   - Detects rotation
5. If image → AWS Textract OCR
6. Backend → Document Normalization
   - Rotate pages
   - Deduplicate
   - Create page manifest
7. Backend → AI Extraction (Claude/GPT-4)
   - Extract clinical data
   - Generate timeline
   - Detect inconsistencies
8. Results stored in Supabase database
9. Frontend displays processed data

## Security

- Authentication: Supabase Auth (JWT tokens)
- Authorization: Row Level Security (RLS)
- Encryption: AES-256 at rest, TLS in transit
- Audit Logging: All PHI access logged

## Scalability

- Backend: Horizontal scaling via containers
- Database: Supabase managed scaling
- OCR: AWS Textract auto-scales
- Job Queue: Celery workers for background processing
