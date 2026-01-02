import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock services setup
export const mockServices = {
  documentService: {
    analyze: vi.fn(),
  },
  aiService: {
    analyzeDocument: vi.fn(),
    getProcessingProgress: vi.fn(),
  },
  caseService: {
    saveMedicalEntities: vi.fn(),
    flagForReview: vi.fn(),
  },
  examinationService: {
    saveExamination: vi.fn(),
  },
  reportService: {
    generatePreExamReport: vi.fn(),
    exportToPdf: vi.fn(),
  },
  timelineService: {
    getByCaseId: vi.fn(),
    generate: vi.fn(),
  }
}

export const createIntegrationTestEnvironment = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false }
    }
  })

  return {
    queryClient,
    mockServices,
    cleanup: () => {
      queryClient.clear()
      vi.clearAllMocks()
    }
  }
}

export const IntegrationTestProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })
  
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  )
}
