import { useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { trpc } from '@/lib/trpc';
import type { Content, ContentStatus } from '@/types/api';

interface UseContentTrackingOptions {
  showSuccessAlerts?: boolean;
  showErrorAlerts?: boolean;
}

interface UseContentTrackingReturn {
  // Watchlist
  watchlist: (Content & { addedAt: Date })[];
  isInWatchlist: (contentId: string) => boolean;
  addToWatchlist: (contentId: string, notes?: string) => Promise<void>;
  removeFromWatchlist: (contentId: string) => Promise<void>;
  isAddingToWatchlist: boolean;
  isRemovingFromWatchlist: boolean;
  
  // Progress tracking
  updateProgress: (contentId: string, data: {
    status?: ContentStatus;
    rating?: number;
    review?: string;
    notes?: string;
    currentSeason?: number;
    currentEpisode?: number;
    progressPercent?: number;
    isPublic?: boolean;
  }) => Promise<void>;
  markAsWatched: (contentId: string) => Promise<void>;
  isUpdatingProgress: boolean;
  
  // Quick actions
  toggleWatchlist: (contentId: string) => Promise<void>;
  getContentStatus: (contentId: string) => ContentStatus | null;
  isWatched: (contentId: string) => boolean;
  
  // Utilities
  refetchWatchlist: () => void;
  error: string | null;
  isLoading: boolean;
}

// Mock data for content status tracking
// In a real app, this would come from a proper state management solution
const mockContentStatuses: Record<string, ContentStatus> = {};
const mockWatchedContent: Set<string> = new Set();

export function useContentTracking(options: UseContentTrackingOptions = {}): UseContentTrackingReturn {
  const {
    showSuccessAlerts = true,
    showErrorAlerts = true,
  } = options;

  const [localWatchlistIds, setLocalWatchlistIds] = useState<Set<string>>(new Set());
  const [localStatuses, setLocalStatuses] = useState<Record<string, ContentStatus>>(mockContentStatuses);
  const [localWatched, setLocalWatched] = useState<Set<string>>(mockWatchedContent);

  // tRPC mutations
  const addToWatchlistMutation = trpc.content.addToWatchlist.useMutation();
  const removeFromWatchlistMutation = trpc.content.removeFromWatchlist.useMutation();
  const updateProgressMutation = trpc.content.updateProgress.useMutation();

  // tRPC queries
  const watchlistQuery = trpc.content.getWatchlist.useQuery({
    page: 1,
    limit: 100,
  });

  // Computed states
  const watchlist = watchlistQuery.data?.results || [];
  const isLoading = watchlistQuery.isLoading;
  const error = watchlistQuery.error?.message || 
                addToWatchlistMutation.error?.message || 
                removeFromWatchlistMutation.error?.message || 
                updateProgressMutation.error?.message || 
                null;

  const isAddingToWatchlist = addToWatchlistMutation.isLoading;
  const isRemovingFromWatchlist = removeFromWatchlistMutation.isLoading;
  const isUpdatingProgress = updateProgressMutation.isLoading;

  // Helper functions
  const showAlert = useCallback((title: string, message: string, isError: boolean = false) => {
    if ((isError && showErrorAlerts) || (!isError && showSuccessAlerts)) {
      Alert.alert(title, message);
    }
  }, [showSuccessAlerts, showErrorAlerts]);

  // Watchlist functions
  const isInWatchlist = useCallback((contentId: string): boolean => {
    return localWatchlistIds.has(contentId) || 
           watchlist.some(item => item.id === contentId);
  }, [localWatchlistIds, watchlist]);

  const addToWatchlist = useCallback(async (contentId: string, notes?: string) => {
    try {
      // Optimistic update
      setLocalWatchlistIds(prev => new Set([...prev, contentId]));

      const result = await addToWatchlistMutation.mutateAsync({
        contentId,
        notes,
      });

      showAlert('Added to Watchlist', result.message);

      // Refetch watchlist to get the latest data
      await watchlistQuery.refetch();

    } catch (error) {
      // Revert optimistic update
      setLocalWatchlistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });

      console.error('Failed to add to watchlist:', error);
      showAlert('Error', 'Failed to add to watchlist. Please try again.', true);
    }
  }, [addToWatchlistMutation, watchlistQuery, showAlert]);

  const removeFromWatchlist = useCallback(async (contentId: string) => {
    try {
      // Optimistic update
      setLocalWatchlistIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contentId);
        return newSet;
      });

      const result = await removeFromWatchlistMutation.mutateAsync({
        contentId,
      });

      showAlert('Removed from Watchlist', result.message);

      // Refetch watchlist to get the latest data
      await watchlistQuery.refetch();

    } catch (error) {
      // Revert optimistic update
      setLocalWatchlistIds(prev => new Set([...prev, contentId]));

      console.error('Failed to remove from watchlist:', error);
      showAlert('Error', 'Failed to remove from watchlist. Please try again.', true);
    }
  }, [removeFromWatchlistMutation, watchlistQuery, showAlert]);

  const toggleWatchlist = useCallback(async (contentId: string) => {
    if (isInWatchlist(contentId)) {
      await removeFromWatchlist(contentId);
    } else {
      await addToWatchlist(contentId);
    }
  }, [isInWatchlist, addToWatchlist, removeFromWatchlist]);

  // Progress tracking functions
  const updateProgress = useCallback(async (contentId: string, data: {
    status?: ContentStatus;
    rating?: number;
    review?: string;
    notes?: string;
    currentSeason?: number;
    currentEpisode?: number;
    progressPercent?: number;
    isPublic?: boolean;
  }) => {
    try {
      // Optimistic update for status
      if (data.status) {
        setLocalStatuses(prev => ({
          ...prev,
          [contentId]: data.status!,
        }));

        if (data.status === 'WATCHED') {
          setLocalWatched(prev => new Set([...prev, contentId]));
        }
      }

      const result = await updateProgressMutation.mutateAsync({
        contentId,
        ...data,
      });

      showAlert('Progress Updated', result.message);

    } catch (error) {
      // Revert optimistic update
      if (data.status) {
        setLocalStatuses(prev => {
          const newStatuses = { ...prev };
          delete newStatuses[contentId];
          return newStatuses;
        });

        if (data.status === 'WATCHED') {
          setLocalWatched(prev => {
            const newSet = new Set(prev);
            newSet.delete(contentId);
            return newSet;
          });
        }
      }

      console.error('Failed to update progress:', error);
      showAlert('Error', 'Failed to update progress. Please try again.', true);
    }
  }, [updateProgressMutation, showAlert]);

  const markAsWatched = useCallback(async (contentId: string) => {
    await updateProgress(contentId, { status: 'WATCHED' });
  }, [updateProgress]);

  // Status functions
  const getContentStatus = useCallback((contentId: string): ContentStatus | null => {
    return localStatuses[contentId] || null;
  }, [localStatuses]);

  const isWatched = useCallback((contentId: string): boolean => {
    return localWatched.has(contentId) || getContentStatus(contentId) === 'WATCHED';
  }, [localWatched, getContentStatus]);

  // Utilities
  const refetchWatchlist = useCallback(() => {
    watchlistQuery.refetch();
  }, [watchlistQuery]);

  // Update local state when watchlist data changes
  useMemo(() => {
    const watchlistIds = new Set(watchlist.map(item => item.id));
    setLocalWatchlistIds(prev => {
      // Merge with existing local state
      const merged = new Set([...prev, ...watchlistIds]);
      return merged;
    });
  }, [watchlist]);

  return {
    // Watchlist
    watchlist,
    isInWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isAddingToWatchlist,
    isRemovingFromWatchlist,
    
    // Progress tracking
    updateProgress,
    markAsWatched,
    isUpdatingProgress,
    
    // Quick actions
    toggleWatchlist,
    getContentStatus,
    isWatched,
    
    // Utilities
    refetchWatchlist,
    error,
    isLoading,
  };
}