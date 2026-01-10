# MediCase Schema Audit Report
**Date:** 2026-01-10
**Status:** ⚠️ SIGNIFICANT ALIGNMENT REQUIRED

## Executive Summary
The live schema represents a "V1" document extraction system. It lacks the foundational structures for **NotebookLM-like grounded research**, specifically:
1. **Full-Text Page Tracking**: No mechanism to store raw text per page with method metadata.
2. **Interactive Chat**: No tables for threads, messages, or page-level citations.
3. **Elevation/Validation Loop**: Missing the required bridge between research "claims" and final report "evidence".
4. **Semantic Search**: `pgvector` and `embedding` columns are missing.

---

## FOUND Tables
*   `cases`
*   `documents`
*   `document_pages`
*   `medical_entities`
*   `clinical_dates`
*   `audit_logs`
*   `profiles`

---

## MISSING Tables (New Features)
*   `case_chat_threads` (NotebookLM Workspace)
*   `case_chat_messages` (Interactive Research)
*   `case_chat_citations` (Source Grounding)
*   `human_review_items` (HITL Queue for unreadables)
*   `physician_attachments` (Manual interpretations)
*   `candidate_claims` (Elevation Layer)
*   `candidate_claim_evidence` (Fact Checking)
*   `validation_results` (Automated/Manual QA)
*   `potential_conflicts` (Adjudication Layer)
*   `conflict_evidence`
*   `conflict_resolution_notes`

---

## MISALIGNED Columns

### Table: `cases`
*   **FOUND**: `case_number`, `patient_name`, `injury_date`, `status`, `metadata`.
*   **MISSING**: `title` or `case_name` (Expected as primary display name).
*   **Note**: Legacy columns should be kept for backward compatibility but mapped.

### Table: `documents`
*   **FOUND**: `filename`, `storage_path`, `ocr_status`.
*   **MISSING**: `mime_type`, `page_count`.

### Table: `document_pages` (Critical Misalignment)
*   **LIVE**: `text_content`, `quality_score`, `ocr_confidence`.
*   **EXPECTED**: `text_raw`, `text_method`, `readability_score`, `case_id`, `storage_path_pdf`, `storage_path_page_image`, `embedding`, `bbox_json`.
*   **ACTION**: Needs heavy expansion to support citation jumping and semantic search.

### Table: `audit_logs`
*   **LIVE**: `action`, `resource_type`, `details`.
*   **EXPECTED**: `event_type`, `payload`, `case_id`.

---

## UNEXPECTED Tables (Legacy/Current Flow)
*   `rom_measurements`, `strength_tests`, `special_tests`: (These belong to the "Examination" flow, not the "Document Intelligence" flow. They are valid but outside the NotebookLM spec scope).
*   `report_templates`, `examination_templates`.
*   `cases_secure`: (Secure encryption layer, keep as-is).
