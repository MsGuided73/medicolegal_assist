export type ReliabilityLevel = "reliable" | "questionable" | "unreliable"
export type ExamStatus = "in_progress" | "completed" | "reviewed"
export type Side = "left" | "right" | "bilateral"
export type TestResult = "positive" | "negative" | "equivocal"

export interface ROMMeasurement {
  id: string
  examination_id: string
  body_region: string
  joint: string
  movement: string
  side: Side
  active_rom?: number
  passive_rom?: number
  normal_rom?: number
  pain_on_movement: boolean
  pain_level?: number
  end_feel?: string
  notes?: string
}

export interface StrengthTest {
  id: string
  examination_id: string
  body_region: string
  muscle_group: string
  side: Side
  strength_grade?: number
  strength_description?: string
  pain_on_testing: boolean
  pain_level?: number
  notes?: string
}

export interface SpecialTest {
  id: string
  examination_id: string
  test_name: string
  body_region: string
  side: Side
  result?: TestResult
  findings?: string
  notes?: string
}

export interface Examination {
  id: string
  case_id: string
  exam_date: string
  exam_location?: string
  status: ExamStatus
  reliability?: ReliabilityLevel
  patient_demeanor?: string
  physician_notes?: string
  created_at: string
  updated_at: string
  rom_measurements?: ROMMeasurement[]
  strength_tests?: StrengthTest[]
  special_tests?: SpecialTest[]
}
