-- ============================================================================
-- PHYSICAL EXAMINATIONS
-- ============================================================================

-- Examination sessions
CREATE TABLE IF NOT EXISTS examinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    
    exam_date DATE NOT NULL,
    exam_location TEXT,
    
    -- Physician info
    examining_physician_id UUID REFERENCES profiles(id),
    physician_notes TEXT,
    
    -- Patient presentation
    patient_demeanor TEXT,
    reliability TEXT CHECK (reliability IN ('reliable', 'questionable', 'unreliable')),
    
    -- Overall status
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'reviewed')),
    
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(case_id, exam_date)
);

-- Range of Motion measurements
CREATE TABLE IF NOT EXISTS rom_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    examination_id UUID REFERENCES examinations(id) ON DELETE CASCADE NOT NULL,
    
    body_region TEXT NOT NULL,
    joint TEXT NOT NULL,
    movement TEXT NOT NULL,
    
    side TEXT CHECK (side IN ('left', 'right', 'bilateral')),
    
    -- Measurements in degrees
    active_rom INTEGER,
    passive_rom INTEGER,
    normal_rom INTEGER,
    
    -- Pain and quality
    pain_on_movement BOOLEAN DEFAULT false,
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    end_feel TEXT,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Strength testing
CREATE TABLE IF NOT EXISTS strength_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    examination_id UUID REFERENCES examinations(id) ON DELETE CASCADE NOT NULL,
    
    body_region TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    
    side TEXT CHECK (side IN ('left', 'right', 'bilateral')),
    
    -- Strength grade (0-5 scale)
    strength_grade DECIMAL(2,1) CHECK (strength_grade >= 0 AND strength_grade <= 5),
    strength_description TEXT,
    
    pain_on_testing BOOLEAN DEFAULT false,
    pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Special tests (Orthopedic provocation tests)
CREATE TABLE IF NOT EXISTS special_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    examination_id UUID REFERENCES examinations(id) ON DELETE CASCADE NOT NULL,
    
    test_name TEXT NOT NULL,
    body_region TEXT NOT NULL,
    
    side TEXT CHECK (side IN ('left', 'right', 'bilateral')),
    
    result TEXT CHECK (result IN ('positive', 'negative', 'equivocal')),
    findings TEXT,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REPORTS
-- ============================================================================

-- IME Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    
    report_type TEXT DEFAULT 'ime' CHECK (report_type IN ('ime', 'addendum', 'supplemental')),
    
    -- Report status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'finalized', 'sent')),
    
    -- Dates
    report_date DATE,
    finalized_date DATE,
    sent_date DATE,
    
    -- Authors
    primary_author_id UUID REFERENCES profiles(id),
    reviewed_by_id UUID REFERENCES profiles(id),
    
    -- Content stored as JSON for flexibility
    content JSONB,
    
    -- Generated files
    pdf_path TEXT,
    docx_path TEXT,
    
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report sections (for building reports)
CREATE TABLE IF NOT EXISTS report_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE NOT NULL,
    
    section_type TEXT NOT NULL,
    section_title TEXT NOT NULL,
    section_order INTEGER NOT NULL,
    
    content TEXT NOT NULL,
    
    is_auto_generated BOOLEAN DEFAULT false,
    source_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(report_id, section_order)
);

-- Report templates
CREATE TABLE IF NOT EXISTS report_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name TEXT NOT NULL,
    description TEXT,
    
    template_type TEXT CHECK (template_type IN ('ime', 'addendum', 'supplemental')),
    
    -- Template structure (sections and their order)
    structure JSONB NOT NULL,
    
    -- Default content for sections
    default_content JSONB,
    
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MEDICAL TIMELINE
-- ============================================================================

-- Timeline events (auto-generated from documents, exams, etc.)
CREATE TABLE IF NOT EXISTS timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL,
    
    -- Source of event
    source_type TEXT CHECK (source_type IN ('document', 'examination', 'manual')),
    source_id UUID,
    
    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    
    -- Categorization
    category TEXT,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
    
    -- Display
    is_milestone BOOLEAN DEFAULT false,
    icon TEXT,
    color TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CASE WORKFLOW TRACKING
-- ============================================================================

