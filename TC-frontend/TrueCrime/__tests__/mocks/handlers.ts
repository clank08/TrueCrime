import { http, HttpResponse } from 'msw';

export const handlers = [
  // Content API endpoints
  http.get('*/api/content/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id,
      title: 'Mock True Crime Content',
      description: 'A mock true crime documentary series',
      type: 'series',
      genre: ['true-crime', 'documentary'],
      releaseYear: 2023,
      platforms: ['Netflix', 'Hulu'],
      caseId: 'case-123',
      killerId: 'killer-456',
      rating: 8.5,
      contentWarnings: ['violence', 'disturbing imagery'],
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      trailerUrl: 'https://example.com/trailer.mp4'
    });
  }),

  http.get('*/api/content', ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const mockContent = Array.from({ length: limit }, (_, i) => ({
      id: `content-${page}-${i + 1}`,
      title: search ? `Search Result: ${search} ${i + 1}` : `Mock Content ${page}-${i + 1}`,
      description: 'Mock description',
      type: i % 2 === 0 ? 'series' : 'movie',
      genre: ['true-crime'],
      releaseYear: 2020 + i,
      platforms: ['Netflix'],
      rating: 7 + (i % 3),
      thumbnailUrl: `https://example.com/thumb-${i}.jpg`
    }));

    return HttpResponse.json({
      data: mockContent,
      pagination: {
        page,
        limit,
        total: 100,
        pages: 10
      }
    });
  }),

  // User API endpoints
  http.get('*/api/user/profile', () => {
    return HttpResponse.json({
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      preferences: {
        contentWarnings: true,
        autoplay: false,
        theme: 'dark'
      },
      stats: {
        totalWatched: 45,
        totalHours: 120,
        favoriteGenre: 'true-crime'
      }
    });
  }),

  http.get('*/api/user/watchlist', () => {
    return HttpResponse.json({
      data: [
        {
          id: 'watchlist-1',
          contentId: 'content-1',
          addedAt: '2023-01-01T00:00:00Z',
          priority: 'high',
          content: {
            id: 'content-1',
            title: 'Watchlist Item 1',
            type: 'series',
            thumbnailUrl: 'https://example.com/thumb1.jpg'
          }
        }
      ]
    });
  }),

  // Search API endpoints
  http.get('*/api/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    
    return HttpResponse.json({
      results: query ? [
        {
          id: 'search-1',
          title: `Search Result for: ${query}`,
          type: 'series',
          relevanceScore: 0.95
        }
      ] : [],
      suggestions: ['serial killer', 'cold case', 'murder mystery']
    });
  }),

  // Platform availability
  http.get('*/api/platforms/availability/:contentId', ({ params }) => {
    return HttpResponse.json({
      contentId: params.contentId,
      availability: [
        {
          platform: 'Netflix',
          available: true,
          url: 'https://netflix.com/watch',
          pricing: 'subscription'
        },
        {
          platform: 'Amazon Prime',
          available: true,
          url: 'https://prime-video.com/watch',
          pricing: 'rent-$3.99'
        }
      ]
    });
  }),

  // Error scenarios
  http.get('*/api/error/500', () => {
    return new HttpResponse(null, { status: 500 });
  }),

  http.get('*/api/error/401', () => {
    return new HttpResponse(null, { status: 401 });
  }),

  http.get('*/api/error/429', () => {
    return new HttpResponse(null, { status: 429 });
  })
];

export const errorHandlers = [
  http.get('*/api/*', () => {
    return new HttpResponse(null, { status: 500 });
  })
];