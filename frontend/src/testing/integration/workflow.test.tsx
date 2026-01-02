import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest' 
import userEvent from '@testing-library/user-event'
import CaseDetailPage from '../../pages/CaseDetailPage'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('@/hooks/useCases', () => ({
  useCase: () => ({ 
    data: {
      id: 'test-case-1',
      case_number: '2026-0001',
      patient_first_name: 'John',
      patient_last_name: 'Doe',
      status: 'open',
      priority: 'high',
      injury_date: '2024-01-01',
    }, 
    isLoading: false 
  }),
  useUpdateCase: () => ({ mutate: vi.fn() })
}))

vi.mock('@/hooks/useTimeline', () => ({
  useCaseTimeline: () => ({ data: [], isLoading: false })
}))

vi.mock('@/hooks/useReports', () => ({
  useReports: () => ({ data: [], isLoading: false }),
  useReport: () => ({ data: null, isLoading: false })
}))

describe('MediCase Workflow Integration', () => {
  const queryClient = new QueryClient({
    defaultOptions: { 
      queries: { retry: false, staleTime: 0 },
    }
  })

  it('navigates through case detail tabs', async () => {
    const user = userEvent.setup()
    
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/cases/test-case-1']}>
          <Routes>
            <Route path="/cases/:id" element={<CaseDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )

    // Verify Initial State
    const patientHeader = await screen.findByText(/John/i)
    expect(patientHeader).toBeInTheDocument()
    
    // Tab Navigation: Physical Exam
    const examTab = screen.getByRole('tab', { name: /Exam/i })
    await user.click(examTab)
    const examHeader = await screen.findByText(/Physical Examination/i)
    expect(examHeader).toBeInTheDocument()

    // Tab Navigation: Timeline
    const timelineTab = screen.getByRole('tab', { name: /Timeline/i })
    await user.click(timelineTab)
    const timelineHeader = await screen.findByText(/Clinical Timeline/i)
    expect(timelineHeader).toBeInTheDocument()

    // Tab Navigation: Reports
    const reportsTab = screen.getByRole('tab', { name: /Reports/i })
    await user.click(reportsTab)
    const reportsPlaceholder = await screen.findByText(/No reports generated/i)
    expect(reportsPlaceholder).toBeInTheDocument()
  })
})
