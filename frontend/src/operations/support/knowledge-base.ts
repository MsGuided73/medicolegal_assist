export interface KnowledgeBaseArticle {
  articleId: string
  title: string
  content: string
  category: 'getting_started' | 'features' | 'troubleshooting' | 'compliance'
  audience: 'all_users' | 'physicians' | 'administrators'
  lastUpdated: string
}

export const MediCaseKnowledgeBase: KnowledgeBaseArticle[] = [
  {
    articleId: 'kb-001',
    title: 'Getting Started with MediCase: Physician Onboarding',
    content: 'Welcome to MediCase! This guide will help you get started with our AI-powered medical evaluation platform.',
    category: 'getting_started',
    audience: 'physicians',
    lastUpdated: '2025-12-01'
  },
  {
    articleId: 'kb-003',
    title: 'HIPAA Compliance and Data Security',
    content: 'MediCase is designed to meet HIPAA requirements for protecting Protected Health Information (PHI).',
    category: 'compliance',
    audience: 'all_users',
    lastUpdated: '2025-12-10'
  }
]
