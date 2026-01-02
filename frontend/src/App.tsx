import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import Layout from '@/components/Layout'
import UploadPage from '@/pages/UploadPage'
import DocumentAnalysisPage from '@/pages/DocumentAnalysisPage'
import CasesPage from '@/pages/CasesPage'
import CreateCasePage from '@/pages/CreateCasePage'
import CaseDetailPage from '@/pages/CaseDetailPage'
import ReportsPage from '@/pages/ReportsPage'
import ReportEditorPage from '@/pages/ReportEditorPage'
import ExaminationFormPage from '@/pages/ExaminationFormPage'
import { Toaster } from 'react-hot-toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="cases/:id/analysis" element={<DocumentAnalysisPage />} />
            {/* Phase 5 clinical routes */}
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/new" element={<CreateCasePage />} />
            <Route path="cases/:id" element={<CaseDetailPage />} />
            <Route path="examinations" element={<ExaminationFormPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:id" element={<ReportEditorPage />} />
            <Route path="settings" element={<div>Settings (Phase 5)</div>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
