export interface RollbackTrigger {
  name: string
  condition: string
  severity: 'automatic' | 'manual_approval' | 'emergency'
  threshold: number
  timeWindow: number
}

export interface RollbackProcedure {
  step: number
  action: string
  timeout: number
  rollbackCondition: string
  verificationRequired: boolean
}

export interface RollbackPlan {
  triggers: RollbackTrigger[]
  procedures: RollbackProcedure[]
}

export const ProductionRollbackPlan: RollbackPlan = {
  triggers: [
    {
      name: 'Critical Error Rate',
      condition: 'http_errors_5xx_rate > 0.05',
      severity: 'automatic',
      threshold: 0.05,
      timeWindow: 300 
    }
  ],
  procedures: [
    {
      step: 1,
      action: 'Stop new deployments',
      timeout: 30,
      rollbackCondition: 'deployment_stopped',
      verificationRequired: false
    },
    {
      step: 2,
      action: 'Switch load balancer traffic to previous stable version',
      timeout: 120,
      rollbackCondition: 'traffic_switched',
      verificationRequired: true
    }
  ]
}
