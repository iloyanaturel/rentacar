'use client';

import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }
  browserClient ??= makeQueryClient();
  return browserClient;
}

/** Shared instance for AuthProvider clear() */
export const queryClient = {
  clear() {
    getQueryClient().clear();
  },
};
