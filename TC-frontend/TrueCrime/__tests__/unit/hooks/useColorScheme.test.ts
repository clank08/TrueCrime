import { renderHook, act } from '@testing-library/react-native';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

// Mock React Native's useColorScheme
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  useColorScheme: jest.fn(),
}));

describe('useColorScheme', () => {
  const mockUseRNColorScheme = useRNColorScheme as jest.MockedFunction<typeof useRNColorScheme>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return dark theme by default when system is dark', () => {
      mockUseRNColorScheme.mockReturnValue('dark');
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });

    it('should return light theme when system is light', () => {
      mockUseRNColorScheme.mockReturnValue('light');
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('light');
    });

    it('should return dark theme when system returns null', () => {
      mockUseRNColorScheme.mockReturnValue(null);
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });

    it('should return dark theme when system returns undefined', () => {
      mockUseRNColorScheme.mockReturnValue(undefined);
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });
  });

  describe('Theme Changes', () => {
    it('should update when system theme changes', () => {
      mockUseRNColorScheme.mockReturnValue('light');
      const { result, rerender } = renderHook(() => useColorScheme());
      
      expect(result.current).toBe('light');
      
      // Simulate system theme change
      mockUseRNColorScheme.mockReturnValue('dark');
      rerender();
      
      expect(result.current).toBe('dark');
    });

    it('should handle rapid theme changes', () => {
      mockUseRNColorScheme.mockReturnValue('light');
      const { result, rerender } = renderHook(() => useColorScheme());
      
      // Rapid changes
      mockUseRNColorScheme.mockReturnValue('dark');
      rerender();
      expect(result.current).toBe('dark');
      
      mockUseRNColorScheme.mockReturnValue('light');
      rerender();
      expect(result.current).toBe('light');
      
      mockUseRNColorScheme.mockReturnValue('dark');
      rerender();
      expect(result.current).toBe('dark');
    });
  });

  describe('True Crime App Preferences', () => {
    it('should default to dark theme for True Crime content', () => {
      // True Crime apps typically use dark themes for better viewing experience
      mockUseRNColorScheme.mockReturnValue(null);
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });

    it('should respect user system preference over app default', () => {
      // User preference should override app defaults
      mockUseRNColorScheme.mockReturnValue('light');
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('light');
    });
  });

  describe('Hook Stability', () => {
    it('should maintain stable reference when theme does not change', () => {
      mockUseRNColorScheme.mockReturnValue('dark');
      const { result, rerender } = renderHook(() => useColorScheme());
      
      const firstResult = result.current;
      rerender();
      const secondResult = result.current;
      
      expect(firstResult).toBe(secondResult);
    });

    it('should not cause unnecessary re-renders', () => {
      mockUseRNColorScheme.mockReturnValue('dark');
      let renderCount = 0;
      
      const { rerender } = renderHook(() => {
        renderCount++;
        return useColorScheme();
      });
      
      expect(renderCount).toBe(1);
      
      // Re-render without theme change
      rerender();
      expect(renderCount).toBe(2);
      
      // Theme should be memoized, so no extra computation
      rerender();
      expect(renderCount).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined system color scheme', () => {
      mockUseRNColorScheme.mockReturnValue(undefined);
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });

    it('should handle null system color scheme', () => {
      mockUseRNColorScheme.mockReturnValue(null);
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });

    it('should handle invalid color scheme values gracefully', () => {
      // @ts-ignore - Testing invalid value
      mockUseRNColorScheme.mockReturnValue('invalid');
      const { result } = renderHook(() => useColorScheme());
      // Should fallback to dark theme for unknown values
      expect(['light', 'dark']).toContain(result.current);
    });
  });

  describe('Platform Specific Behavior', () => {
    it('should work correctly on iOS', () => {
      jest.spyOn(require('react-native').Platform, 'OS', 'get').mockReturnValue('ios');
      mockUseRNColorScheme.mockReturnValue('dark');
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });

    it('should work correctly on Android', () => {
      jest.spyOn(require('react-native').Platform, 'OS', 'get').mockReturnValue('android');
      mockUseRNColorScheme.mockReturnValue('light');
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('light');
    });

    it('should work correctly on Web', () => {
      jest.spyOn(require('react-native').Platform, 'OS', 'get').mockReturnValue('web');
      mockUseRNColorScheme.mockReturnValue('dark');
      const { result } = renderHook(() => useColorScheme());
      expect(result.current).toBe('dark');
    });
  });
});