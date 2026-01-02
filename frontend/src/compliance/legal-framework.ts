export interface ComplianceRequirement {
  id: string
  name: string
  authority: string
  description: string
  status: 'compliant' | 'in_progress' | 'not_started'
}

export const LegalRegulatoryMatrix: ComplianceRequirement[] = [
  {
    id: 'hipaa_privacy',
    name: 'HIPAA Privacy Rule',
    authority: 'HHS OCR',
    description: 'National standards for the protection of individually identifiable health information',
    status: 'compliant'
  },
  {
    id: 'hipaa_security',
    name: 'HIPAA Security Rule',
    authority: 'HHS OCR',
    description: 'National standards for protecting ePHI that is held or transferred in electronic form',
    status: 'compliant'
  },
  {
    id: 'hitech',
    name: 'HITECH Act',
    authority: 'HHS',
    description: 'Requirements for data breach notifications and increased HIPAA enforcement',
    status: 'compliant'
  }
]
