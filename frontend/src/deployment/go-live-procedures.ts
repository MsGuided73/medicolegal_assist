export interface GoLiveTask {
  task: string
  owner: string
  estimatedTime: number
  dependencies?: string[]
  verification: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
}

export interface GoLiveProcedure {
  phase: string
  tasks: GoLiveTask[]
  rollbackPoint: boolean
}

export const ProductionGoLiveProcedures: GoLiveProcedure[] = [
  {
    phase: 'Pre-Launch Preparation',
    rollbackPoint: true,
    tasks: [
      {
        task: 'Deploy application to production environment',
        owner: 'DevOps Team',
        estimatedTime: 30,
        verification: 'Application responds to health checks',
        status: 'pending'
      },
      {
        task: 'Run deployment validation suite',
        owner: 'QA Team',
        estimatedTime: 45,
        dependencies: ['Deploy application to production environment'],
        verification: 'All validation tests pass',
        status: 'pending'
      }
    ]
  },
  {
    phase: 'Full Production Launch',
    rollbackPoint: false,
    tasks: [
      {
        task: 'Enable public registration and access',
        owner: 'Product Team',
        estimatedTime: 15,
        verification: 'Public registration flow working',
        status: 'pending'
      }
    ]
  }
]
