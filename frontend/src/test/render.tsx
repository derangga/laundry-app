import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { act, render, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Toaster } from '@/components/ui/sonner'
import { routeTree } from '@/routeTree.gen'

type RenderOptions = {
  initialPath: string
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false },
    },
  })
}

export type RenderWithRouterResult = RenderResult & {
  router: ReturnType<typeof buildRouter>
  queryClient: QueryClient
  user: ReturnType<typeof userEvent.setup>
}

function buildRouter(initialPath: string, queryClient: QueryClient) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
    context: { queryClient },
    defaultPreload: false,
  })
}

export async function renderWithRouter(
  options: RenderOptions,
): Promise<RenderWithRouterResult> {
  const queryClient = makeQueryClient()
  const router = buildRouter(options.initialPath, queryClient)

  await router.load()

  let result!: RenderResult
  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>,
    )
  })

  return {
    ...result,
    router,
    queryClient,
    user: userEvent.setup(),
  }
}
