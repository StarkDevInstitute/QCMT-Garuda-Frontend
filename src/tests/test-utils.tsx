import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

interface ProvidersProps {
  children: ReactNode
  initialRoute?: string
}

function Providers({ children, initialRoute = '/' }: ProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & { initialRoute?: string }
) {
  const { initialRoute, ...renderOptions } = options ?? {}
  return render(ui, {
    wrapper: ({ children }) => <Providers initialRoute={initialRoute}>{children}</Providers>,
    ...renderOptions,
  })
}
