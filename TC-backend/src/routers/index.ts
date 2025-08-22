import { router } from '@/lib/trpc';
import { authRouter } from './auth.router';
import { contentRouter } from './content.router';

/**
 * Main application router
 * This combines all feature routers into a single API
 */
export const appRouter = router({
  auth: authRouter,
  content: contentRouter,
  // Future routers will be added here:
  // user: userRouter,
  // social: socialRouter,
  // platform: platformRouter,
  // notification: notificationRouter,
  // analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;