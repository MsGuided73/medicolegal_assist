from pathlib import Path

content = """# MediCase vNext — Expected Schema Reference (One Page)

This reference supports **NotebookLM-like Research Mode** + **strict Report Mode** (Elevation → Validation → Signed report).  
Use it as the *target* when auditing your live Supabase schema.

---

## 0) Invariants (non-negotiable)
1. **Research Mode ≠ Report Mode** (separate behaviors/contracts).
2. **Nothing enters a signed report** without **Elevation → Validation**.
3. Every asserted fact must map to a **page-level evidence object** (doc + page_id/page_number + quote).
4. **Unreadable content cannot be silently excluded** (HITL queue + explicit resolution).
5. **Conflicts are surfaced, not auto-resolved** (MD adjudication + notes).

---

## 1) Core tables

### `cases`
- `id` uuid PK
- `created_at` timestamptz
- `title`/`case_name` text
- (optional) `status` text, `patient_id`/`client_id` uuid/text

### `documents`
- `id` uuid PK
- `case_id` uuid FK → cases.id
- `filename` text
- `storage_path` text (Supabase Storage path to PDF)
- `mime_type` text
- `page_count` int
- `created_at` timestamptz
- (optional) `source_type` text, `ocr_status` text, `processing_status` text

**Indexes**
- `documents(case_id)`
- (optional) unique `documents(case_id, filename)` if you dedupe uploads by name

---

## 2) Page-level “source of truth” (most important)

### `document_pages`
**Required**
- `page_id` uuid PK (or `id`, but must be stable and used for citations)
- `case_id` uuid FK → cases.id
- `document_id` uuid FK → documents.id
- `page_number` int
- `text_raw` text (full extracted page text; empty allowed)
- `text_method` text: `text_layer | ocr | multimodal | physician_attachment`
- `readability_score` real/float (scale must be consistent)
- `needs_human_review` boolean
- (optional) `extraction_confidence` real/float
- `storage_path_pdf` text (or reliably join from `documents.storage_path`)
- `storage_path_page_image` text nullable (for click-to-page / future highlighting)
- `created_at` timestamptz

**Optional but recommended**
- `embedding` vector nullable (pgvector)
- `bbox_json` jsonb nullable (future snippet highlighting)

**Constraints**
- Unique `(document_id, page_number)`

**Indexes**
- `document_pages(case_id)`
- `document_pages(document_id, page_number)`
- If using embeddings: vector index on `embedding` (ivfflat/hnsw per your choice)

---

## 3) Research chat (NotebookLM workspace)

### `case_chat_threads` (optional)
- `id` uuid PK
- `case_id` uuid FK
- `title` text
- `created_at` timestamptz

### `case_chat_messages`
- `id` uuid PK
- `case_id` uuid FK
- `thread_id` uuid FK nullable
- `role` text: user|assistant|system
- `content` text
- `mode` text: research|report (research first is fine)
- `created_at` timestamptz

### `case_chat_citations`
- `id` uuid PK
- `message_id` uuid FK → case_chat_messages.id
- `page_id` uuid FK → document_pages.page_id
- (optional) `quote` text
- (optional) `start_char`/`end_char` int

**Indexes**
- `case_chat_messages(case_id, created_at)`
- `case_chat_citations(message_id)`
- `case_chat_citations(page_id)`

---

## 4) Human-in-the-loop (Unreadables) — required

### `human_review_items`
- `id` uuid PK
- `case_id` uuid FK
- `document_id` uuid FK
- `page_id` uuid FK
- `reason_code` text (low_readability|handwriting_new_facts|layout_complex|etc.)
- `status` text: open|excluded_approved|interpreted|reprocess_requested|resolved
- `created_at` timestamptz
- `resolved_at` timestamptz nullable

### `physician_attachments`
- `id` uuid PK
- `case_id` uuid FK
- `document_id` uuid FK
- `page_id` uuid FK nullable (or range handled in app)
- `author_name` text
- `attachment_type` text: interpretation|note
- `content` text
- `created_at` timestamptz

---

## 5) Elevation → Validation → Report Mode — required bridge

### `candidate_claims`
- `id` uuid PK
- `case_id` uuid FK
- `created_by` text/uuid
- `claim_text` text
- `status` text: submitted|accepted|rejected|needs_human
- `created_at` timestamptz

### `candidate_claim_evidence`
- `id` uuid PK
- `candidate_claim_id` uuid FK
- `page_id` uuid FK → document_pages.page_id
- `quote` text
- (optional) `note` text

### `validation_results`
- `id` uuid PK
- `candidate_claim_id` uuid FK
- `result` text: accepted|rejected|needs_human
- `rejection_codes` jsonb (array)
- `checklist` jsonb (structured)
- `suggestions` jsonb (where-to-look + keywords + candidate locations)
- `created_at` timestamptz

---

## 6) Potential conflicts — strongly preferred

### `potential_conflicts`
- `id` uuid PK
- `case_id` uuid FK
- `category` text (imaging|laterality|timeline|restrictions|symptoms|etc.)
- `title` text
- `status` text: open|resolved|dismissed
- `created_at` timestamptz

### `conflict_evidence`
- `id` uuid PK
- `conflict_id` uuid FK
- `page_id` uuid FK
- `quote` text

### `conflict_resolution_notes`
- `id` uuid PK
- `conflict_id` uuid FK
- `resolution_type` text: true_conflict|temporal_evolution|artifact|clinically_insignificant
- `note` text
- `author_name` text
- `created_at` timestamptz

---

## 7) Audit & compliance

### `audit_logs`
- `id` uuid PK
- `case_id` uuid FK nullable
- `event_type` text
- `payload` jsonb
- `created_at` timestamptz

---

## 8) Required extension (if using embeddings)
- `pgvector` must be enabled

---

## 9) Audit instructions (for the coding agent)
Compare live schema vs this reference and output:
- **FOUND / MISSING / MISALIGNED / UNEXPECTED**
Then propose **minimal, safe SQL migrations** (no destructive changes without approval) + post-migration verification queries.
"""

path = Path("/mnt/data/expected_schema.md")
path.write_text(content, encoding="utf-8")
str(path)
