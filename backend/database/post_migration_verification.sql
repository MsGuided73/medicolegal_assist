-- Post-Migration Verification Queries for NotebookLM vNext (REVISED)
-- Date: 2026-01-10
-- Notes: Matches v1 schema names (document_pages.text_content, quality_score, etc.)
--        and validates critical vNext invariants (case_id backfill, uniqueness, FKs, vector index).

-- 1) Check required extensions
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('vector', 'pgcrypto')
ORDER BY extname;

-- 2) Verify expected core columns exist (by table)
-- cases: title
SELECT 'cases' AS table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cases'
  AND column_name IN ('title')
ORDER BY column_name;

-- documents: mime_type, page_count
SELECT 'documents' AS table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'documents'
  AND column_name IN ('mime_type', 'page_count')
ORDER BY column_name;

-- document_pages: v1 + vNext additions
-- v1 columns (expected to already exist): id, document_id, page_number, text_content, quality_score, ocr_confidence, metadata, created_at
-- vNext columns (added): case_id, text_method, needs_human_review, storage_path_pdf, storage_path_page_image, embedding, bbox_json
SELECT 'document_pages' AS table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'document_pages'
  AND column_name IN (
    'id','document_id','page_number','text_content','quality_score','ocr_confidence','metadata','created_at',
    'case_id','text_method','needs_human_review','storage_path_pdf','storage_path_page_image','embedding','bbox_json'
  )
ORDER BY column_name;

-- audit_logs: event_type, payload, case_id
SELECT 'audit_logs' AS table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_logs'
  AND column_name IN ('event_type', 'payload', 'case_id')
ORDER BY column_name;

-- 3) Verify new tables are present
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'case_chat_threads', 'case_chat_messages', 'case_chat_citations',
    'human_review_items', 'physician_attachments',
    'candidate_claims', 'candidate_claim_evidence', 'validation_results',
    'potential_conflicts', 'conflict_evidence', 'conflict_resolution_notes'
  )
ORDER BY table_name;

-- 4) Verify critical constraints / indexes

-- 4a) Verify unique index exists for (document_id, page_number)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'document_pages'
  AND indexname = 'uq_document_pages_document_page';

-- 4b) Verify case_id index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'document_pages'
  AND indexname = 'idx_doc_pages_case_id';

-- 4c) Verify check constraint exists for text_method (if implemented as CHECK)
SELECT conname, pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'public.document_pages'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 5) Verify FK wiring on citation & evidence tables points to document_pages.id
-- (This is critical for “click-to-source” reliability)
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('case_chat_citations','human_review_items','physician_attachments','candidate_claim_evidence','conflict_evidence')
ORDER BY tc.table_name, kcu.column_name;

-- 6) Verify case_id backfill succeeded (should be 0 NULLs once documents are linked)
-- If you have rows with NULL case_id here, ingestion/backfill needs attention.
SELECT
  COUNT(*) AS total_pages,
  SUM(CASE WHEN case_id IS NULL THEN 1 ELSE 0 END) AS pages_with_null_case_id
FROM public.document_pages;

-- 7) Verify vector index (HNSW) exists and is partial (WHERE embedding IS NOT NULL)
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'document_pages'
  AND indexname = 'idx_doc_pages_embedding';
