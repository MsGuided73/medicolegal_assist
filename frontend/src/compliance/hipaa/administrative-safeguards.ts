export interface HIPAAPermission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete' | 'export')[]
  conditions?: {
    patientRelation?: 'assigned' | 'treating' | 'consulting'
    timeLimit?: number // hours
    ipRestrictions?: string[]
    mfaRequired?: boolean
  }
}

export interface HIPAARole {
  roleId: string
  roleName: string
  permissions: HIPAAPermission[]
  dataAccessLevel: 'full' | 'limited' | 'read_only' | 'none'
  auditLevel: 'comprehensive' | 'standard' | 'basic'
}

export const MediCaseHIPAARoles: HIPAARole[] = [
  {
    roleId: 'physician',
    roleName: 'Licensed Physician',
    permissions: [
      {
        resource: 'cases',
        actions: ['create', 'read', 'update', 'delete'],
        conditions: {
          patientRelation: 'assigned',
          mfaRequired: true
        }
      },
      {
        resource: 'reports',
        actions: ['create', 'read', 'update', 'export'],
        conditions: {
          patientRelation: 'assigned',
          mfaRequired: true
        }
      }
    ],
    dataAccessLevel: 'full',
    auditLevel: 'comprehensive'
  }
]
