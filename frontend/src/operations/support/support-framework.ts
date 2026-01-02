export interface SupportSLA {
  priority: string
  firstResponseTime: number // minutes
  resolutionTime: number // hours
  escalationTime: number // hours
  businessHoursOnly: boolean
}

export const MediCaseSupportSLAs: SupportSLA[] = [
  {
    priority: 'critical',
    firstResponseTime: 15,
    resolutionTime: 4,
    escalationTime: 1,
    businessHoursOnly: false 
  },
  {
    priority: 'high',
    firstResponseTime: 60,
    resolutionTime: 8,
    escalationTime: 4,
    businessHoursOnly: true
  }
]

export interface SupportTicket {
  ticketId: string
  customerId: string
  customerEmail: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'technical' | 'billing' | 'compliance'
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: string
  updatedAt: string
}
