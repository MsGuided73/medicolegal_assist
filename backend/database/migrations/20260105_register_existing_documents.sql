-- Debug/ops migration for "register existing storage objects" workflow

-- 1) Prevent duplicates per case+object_key
CREATE UNIQUE INDEX IF NOT EXISTS documents_case_storage_unique
ON public.documents (case_id, storage_path);

-- 2) Confirm created_by index exists (per updated schema requirements)
CREATE INDEX IF NOT EXISTS documents_created_by_idx
ON public.documents (created_by);

