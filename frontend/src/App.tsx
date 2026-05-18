import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './router'
import { queryClient } from './lib/queryClient'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors toastOptions={{ duration: 4000 }} />
    </QueryClientProvider>
  )
}

export default App
