'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes (data is considered fresh)
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Keep cached data for 10 minutes (garbage collection)
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            // Retry failed requests 2 times
            retry: 2,
            // Don't refetch on window focus (optional - set to true if you want)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect automatically
            refetchOnReconnect: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

