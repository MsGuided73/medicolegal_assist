-- MediCase Supabase Storage + RLS setup
--
-- Run this in Supabase SQL Editor.
-- Purpose:
-- 1) Create a private Storage bucket named "documents"
-- 2) Add RLS policies for authenticated users
-- 3) (Optional) Ensure required document intelligence tables exist (matches medicase/backend/database/schema.sql)
--
-- NOTE: Storage buckets are stored in storage.buckets. If your Supabase project restricts
-- direct inserts, create the bucket via the UI and then run only the policies section.

-- =========================
-- 1) Bucket
-- =========================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- =========================
-- 2) Storage policies
-- =========================

-- Ensure RLS is enabled (usually is by default)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop old policies if re-running
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- Allow authenticated users to upload into the documents bucket
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read objects in documents bucket
-- (If you need strict per-case access, we can tighten this later.)
CREATE POLICY "Users can view documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to delete objects in documents bucket
CREATE POLICY "Users can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- =========================
-- 3) Required DB tables (optional safety)
-- =========================
-- Your project already includes schema.sql with these tables.
-- This section is safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    document_type TEXT,
    quality_score FLOAT,
    ocr_status TEXT DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed', 'not_needed')),
    intelligence_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.medical_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    entity_text TEXT NOT NULL,
    category TEXT NOT NULL,
    icd10_code TEXT,
    confidence FLOAT,
    page_number INTEGER,
    source_text TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.clinical_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    date_value DATE NOT NULL,
    date_type TEXT NOT NULL,
    confidence FLOAT,
    page_number INTEGER,
    source_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

