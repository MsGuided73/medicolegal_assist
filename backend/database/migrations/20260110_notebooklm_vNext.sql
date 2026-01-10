-- Migration: NotebookLM-style vNext Research & Validation Schema (REVISED v2)
-- Date: 2026-01-10
-- Safety: Additive-only. No drops/renames. Includes backfill for case_id.

-- 0) ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1) UPDATE CORE TABLES

ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS page_count INTEGER;

-- document_pages already has: id (uuid), document_id (uuid), page_number (int),
-- text_content (text), quality_score (double), ocr_confidence (double), metadata (jsonb), created_at
-- Add only missing vNext columns to avoid duplicate semantics.

ALTER TABLE public.document_pages
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS text_method TEXT DEFAULT 'ocr'
  CHECK (text_method IN ('text_layer', 'ocr', 'multimodal', 'physician_attachment')),
ADD COLUMN IF NOT EXISTS needs_human_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS storage_path_pdf TEXT,
ADD COLUMN IF NOT EXISTS storage_path_page_image TEXT,
ADD COLUMN IF NOT EXISTS embedding vector(768),
ADD COLUMN IF NOT EXISTS bbox_json JSONB;

-- Uniqueness to prevent duplicate page rows per document
CREATE UNIQUE INDEX IF NOT EXISTS uq_document_pages_document_page
ON public.document_pages(document_id, page_number);

-- Backfill case_id for existing pages
UPDATE public.document_pages p
SET case_id = d.case_id
FROM public.documents d
WHERE p.document_id = d.id
  AND p.case_id IS NULL;

-- audit_logs alignment (safe additive)
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS event_type TEXT,
ADD COLUMN IF NOT EXISTS payload JSONB,
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL;

-- 2) RESEARCH CHAT

CREATE TABLE IF NOT EXISTS public.case_chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.case_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES public.case_chat_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    mode TEXT DEFAULT 'research' CHECK (mode IN ('research', 'report')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Use document_pages.id (uuid) as the canonical citation pointer
CREATE TABLE IF NOT EXISTS public.case_chat_citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.case_chat_messages(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.document_pages(id) ON DELETE CASCADE,
    quote TEXT,
    start_char INTEGER,
    end_char INTEGER
);

-- 3) HUMAN-IN-THE-LOOP

CREATE TABLE IF NOT EXISTS public.human_review_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.document_pages(id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL,
    status TEXT DEFAULT 'open'
      CHECK (status IN ('open', 'excluded_approved', 'interpreted', 'reprocess_requested', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.physician_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.document_pages(id) ON DELETE CASCADE,
    author_name TEXT,
    attachment_type TEXT DEFAULT 'note' CHECK (attachment_type IN ('interpretation', 'note')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) ELEVATION -> VALIDATION

CREATE TABLE IF NOT EXISTS public.candidate_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    claim_text TEXT NOT NULL,
    status TEXT DEFAULT 'submitted'
      CHECK (status IN ('submitted', 'accepted', 'rejected', 'needs_human')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.candidate_claim_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_claim_id UUID NOT NULL REFERENCES public.candidate_claims(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.document_pages(id) ON DELETE CASCADE,
    quote TEXT,
    note TEXT
);

CREATE TABLE IF NOT EXISTS public.validation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_claim_id UUID NOT NULL REFERENCES public.candidate_claims(id) ON DELETE CASCADE,
    result TEXT NOT NULL CHECK (result IN ('accepted', 'rejected', 'needs_human')),
    rejection_codes JSONB,
    checklist JSONB,
    suggestions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) POTENTIAL CONFLICTS

CREATE TABLE IF NOT EXISTS public.potential_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    category TEXT CHECK (category IN ('imaging', 'laterality', 'timeline', 'restrictions', 'symptoms', 'other')),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conflict_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id UUID NOT NULL REFERENCES public.potential_conflicts(id) ON DELETE CASCADE,
    page_id UUID NOT NULL REFERENCES public.document_pages(id) ON DELETE CASCADE,
    quote TEXT
);

CREATE TABLE IF NOT EXISTS public.conflict_resolution_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id UUID NOT NULL REFERENCES public.potential_conflicts(id) ON DELETE CASCADE,
    resolution_type TEXT CHECK (resolution_type IN ('true_conflict', 'temporal_evolution', 'artifact', 'clinically_insignificant')),
    note TEXT,
    author_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) INDEXES

CREATE INDEX IF NOT EXISTS idx_doc_pages_case_id
ON public.document_pages(case_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_case_created
ON public.case_chat_messages(case_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_citations_msg
ON public.case_chat_citations(message_id);

CREATE INDEX IF NOT EXISTS idx_candidate_claims_case
ON public.candidate_claims(case_id);

-- Vector index (partial to avoid null embeddings)
CREATE INDEX IF NOT EXISTS idx_doc_pages_embedding
ON public.document_pages USING hnsw (embedding vector_cosine_ops)
WHERE embedding IS NOT NULL;
