export interface ReadinessChecklistItem {
  category: string
  item: string
  required: boolean
  status: 'completed' | 'in_progress' | 'not_started' | 'blocked'
  verifiedBy?: string
  verifiedAt?: string
  notes?: string
}

export const ProductionReadinessChecklist: ReadinessChecklistItem[] = [
  {
    category: 'Development & Testing',
    item: 'All Phase 5 core workflows implemented and tested',
    required: true,
    status: 'completed'
  },
  {
    category: 'Development & Testing',
    item: 'Integration test suite passes 100%',
    required: true,
    status: 'completed'
  },
  {
    category: 'Security & Compliance',
    item: 'HIPAA compliance assessment completed',
    required: true,
    status: 'in_progress'
  },
  {
    category: 'Infrastructure & Operations',
    item: 'Production environment provisioned and configured',
    required: true,
    status: 'completed'
  },
  {
    category: 'Legal & Regulatory',
    item: 'Business Associate Agreements (BAA) templates ready',
    required: true,
    status: 'not_started'
  }
]
