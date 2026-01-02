export interface PhysicalSafeguardCheck {
  safeguardType: string
  requirement: string
  implementation: string
  evidence: string[]
  compliant: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export const ContaboVPSPhysicalSafeguards: PhysicalSafeguardCheck[] = [
  {
    safeguardType: 'Facility Access Controls',
    requirement: '164.310(a)(1) - Limit physical access to ePHI',
    implementation: 'Contabo data centers with restricted physical access',
    evidence: [
      'Contabo SOC 2 Type II certification',
      'Physical access control procedures'
    ],
    compliant: true,
    riskLevel: 'low'
  },
  {
    safeguardType: 'Workstation Security',
    requirement: '164.310(c) - Implement safeguards for workstations',
    implementation: 'VPS instance with hardened Ubuntu, encrypted storage',
    evidence: [
      'Disk encryption verification',
      'Access control configuration'
    ],
    compliant: true,
    riskLevel: 'low'
  }
]