-- Case assignments (track assignment history)
CREATE TABLE IF NOT EXISTS case_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    
    assigned_to UUID REFERENCES profiles(id) NOT NULL,
    role TEXT CHECK (role IN ('physician', 'medical_assistant', 'reviewer')),
    
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    
    unassigned_at TIMESTAMPTZ,
    unassigned_by UUID REFERENCES profiles(id)
);

-- Case status history
CREATE TABLE IF NOT EXISTS case_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
    
    from_status TEXT,
    to_status TEXT NOT NULL,
    
    changed_by UUID REFERENCES profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    notes TEXT
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Examinations
CREATE INDEX IF NOT EXISTS idx_examinations_case_id ON examinations(case_id);
CREATE INDEX IF NOT EXISTS idx_examinations_physician ON examinations(examining_physician_id);
CREATE INDEX IF NOT EXISTS idx_examinations_date ON examinations(exam_date DESC);

-- ROM and Strength
CREATE INDEX IF NOT EXISTS idx_rom_examination ON rom_measurements(examination_id);
CREATE INDEX IF NOT EXISTS idx_strength_examination ON strength_tests(examination_id);
CREATE INDEX IF NOT EXISTS idx_special_tests_examination ON special_tests(examination_id);

-- Reports
CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_author ON reports(primary_author_id);
CREATE INDEX IF NOT EXISTS idx_report_sections_report ON report_sections(report_id);

-- Timeline
CREATE INDEX IF NOT EXISTS idx_timeline_case_id ON timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_date ON timeline_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_type ON timeline_events(event_type);

-- Case tracking
CREATE INDEX IF NOT EXISTS idx_case_assignments_case ON case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_assignments_user ON case_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_case_status_history_case ON case_status_history(case_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Phase 3 Tables
-- ============================================================================

-- Enable RLS
ALTER TABLE examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rom_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Examinations
CREATE POLICY "Users can view examinations for their cases"
ON examinations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = examinations.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can create examinations for their cases"
ON examinations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = examinations.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can update examinations for their cases"
ON examinations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = examinations.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- RLS Policies for ROM/Strength/Special Tests (similar pattern)
CREATE POLICY "Users can view measurements"
ON rom_measurements FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM examinations e
        JOIN cases c ON c.id = e.case_id
        WHERE e.id = rom_measurements.examination_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can insert measurements"
ON rom_measurements FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM examinations e
        JOIN cases c ON c.id = e.case_id
        WHERE e.id = rom_measurements.examination_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- Apply similar policies for strength_tests and special_tests
CREATE POLICY "Users can view strength tests"
ON strength_tests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM examinations e
        JOIN cases c ON c.id = e.case_id
        WHERE e.id = strength_tests.examination_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can insert strength tests"
ON strength_tests FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM examinations e
        JOIN cases c ON c.id = e.case_id
        WHERE e.id = strength_tests.examination_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can view special tests"
ON special_tests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM examinations e
        JOIN cases c ON c.id = e.case_id
        WHERE e.id = special_tests.examination_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can insert special tests"
ON special_tests FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM examinations e
        JOIN cases c ON c.id = e.case_id
        WHERE e.id = special_tests.examination_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- RLS Policies for Reports
CREATE POLICY "Users can view reports for their cases"
ON reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = reports.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can create reports for their cases"
ON reports FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = reports.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can update reports for their cases"
ON reports FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = reports.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- RLS Policies for Report Sections
CREATE POLICY "Users can view report sections"
ON report_sections FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM reports r
        JOIN cases c ON c.id = r.case_id
        WHERE r.id = report_sections.report_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "Users can insert report sections"
ON report_sections FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM reports r
        JOIN cases c ON c.id = r.case_id
        WHERE r.id = report_sections.report_id
        AND (
            c.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

-- RLS Policies for Timeline
CREATE POLICY "Users can view timeline for their cases"
ON timeline_events FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = timeline_events.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "System can insert timeline events"
ON timeline_events FOR INSERT
WITH CHECK (true);

-- RLS Policies for Case Tracking
CREATE POLICY "Users can view assignments for their cases"
ON case_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = case_assignments.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "System can insert assignments"
ON case_assignments FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view status history"
ON case_status_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = case_status_history.case_id
        AND (
            cases.assigned_physician_id = auth.uid()
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        )
    )
);

CREATE POLICY "System can insert status history"
ON case_status_history FOR INSERT
WITH CHECK (true);
