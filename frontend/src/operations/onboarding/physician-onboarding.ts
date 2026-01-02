export interface OnboardingStep {
  stepId: string
  title: string
  description: string
  type: 'video' | 'interactive' | 'quiz' | 'document' | 'practice'
  estimatedTime: number // minutes
  required: boolean
}

export interface OnboardingProgram {
  programId: string
  userType: 'physician' | 'medical_assistant' | 'administrator'
  steps: OnboardingStep[]
  estimatedDuration: number // minutes
  completionRequired: boolean
}

export const PhysicianOnboardingProgram: OnboardingProgram = {
  programId: 'physician-onboarding-v2.1',
  userType: 'physician',
  estimatedDuration: 120,
  completionRequired: true,
  steps: [
    {
      stepId: 'welcome_orientation',
      title: 'Welcome to MediCase',
      description: 'Introduction to MediCase platform and AI-assisted medical evaluation',
      type: 'video',
      estimatedTime: 15,
      required: true
    },
    {
      stepId: 'hipaa_compliance_training',
      title: 'HIPAA Compliance and Data Security',
      description: 'Essential training on HIPAA requirements and MediCase security measures',
      type: 'interactive',
      estimatedTime: 25,
      required: true
    }
  ]
}
