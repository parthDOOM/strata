/**
 * TanStack Query client configuration.
 *
 * Exports a pre-configured QueryClient with sensible defaults
 * for financial data caching.
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Query client with financial data caching defaults.
 *
 * Configuration:
 * - staleTime: 5 minutes - how long data is considered fresh
 * - gcTime: 10 minutes - how long unused data stays in cache
 * - retry: 2 - number of retry attempts on failure
 * - refetchOnWindowFocus: true - refresh when user returns to tab
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
            gcTime: 1000 * 60 * 10, // 10 minutes - cache retention
            retry: 2,
            refetchOnWindowFocus: true,
        },
        mutations: {
            retry: 1,
        },
    },
});

export default queryClient;
