import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import type { SearchFilters, Content, Pagination } from '@/types/api';

interface UseSearchOptions {
  initialQuery?: string;
  initialFilters?: SearchFilters;
  debounceMs?: number;
  minQueryLength?: number;
  autoSearch?: boolean;
}

interface UseSearchReturn {
  // State
  query: string;
  filters: SearchFilters;
  results: Content[];
  pagination: Pagination | null;
  suggestions: Array<{ id: string; text: string; type: 'recent' | 'trending' | 'autocomplete' }>;
  recentSearches: string[];
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  isSearching: boolean;
  
  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  updateFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  clearFilters: () => void;
  search: (searchQuery?: string) => void;
  loadMore: () => void;
  refresh: () => void;
  clearResults: () => void;
  addToRecentSearches: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Error handling
  error: string | null;
  hasNextPage: boolean;
}

const RECENT_SEARCHES_KEY = 'truecrime_recent_searches';
const MAX_RECENT_SEARCHES = 10;

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    initialQuery = '',
    initialFilters = {},
    debounceMs = 300,
    minQueryLength = 2,
    autoSearch = true,
  } = options;

  // State
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>({ 
    region: 'US', 
    includeUnavailable: false,
    ...initialFilters 
  });
  const [results, setResults] = useState<Content[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Refs for debouncing and cancellation
  const searchTimeoutRef = useRef<any>();
  const lastSearchRef = useRef<string>('');
  const isMountedRef = useRef(true);

  // tRPC queries - using manual query approach
  const [searchParams, setSearchParams] = useState<{
    query: string;
    page: number;
    limit: number;
    filters: SearchFilters;
    sort: string;
  } | null>(null);

  // Comment out tRPC query for debugging - using direct fetch instead
  // const searchQuery = trpc.content.search.useQuery(
  //   searchParams || {
  //     query: '',
  //     page: 1,
  //     limit: 20,
  //     filters: {},
  //     sort: 'relevance',
  //   },
  //   {
  //     enabled: !!searchParams && searchParams.query.length >= minQueryLength,
  //     onSettled: (data, error) => {
  //       console.log('Query settled:', { data, error, searchParams, enabled: !!searchParams && searchParams.query.length >= minQueryLength });
  //     },
  //     onSuccess: (data) => {
  //       console.log('Search success:', { data, searchParams, isMounted: isMountedRef.current });
  //       if (isMountedRef.current && searchParams) {
  //         if (searchParams.page === 1) {
  //           console.log('Setting results:', data.results);
  //           setResults(data.results);
  //           setLastSearchQuery(searchParams.query);
  //         } else {
  //           setResults(prev => [...prev, ...data.results]);
  //         }
  //         setPagination(data.pagination);
  //       }
  //     },
  //     onError: (error) => {
  //       console.error('Search failed:', error);
  //       if (isMountedRef.current && searchParams?.page === 1) {
  //         setResults([]);
  //         setPagination(null);
  //       }
  //     },
  //   }
  // );

  // Mock query object for compatibility
  const searchQuery = {
    isLoading: false,
    error: null,
  };

  // Computed states
  const isLoading = searchQuery.isLoading && currentPage === 1;
  const isLoadingMore = searchQuery.isLoading && currentPage > 1;
  const isSearching = searchQuery.isLoading;
  const error = searchQuery.error?.message || null;
  const hasNextPage = pagination?.hasNext || false;

  // Load recent searches from storage
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        // In a real app, you would use AsyncStorage or similar
        // For now, we'll use a simple in-memory array
        setRecentSearches([]);
      } catch (error) {
        console.warn('Failed to load recent searches:', error);
      }
    };

    loadRecentSearches();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!autoSearch) return;

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short
    if (query.length < minQueryLength) {
      setResults([]);
      setPagination(null);
      return;
    }

    // Set up new timeout
    searchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && query !== lastSearchRef.current) {
        performSearch(query, 1, true);
      }
    }, debounceMs);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, filters, autoSearch, debounceMs, minQueryLength]);

  // Perform search function with direct fetch for debugging
  const performSearch = useCallback(async (
    searchQuery: string,
    page: number = 1,
    reset: boolean = true
  ) => {
    if (!searchQuery.trim()) return;

    console.log('performSearch called:', { searchQuery, page, reset, filters });

    setCurrentPage(page);
    lastSearchRef.current = searchQuery;

    // Direct fetch for debugging
    try {
      const searchParams = {
        query: searchQuery.trim(),
        page,
        limit: 20,
        filters,
        sort: 'relevance',
      };
      
      console.log('Making direct fetch with params:', searchParams);
      
      const url = `http://localhost:3001/api/trpc/content.search?input=${encodeURIComponent(JSON.stringify(searchParams))}`;
      console.log('Fetch URL:', url);
      
      const response = await fetch(url);
      console.log('Fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetch response data:', data);
        
        if (data.result?.data) {
          const { results, pagination } = data.result.data;
          console.log('Setting results from direct fetch:', results);
          setResults(results);
          setPagination(pagination);
          setLastSearchQuery(searchQuery);
        }
      } else {
        console.error('Fetch failed with status:', response.status);
        setResults([]);
        setPagination(null);
      }
    } catch (error) {
      console.error('Direct fetch error:', error);
      setResults([]);
      setPagination(null);
    }
  }, [filters]);

  // Actions
  const search = useCallback((searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (queryToSearch.trim()) {
      performSearch(queryToSearch, 1, true);
      addToRecentSearches(queryToSearch);
    }
  }, [query, performSearch]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isLoadingMore && lastSearchQuery) {
      performSearch(lastSearchQuery, currentPage + 1, false);
    }
  }, [hasNextPage, isLoadingMore, lastSearchQuery, currentPage, performSearch]);

  const refresh = useCallback(() => {
    if (lastSearchQuery) {
      performSearch(lastSearchQuery, 1, true);
    }
  }, [lastSearchQuery, performSearch]);

  const clearResults = useCallback(() => {
    setResults([]);
    setPagination(null);
    setLastSearchQuery('');
    setCurrentPage(1);
  }, []);

  const updateFilter = useCallback(<K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ region: 'US', includeUnavailable: false });
  }, []);

  const addToRecentSearches = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(item => item !== trimmedQuery);
      const updated = [trimmedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      // In a real app, save to AsyncStorage here
      
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    // In a real app, clear AsyncStorage here
  }, []);

  // Generate search suggestions
  const suggestions = useMemo(() => {
    const sampleSuggestions = [
      { id: 'trending-1', text: 'Ted Bundy', type: 'trending' as const },
      { id: 'trending-2', text: 'Jeffrey Dahmer', type: 'trending' as const },
      { id: 'trending-3', text: 'Serial Killers', type: 'trending' as const },
      { id: 'autocomplete-1', text: 'Netflix Documentaries', type: 'autocomplete' as const },
      { id: 'autocomplete-2', text: 'Missing Persons Cases', type: 'autocomplete' as const },
    ];

    // Filter suggestions based on current query
    if (query.length >= 1) {
      return sampleSuggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(query.toLowerCase())
      );
    }

    return sampleSuggestions;
  }, [query]);

  return {
    // State
    query,
    filters,
    results,
    pagination,
    suggestions,
    recentSearches,
    
    // Loading states
    isLoading,
    isLoadingMore,
    isSearching,
    
    // Actions
    setQuery,
    setFilters,
    updateFilter,
    clearFilters,
    search,
    loadMore,
    refresh,
    clearResults,
    addToRecentSearches,
    clearRecentSearches,
    
    // Error handling
    error,
    hasNextPage,
  };
}