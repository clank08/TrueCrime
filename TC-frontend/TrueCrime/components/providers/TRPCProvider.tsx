import React, { useState, useCallback } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCReact, createTRPCClient, httpBatchLink, httpLink } from '@trpc/react-query';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { storage } from '../../lib/storage';
import { trpc } from '../../lib/trpc';
// import superjson from 'superjson'; // Temporarily disabled for React Native compatibility
import type { AppRouter } from '../../types/api';

interface TRPCProviderProps {
  children: React.ReactNode;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/trpc';

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Disable retries for auth errors to prevent spam
            retry: (failureCount, error) => {
              if (error?.data?.code === 'UNAUTHORIZED') {
                return false;
              }
              return failureCount < 3;
            },
            // Cache auth data for 5 minutes
            staleTime: 1000 * 60 * 5,
            cacheTime: 1000 * 60 * 30,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      return await storage.getItem('access_token');
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }, []);

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpLink({
          url: API_URL,
          async headers() {
            const token = await getAuthToken();
            const headers: Record<string, string> = {};
            
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }
            
            return headers;
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: 'include', // Include cookies for web compatibility
            });
          },
        }),
      ],
      // transformer: superjson, // Temporarily disabled for React Native compatibility
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {children}
    </trpc.Provider>
  );
}