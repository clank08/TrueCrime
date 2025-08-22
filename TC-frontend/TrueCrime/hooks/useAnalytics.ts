import { useCallback, useEffect } from 'react'
import * as Sentry from 'sentry-expo'
import { Platform } from 'react-native'

type EventProperties = Record<string, any>

interface AnalyticsEvent {
  event: string
  properties?: EventProperties
  timestamp: number
  sessionId: string
  platform: string
  userId?: string
}

const SESSION_ID = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`

class Analytics {
  private queue: AnalyticsEvent[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private maxQueueSize = 20
  private flushIntervalMs = 30000
  private apiEndpoint = process.env.EXPO_PUBLIC_API_URL + '/api/analytics'

  constructor() {
    if (!__DEV__) {
      this.startFlushInterval()
    }
  }

  track(event: string, properties?: EventProperties, userId?: string) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: properties || {},
      timestamp: Date.now(),
      sessionId: SESSION_ID,
      platform: Platform.OS,
      userId,
    }

    if (__DEV__) {
      console.log('📊 Analytics Event:', event, properties)
      return
    }

    this.queue.push(analyticsEvent)
    
    Sentry.Native.addBreadcrumb({
      message: event,
      category: 'analytics',
      data: properties,
      level: 'info',
    })

    if (this.queue.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  private async flush() {
    if (this.queue.length === 0) return

    const events = [...this.queue]
    this.queue = []

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
      })

      if (!response.ok) {
        console.error('Failed to send analytics:', response.status)
        this.queue.unshift(...events.slice(0, 10))
      }
    } catch (error) {
      console.error('Analytics flush error:', error)
      this.queue.unshift(...events.slice(0, 10))
    }
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, this.flushIntervalMs)
  }

  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

const analytics = new Analytics()

export const useAnalytics = (userId?: string) => {
  const trackEvent = useCallback((event: string, properties?: EventProperties) => {
    analytics.track(event, properties, userId)
  }, [userId])

  const trackScreen = useCallback((screenName: string, properties?: EventProperties) => {
    analytics.track('screen_view', {
      screen_name: screenName,
      ...properties,
    }, userId)
  }, [userId])

  const trackError = useCallback((error: Error, context?: EventProperties) => {
    analytics.track('error', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    }, userId)

    Sentry.Native.captureException(error, {
      contexts: {
        analytics: context || {},
      },
    })
  }, [userId])

  const trackTiming = useCallback((category: string, value: number, properties?: EventProperties) => {
    analytics.track('timing', {
      category,
      value,
      ...properties,
    }, userId)
  }, [userId])

  const trackSearch = useCallback((query: string, filters?: Record<string, any>, resultsCount?: number) => {
    analytics.track('search', {
      query,
      filters,
      results_count: resultsCount,
    }, userId)
  }, [userId])

  const trackContentInteraction = useCallback((
    contentId: string,
    action: 'view' | 'add_to_watchlist' | 'mark_watched' | 'rate' | 'share',
    properties?: EventProperties
  ) => {
    analytics.track(`content_${action}`, {
      content_id: contentId,
      ...properties,
    }, userId)
  }, [userId])

  const trackPlatformInteraction = useCallback((
    platform: string,
    action: 'connect' | 'disconnect' | 'view_content',
    properties?: EventProperties
  ) => {
    analytics.track(`platform_${action}`, {
      platform,
      ...properties,
    }, userId)
  }, [userId])

  useEffect(() => {
    return () => {
      analytics.cleanup()
    }
  }, [])

  return {
    trackEvent,
    trackScreen,
    trackError,
    trackTiming,
    trackSearch,
    trackContentInteraction,
    trackPlatformInteraction,
  }
}

export const analyticsEvents = {
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',
  CONTENT_SEARCHED: 'content_searched',
  CONTENT_VIEWED: 'content_viewed',
  CONTENT_ADDED_TO_WATCHLIST: 'content_added_to_watchlist',
  CONTENT_REMOVED_FROM_WATCHLIST: 'content_removed_from_watchlist',
  CONTENT_MARKED_WATCHED: 'content_marked_watched',
  CONTENT_RATED: 'content_rated',
  CONTENT_SHARED: 'content_shared',
  FILTER_APPLIED: 'filter_applied',
  FILTER_CLEARED: 'filter_cleared',
  PLATFORM_CONNECTED: 'platform_connected',
  PLATFORM_DISCONNECTED: 'platform_disconnected',
  SOCIAL_FRIEND_ADDED: 'social_friend_added',
  SOCIAL_CLUB_JOINED: 'social_club_joined',
  SOCIAL_POST_CREATED: 'social_post_created',
  PUSH_NOTIFICATION_ENABLED: 'push_notification_enabled',
  PUSH_NOTIFICATION_DISABLED: 'push_notification_disabled',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  ERROR_OCCURRED: 'error_occurred',
  PERFORMANCE_METRIC: 'performance_metric',
} as const

export const useScreenTracking = (screenName: string, properties?: EventProperties) => {
  const { trackScreen } = useAnalytics()

  useEffect(() => {
    trackScreen(screenName, properties)
  }, [screenName, trackScreen])
}

export const usePerformanceTracking = () => {
  const { trackTiming } = useAnalytics()

  const trackAPICall = useCallback(async <T,>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now()
    
    try {
      const result = await apiCall()
      const duration = Date.now() - startTime
      
      trackTiming('api_call', duration, {
        endpoint: name,
        success: true,
      })
      
      if (duration > 3000) {
        console.warn(`Slow API call: ${name} took ${duration}ms`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      
      trackTiming('api_call', duration, {
        endpoint: name,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      
      throw error
    }
  }, [trackTiming])

  const trackRenderTime = useCallback((componentName: string) => {
    const startTime = Date.now()
    
    return () => {
      const duration = Date.now() - startTime
      trackTiming('component_render', duration, {
        component: componentName,
      })
    }
  }, [trackTiming])

  return {
    trackAPICall,
    trackRenderTime,
  }
}