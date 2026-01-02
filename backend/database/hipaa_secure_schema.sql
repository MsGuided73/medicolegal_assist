-- MediCase Secure Schema (HIPAA-Ready)
-- Description: PHI Encryption at Rest + Access Audit Logging

-- 1. SECURE AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_logs_phi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL, -- 'read', 'write', 'export'
    resource_type TEXT NOT NULL, -- 'case', 'document'
    resource_id UUID NOT NULL,
    phi_accessed BOOLEAN DEFAULT true,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SECURE CLINICAL DATA (WITH ENCRYPTED FIELDS)
-- Note: In Supabase, we use BYTEA for encrypted binary data or TEXT for base64
-- Below we extend existing tables with encrypted variants if needed, or define new ones

CREATE TABLE IF NOT EXISTS cases_secure (
    id UUID PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
    patient_name_encrypted TEXT, 
    patient_dob_encrypted TEXT,
    medical_notes_encrypted TEXT,
    encryption_key_id TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ACCESS LOGGING TRIGGER
CREATE OR REPLACE FUNCTION log_phi_access()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs_phi (user_id, action, resource_type, resource_id, ip_address)
    VALUES (auth.uid(), 'write', TG_TABLE_NAME, NEW.id, null);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers
DROP TRIGGER IF EXISTS tr_audit_cases_secure ON cases_secure;
CREATE TRIGGER tr_audit_cases_secure
AFTER INSERT OR UPDATE ON cases_secure
FOR EACH ROW EXECUTE FUNCTION log_phi_access();

-- 4. RLS POLICIES FOR AUDIT
ALTER TABLE audit_logs_phi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins and auditors can view phi audit" 
ON audit_logs_phi FOR SELECT 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
