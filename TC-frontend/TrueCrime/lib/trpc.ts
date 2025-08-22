import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { storage } from './storage';
import type { AppRouter } from '../types/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/trpc';

// Create the tRPC client
export const trpc = createTRPCReact<AppRouter>();

// Get auth token from storage
async function getAuthToken(): Promise<string | null> {
  try {
    return await storage.getItem('access_token');
  } catch (error) {
    console.warn('Failed to get auth token:', error);
    return null;
  }
}

// Create tRPC client with auth headers
export function createTRPCClientWithAuth() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: API_URL,
        async headers() {
          try {
            const token = await getAuthToken();
            return {
              Authorization: token ? `Bearer ${token}` : '',
            };
          } catch (error) {
            console.warn('Failed to set auth headers:', error);
            return {};
          }
        },
      }),
    ],
  });
}

// Standalone client for use outside React components
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      async headers() {
        try {
          const token = await getAuthToken();
          return {
            Authorization: token ? `Bearer ${token}` : '',
          };
        } catch (error) {
          console.warn('Failed to set auth headers:', error);
          return {};
        }
      },
    }),
  ],
});

// Infer types from the router
export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;