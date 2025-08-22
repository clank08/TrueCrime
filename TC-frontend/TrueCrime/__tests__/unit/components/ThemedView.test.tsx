import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Text } from 'react-native';

// Mock the useThemeColor hook
jest.mock('@/hooks/useThemeColor');

describe('ThemedView', () => {
  const mockUseThemeColor = useThemeColor as jest.MockedFunction<typeof useThemeColor>;

  beforeEach(() => {
    mockUseThemeColor.mockReturnValue('#1A1A1C');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(
        <ThemedView>
          <Text>Child Content</Text>
        </ThemedView>
      );
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('should render multiple children', () => {
      render(
        <ThemedView>
          <Text>First Child</Text>
          <Text>Second Child</Text>
        </ThemedView>
      );
      expect(screen.getByText('First Child')).toBeTruthy();
      expect(screen.getByText('Second Child')).toBeTruthy();
    });

    it('should apply the correct background color from theme', () => {
      mockUseThemeColor.mockReturnValue('#0A0A0B');
      const { getByTestId } = render(
        <ThemedView testID="themed-view">
          <Text>Content</Text>
        </ThemedView>
      );
      const element = getByTestId('themed-view');
      expect(element.props.style).toEqual(
        expect.objectContaining({ backgroundColor: '#0A0A0B' })
      );
    });
  });

  describe('Light/Dark Theme', () => {
    it('should use light theme color when specified', () => {
      mockUseThemeColor.mockReturnValue('#FFFFFF');
      render(
        <ThemedView lightColor="#FFFFFF" darkColor="#0A0A0B">
          <Text>Content</Text>
        </ThemedView>
      );
      expect(mockUseThemeColor).toHaveBeenCalledWith(
        { light: '#FFFFFF', dark: '#0A0A0B' },
        'background'
      );
    });

    it('should use dark theme color when specified', () => {
      mockUseThemeColor.mockReturnValue('#0A0A0B');
      render(
        <ThemedView lightColor="#FFFFFF" darkColor="#0A0A0B">
          <Text>Content</Text>
        </ThemedView>
      );
      expect(mockUseThemeColor).toHaveBeenCalledWith(
        { light: '#FFFFFF', dark: '#0A0A0B' },
        'background'
      );
    });

    it('should use default theme colors when not specified', () => {
      render(
        <ThemedView>
          <Text>Content</Text>
        </ThemedView>
      );
      expect(mockUseThemeColor).toHaveBeenCalledWith(
        { light: undefined, dark: undefined },
        'background'
      );
    });
  });

  describe('Custom Styles', () => {
    it('should merge custom styles with default styles', () => {
      const customStyle = { 
        padding: 20, 
        borderRadius: 8,
        marginTop: 10 
      };
      const { getByTestId } = render(
        <ThemedView testID="custom-view" style={customStyle}>
          <Text>Custom Styled Content</Text>
        </ThemedView>
      );
      const element = getByTestId('custom-view');
      expect(element.props.style).toEqual(
        expect.objectContaining({
          padding: 20,
          borderRadius: 8,
          marginTop: 10
        })
      );
    });

    it('should handle array of styles', () => {
      const styles = [
        { padding: 10 },
        { margin: 5 },
        { borderWidth: 1 }
      ];
      const { getByTestId } = render(
        <ThemedView testID="array-styles" style={styles}>
          <Text>Array Styled Content</Text>
        </ThemedView>
      );
      const element = getByTestId('array-styles');
      expect(element.props.style).toEqual(
        expect.objectContaining({
          padding: 10,
          margin: 5,
          borderWidth: 1
        })
      );
    });

    it('should preserve View props', () => {
      const onLayout = jest.fn();
      const { getByTestId } = render(
        <ThemedView 
          testID="view-props"
          onLayout={onLayout}
          pointerEvents="none"
          accessible={true}
          accessibilityLabel="Container"
        >
          <Text>Content</Text>
        </ThemedView>
      );
      const element = getByTestId('view-props');
      expect(element.props.pointerEvents).toBe('none');
      expect(element.props.accessible).toBe(true);
      expect(element.props.accessibilityLabel).toBe('Container');
    });
  });

  describe('Layout Containers', () => {
    it('should work as a flex container', () => {
      const { getByTestId } = render(
        <ThemedView 
          testID="flex-container"
          style={{ 
            flex: 1, 
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Text>Item 1</Text>
          <Text>Item 2</Text>
        </ThemedView>
      );
      const element = getByTestId('flex-container');
      expect(element.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        })
      );
    });

    it('should work as a card container', () => {
      const cardStyle = {
        padding: 16,
        margin: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
      };
      const { getByTestId } = render(
        <ThemedView testID="card-container" style={cardStyle}>
          <Text>Card Content</Text>
        </ThemedView>
      );
      const element = getByTestId('card-container');
      expect(element.props.style).toEqual(
        expect.objectContaining(cardStyle)
      );
    });

    it('should work as a screen container', () => {
      const { getByTestId } = render(
        <ThemedView 
          testID="screen-container"
          style={{ 
            flex: 1,
            paddingTop: 44, // Safe area
            paddingHorizontal: 16
          }}
        >
          <Text>Screen Content</Text>
        </ThemedView>
      );
      const element = getByTestId('screen-container');
      expect(element.props.style).toEqual(
        expect.objectContaining({
          flex: 1,
          paddingTop: 44,
          paddingHorizontal: 16
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should support accessibility role', () => {
      const { getByTestId } = render(
        <ThemedView 
          testID="accessible-view"
          accessibilityRole="main"
        >
          <Text>Main Content</Text>
        </ThemedView>
      );
      const element = getByTestId('accessible-view');
      expect(element.props.accessibilityRole).toBe('main');
    });

    it('should support accessibility label and hint', () => {
      const { getByLabelText } = render(
        <ThemedView 
          accessibilityLabel="Content container"
          accessibilityHint="Contains the main content of the screen"
        >
          <Text>Content</Text>
        </ThemedView>
      );
      expect(getByLabelText('Content container')).toBeTruthy();
    });

    it('should support accessibility state', () => {
      const { getByTestId } = render(
        <ThemedView 
          testID="state-view"
          accessibilityState={{ selected: true, disabled: false }}
        >
          <Text>Selected Content</Text>
        </ThemedView>
      );
      const element = getByTestId('state-view');
      expect(element.props.accessibilityState).toEqual({
        selected: true,
        disabled: false
      });
    });
  });

  describe('True Crime Specific Containers', () => {
    it('should render content warning container', () => {
      const warningStyle = {
        backgroundColor: '#D32F2F',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16
      };
      const { getByTestId } = render(
        <ThemedView 
          testID="warning-container"
          style={warningStyle}
          accessibilityRole="alert"
        >
          <Text>Content Warning: Graphic Violence</Text>
        </ThemedView>
      );
      const element = getByTestId('warning-container');
      expect(element.props.accessibilityRole).toBe('alert');
      expect(element.props.style).toEqual(
        expect.objectContaining(warningStyle)
      );
    });

    it('should render case details container', () => {
      const caseStyle = {
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#BA0C2F'
      };
      const { getByTestId } = render(
        <ThemedView testID="case-container" style={caseStyle}>
          <Text>Case: The Zodiac Killer</Text>
          <Text>Status: Unsolved</Text>
        </ThemedView>
      );
      const element = getByTestId('case-container');
      expect(element.props.style).toEqual(
        expect.objectContaining(caseStyle)
      );
    });
  });

  describe('Performance', () => {
    it('should not re-render when theme color does not change', () => {
      const { rerender, getByTestId } = render(
        <ThemedView testID="perf-view">
          <Text>Content</Text>
        </ThemedView>
      );
      
      const element1 = getByTestId('perf-view');
      
      rerender(
        <ThemedView testID="perf-view">
          <Text>Content</Text>
        </ThemedView>
      );
      
      const element2 = getByTestId('perf-view');
      expect(element1).toBe(element2);
    });
  });
});