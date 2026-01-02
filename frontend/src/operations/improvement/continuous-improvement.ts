export interface CycleObjective {
  objectiveId: string
  description: string
  targetMetric: string
  currentValue: number
  targetValue: number
}

export interface ImprovementCycle {
  cycleId: string
  cycleName: string
  focus: 'performance' | 'user_experience' | 'features' | 'reliability' | 'security'
  objectives: CycleObjective[]
}

export const MediCaseContinuousImprovementProgram = {
  cycles: [
    {
      cycleId: 'cycle_1_performance',
      cycleName: 'Performance Optimization Cycle',
      focus: 'performance',
      objectives: [
        {
          objectiveId: 'reduce_response_time',
          description: 'Reduce average API response time',
          targetMetric: 'avg_api_response_time',
          currentValue: 1500,
          targetValue: 800
        }
      ]
    }
  ]
}
