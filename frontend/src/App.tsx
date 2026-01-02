import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

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
      <div className="min-h-screen bg-background text-left">
        <div className="container mx-auto p-8">
          <h1 className="text-4xl font-bold text-primary">
            MediCase
          </h1>
          <p className="text-muted-foreground mt-2">
            IME Platform - Frontend Setup Complete
          </p>
        </div>
      </div>
    </QueryClientProvider>
  )
}

export default App
