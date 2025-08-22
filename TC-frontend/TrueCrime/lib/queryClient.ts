import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { Platform } from 'react-native'

interface QueryError extends Error {
  status?: number
  code?: string
}

const handleError = (error: QueryError) => {
  if (error.status === 401) {
    console.error('Authentication error - user needs to log in')
  } else if (error.status === 429) {
    console.error('Rate limited - too many requests')
  } else if (error.status && error.status >= 500) {
    console.error('Server error:', error.message)
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      retry: (failureCount, error: QueryError) => {
        if (error.status === 429 || error.status === 401) return false
        if (error.status && error.status >= 500) return failureCount < 2
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
      onError: handleError,
    },
  },
  queryCache: new QueryCache({
    onError: (error: QueryError, query) => {
      if (query.state.data !== undefined) {
        console.log(`Query failed but we have cached data, using that`)
        return
      }
      handleError(error)
    },
  }),
  mutationCache: new MutationCache({
    onError: handleError,
  }),
})

export const cacheKeys = {
  content: {
    all: ['content'] as const,
    lists: () => [...cacheKeys.content.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...cacheKeys.content.lists(), filters] as const,
    details: () => [...cacheKeys.content.all, 'detail'] as const,
    detail: (id: string) => [...cacheKeys.content.details(), id] as const,
    byCase: (caseId: string) => [...cacheKeys.content.all, 'case', caseId] as const,
    byKiller: (killerId: string) => [...cacheKeys.content.all, 'killer', killerId] as const,
    byPlatform: (platform: string) => [...cacheKeys.content.all, 'platform', platform] as const,
  },
  
  user: {
    all: ['user'] as const,
    current: () => [...cacheKeys.user.all, 'current'] as const,
    profile: (userId: string) => [...cacheKeys.user.all, 'profile', userId] as const,
    watchlist: (userId: string) => [...cacheKeys.user.all, 'watchlist', userId] as const,
    progress: (userId: string) => [...cacheKeys.user.all, 'progress', userId] as const,
    preferences: (userId: string) => [...cacheKeys.user.all, 'preferences', userId] as const,
  },
  
  search: {
    all: ['search'] as const,
    query: (query: string, filters?: Record<string, unknown>) => 
      [...cacheKeys.search.all, query, ...(filters ? [filters] : [])] as const,
    suggestions: (query: string) => [...cacheKeys.search.all, 'suggestions', query] as const,
  },
  
  platform: {
    all: ['platform'] as const,
    availability: (contentId: string) => [...cacheKeys.platform.all, 'availability', contentId] as const,
    pricing: () => [...cacheKeys.platform.all, 'pricing'] as const,
  },
  
  social: {
    all: ['social'] as const,
    feed: (userId?: string) => [...cacheKeys.social.all, 'feed', userId || 'global'] as const,
    discussions: (contentId: string) => [...cacheKeys.social.all, 'discussions', contentId] as const,
    clubs: (userId: string) => [...cacheKeys.social.all, 'clubs', userId] as const,
  },
}

export const cacheTimes = {
  instant: 0,
  short: 30 * 1000,
  medium: 5 * 60 * 1000,
  long: 30 * 60 * 1000,
  veryLong: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
} as const

export const getCacheConfig = (type: 'static' | 'user' | 'dynamic' | 'realtime') => {
  switch (type) {
    case 'static':
      return {
        staleTime: cacheTimes.day,
        cacheTime: cacheTimes.day * 7,
      }
    case 'user':
      return {
        staleTime: cacheTimes.medium,
        cacheTime: cacheTimes.long,
      }
    case 'dynamic':
      return {
        staleTime: cacheTimes.short,
        cacheTime: cacheTimes.medium,
      }
    case 'realtime':
      return {
        staleTime: cacheTimes.instant,
        cacheTime: cacheTimes.short,
      }
  }
}

export const invalidateUserData = async (userId: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: cacheKeys.user.watchlist(userId) }),
    queryClient.invalidateQueries({ queryKey: cacheKeys.user.progress(userId) }),
    queryClient.invalidateQueries({ queryKey: cacheKeys.user.preferences(userId) }),
  ])
}

export const prefetchContent = async (contentIds: string[]) => {
  const promises = contentIds.map(id => 
    queryClient.prefetchQuery({
      queryKey: cacheKeys.content.detail(id),
      queryFn: () => fetchContentDetail(id),
      staleTime: cacheTimes.long,
    })
  )
  await Promise.all(promises)
}

const fetchContentDetail = async (id: string) => {
  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/content/${id}`)
  if (!response.ok) {
    const error = new Error('Failed to fetch content') as QueryError
    error.status = response.status
    throw error
  }
  return response.json()
}

if (Platform.OS === 'web') {
  if (typeof window !== 'undefined') {
    ;(window as any).queryClient = queryClient
    ;(window as any).cacheKeys = cacheKeys
  }
}