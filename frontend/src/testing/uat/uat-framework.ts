export type UATCategory = 
  | 'case_management'
  | 'document_upload'
  | 'ai_analysis'
  | 'examination_recording'
  | 'report_generation'
  | 'data_editing'
  | 'user_interface'
  | 'performance'
  | 'security'
  | 'accessibility'

export interface UATTestStep {
  step: number
  action: string
  data?: string
  expectedResult: string
}

export interface UATDefect {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  stepsToReproduce: string[]
  actualResult: string
  expectedResult: string
  screenshots?: string[]
  reportedBy: string
  reportedAt: string
  status: 'open' | 'fixed' | 'verified' | 'closed'
}

export interface UATTestCase {
  id: string
  title: string
  category: UATCategory
  priority: 'high' | 'medium' | 'low'
  userRole: 'physician' | 'admin' | 'support'
  preconditions: string[]
  testSteps: UATTestStep[]
  expectedResult: string
  acceptanceCriteria: string[]
  testData: Record<string, any>
  estimatedTime: number // minutes
  actualTime?: number
  status: 'pending' | 'passed' | 'failed' | 'blocked'
  defects: UATDefect[]
  testerNotes: string
  testedBy?: string
  testedAt?: string
}

export const CoreUATTestCases: UATTestCase[] = [
  {
    id: 'UAT-001',
    title: 'Create New IME Case with Complete Information',
    category: 'case_management',
    priority: 'high',
    userRole: 'physician',
    preconditions: [
      'User is logged in as a physician',
      'User has case creation permissions',
      'System is in normal operating state'
    ],
    testSteps: [
      {
        step: 1,
        action: 'Navigate to Cases page',
        expectedResult: 'Cases list page loads within 2 seconds'
      },
      {
        step: 2,
        action: 'Click "New Case" button',
        expectedResult: 'Case creation form opens'
      },
      {
        step: 3,
        action: 'Fill patient info and create',
        data: 'John Doe, 05/15/1980',
        expectedResult: 'Redirection to case detail page'
      }
    ],
    expectedResult: 'New case is created successfully',
    acceptanceCriteria: [
      'Case appears in cases list',
      'User receives clear success feedback'
    ],
    testData: {
      patient_name: 'John Doe',
      date_of_birth: '1980-05-15'
    },
    estimatedTime: 5,
    status: 'pending',
    defects: [],
    testerNotes: ''
  },
  {
    id: 'UAT-002',
    title: 'Review and Edit AI Extracted Entity',
    category: 'data_editing',
    priority: 'high',
    userRole: 'physician',
    preconditions: [
      'A case exists with processed documents',
      'AI has extracted medical entities'
    ],
    testSteps: [
      { step: 1, action: 'Open Case Detail -> AI Analysis', expectedResult: 'Analysis results load' },
      { step: 2, action: 'Click Edit on a Diagnosis', expectedResult: 'Edit form state is enabled' },
      { step: 3, action: 'Change text and save', expectedResult: 'Audit log entry created, status updated' }
    ],
    expectedResult: 'Physician can manually correct AI errors with audit trail',
    acceptanceCriteria: [
      'Original text is preserved for revert',
      'Edit is reflected in final reports'
    ],
    testData: {},
    estimatedTime: 5,
    status: 'pending',
    defects: [],
    testerNotes: ''
  }
]
