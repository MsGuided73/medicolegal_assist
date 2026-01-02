-- MediCase Supplementary Schema: Phase 5 & 6
-- Description: Adds collaborative reporting and clinical audit features

-- 1. REPORT COMMENTS (For collaborative editing)
CREATE TABLE IF NOT EXISTS report_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) NOT NULL,
    parent_id UUID REFERENCES report_comments(id) ON DELETE CASCADE, -- For threaded replies
    
    content TEXT NOT NULL,
    selection_json JSONB, -- Stores text selection range if applicable
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REPORT VERSION HISTORY
CREATE TABLE IF NOT EXISTS report_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL,
    revision_number INTEGER NOT NULL,
    
    content_snapshot JSONB NOT NULL,
    created_by UUID REFERENCES profiles(id) NOT NULL,
    change_summary TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id, version_number, revision_number)
);

-- 3. EXAMINATION TEMPLATES (Standardized orthopedic assessments)
CREATE TABLE IF NOT EXISTS examination_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Structure of the exam (e.g., specific ROMs and Strength tests to perform)
    structure JSONB NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLINICAL DATA AUDIT LOG (Tracking manual overrides of AI data)
CREATE TABLE IF NOT EXISTS clinical_audit_trail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    record_type TEXT NOT NULL, -- 'medical_entity', 'clinical_date', 'examination'
    record_id UUID NOT NULL,
    
    action TEXT CHECK (action IN ('ai_generated', 'manual_edit', 'manual_delete', 'verified')),
    previous_value JSONB,
    new_value JSONB,
    
    user_id UUID REFERENCES profiles(id),
    change_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_comments_report ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_versions_report ON report_versions(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_case ON clinical_audit_trail(case_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE examination_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_audit_trail ENABLE ROW LEVEL SECURITY;

-- Apply standard case-based access control
CREATE POLICY "Users can view comments for their cases" ON report_comments FOR SELECT
USING (EXISTS (SELECT 1 FROM reports r JOIN cases c ON c.id = r.case_id WHERE r.id = report_comments.report_id AND (c.assigned_physician_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));

CREATE POLICY "Users can post comments for their cases" ON report_comments FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM reports r JOIN cases c ON c.id = r.case_id WHERE r.id = report_comments.report_id AND (c.assigned_physician_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));

-- Templates are viewable by all authenticated users
CREATE POLICY "Templates are viewable by all" ON examination_templates FOR SELECT USING (true);
