import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import Layout from '@/components/Layout'
import UploadDocument from '@/pages/UploadDocument'
import Results from '@/pages/Results'

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
            <Route path="upload" element={<UploadDocument />} />
            <Route path="results" element={<Results />} />
            {/* Phase 5 clinical routes will go here */}
            <Route path="cases" element={<div>Cases List (Phase 5)</div>} />
            <Route path="cases/:id" element={<div>Case Detail (Phase 5)</div>} />
            <Route path="examinations" element={<div>Examinations (Phase 5)</div>} />
            <Route path="reports" element={<div>Reports (Phase 5)</div>} />
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
