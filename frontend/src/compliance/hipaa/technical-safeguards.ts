export interface TechnicalSafeguard {
  safeguardId: string
  title: string
  requirement: string
  implementation: {
    description: string
    components: string[]
    configuration: Record<string, any>
  }
  complianceStatus: 'compliant' | 'partial' | 'non_compliant'
}

export const MediCaseTechnicalSafeguards: TechnicalSafeguard[] = [
  {
    safeguardId: 'access_control',
    title: 'Access Control (164.312(a))',
    requirement: 'Assign unique user identification, automatic logoff, encryption/decryption',
    implementation: {
      description: 'Role-based access control with multi-factor authentication',
      components: [
        'Supabase Auth with Row Level Security',
        'Multi-factor authentication',
        'Automatic session timeout'
      ],
      configuration: {
        sessionTimeout: 30, // minutes
        mfaRequired: ['physician', 'admin']
      }
    },
    complianceStatus: 'compliant'
  },
  {
    safeguardId: 'transmission_security',
    title: 'Transmission Security (164.312(e))',
    requirement: 'Guard against unauthorized access during transmission',
    implementation: {
      description: 'End-to-end encryption for all data transmission',
      components: [
        'TLS 1.3 for HTTPS connections',
        'Database connection encryption'
      ],
      configuration: {
        tlsVersion: '1.3',
        hstsEnabled: true
      }
    },
    complianceStatus: 'compliant'
  }
]
