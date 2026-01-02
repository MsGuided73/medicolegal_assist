export interface UserGroup {
  groupId: string
  name: string
  userCount: number
  userType: 'physician' | 'medical_assistant' | 'administrator'
}

export interface LaunchPhase {
  phaseId: string
  phaseName: string
  startDate: Date
  description: string
  userGroups: UserGroup[]
}

export interface LaunchPlan {
  planId: string
  launchDate: Date
  strategy: 'big_bang' | 'phased_rollout' | 'soft_launch'
  phases: LaunchPhase[]
}

export const MediCaseLaunchPlan: LaunchPlan = {
  planId: 'medicase-launch-2026-q1',
  launchDate: new Date('2026-02-01'),
  strategy: 'phased_rollout',
  phases: [
    {
      phaseId: 'phase1_internal_pilot',
      phaseName: 'Internal Pilot and Beta Testing',
      startDate: new Date('2026-01-15'),
      description: 'Limited pilot with internal medical advisors',
      userGroups: [
        {
          groupId: 'beta_physicians',
          name: 'Beta Test Physicians',
          userCount: 10,
          userType: 'physician'
        }
      ]
    }
  ]
}
