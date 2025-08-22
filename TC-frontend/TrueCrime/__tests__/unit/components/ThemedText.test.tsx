import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

// Mock the useThemeColor hook
jest.mock('@/hooks/useThemeColor');

describe('ThemedText', () => {
  const mockUseThemeColor = useThemeColor as jest.MockedFunction<typeof useThemeColor>;

  beforeEach(() => {
    mockUseThemeColor.mockReturnValue('#FFFFFF');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render text content correctly', () => {
      render(<ThemedText>Test Content</ThemedText>);
      expect(screen.getByText('Test Content')).toBeTruthy();
    });

    it('should render children when passed', () => {
      render(
        <ThemedText>
          <ThemedText>Nested Text</ThemedText>
        </ThemedText>
      );
      expect(screen.getByText('Nested Text')).toBeTruthy();
    });

    it('should apply the correct color from theme', () => {
      mockUseThemeColor.mockReturnValue('#BA0C2F');
      const { getByText } = render(<ThemedText>Themed Text</ThemedText>);
      const element = getByText('Themed Text');
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#BA0C2F' })
        ])
      );
    });
  });

  describe('Typography Types', () => {
    it('should apply default title style', () => {
      const { getByText } = render(<ThemedText type="title">Title Text</ThemedText>);
      const element = getByText('Title Text');
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            fontSize: 32,
            fontWeight: 'bold',
            lineHeight: 32 
          })
        ])
      );
    });

    it('should apply defaultSemiBold style', () => {
      const { getByText } = render(<ThemedText type="defaultSemiBold">Semibold Text</ThemedText>);
      const element = getByText('Semibold Text');
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            fontSize: 16,
            fontWeight: '600',
            lineHeight: 24 
          })
        ])
      );
    });

    it('should apply subtitle style', () => {
      const { getByText } = render(<ThemedText type="subtitle">Subtitle Text</ThemedText>);
      const element = getByText('Subtitle Text');
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            fontSize: 20,
            fontWeight: 'bold' 
          })
        ])
      );
    });

    it('should apply link style', () => {
      const { getByText } = render(<ThemedText type="link">Link Text</ThemedText>);
      const element = getByText('Link Text');
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            fontSize: 16,
            textDecorationLine: 'underline' 
          })
        ])
      );
    });

    it('should apply default style when no type specified', () => {
      const { getByText } = render(<ThemedText>Default Text</ThemedText>);
      const element = getByText('Default Text');
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            fontSize: 16,
            lineHeight: 24 
          })
        ])
      );
    });
  });

  describe('Light/Dark Theme', () => {
    it('should use light theme color when specified', () => {
      mockUseThemeColor.mockReturnValue('#111827');
      render(<ThemedText lightColor="#111827" darkColor="#FFFFFF">Text</ThemedText>);
      expect(mockUseThemeColor).toHaveBeenCalledWith(
        { light: '#111827', dark: '#FFFFFF' },
        'text'
      );
    });

    it('should use dark theme color when specified', () => {
      mockUseThemeColor.mockReturnValue('#FFFFFF');
      render(<ThemedText lightColor="#111827" darkColor="#FFFFFF">Text</ThemedText>);
      expect(mockUseThemeColor).toHaveBeenCalledWith(
        { light: '#111827', dark: '#FFFFFF' },
        'text'
      );
    });
  });

  describe('Custom Styles', () => {
    it('should merge custom styles with default styles', () => {
      const customStyle = { marginTop: 10, fontSize: 20 };
      const { getByText } = render(
        <ThemedText style={customStyle}>Custom Styled Text</ThemedText>
      );
      const element = getByText('Custom Styled Text');
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ marginTop: 10 })
        ])
      );
    });

    it('should preserve other Text props', () => {
      const { getByTestId } = render(
        <ThemedText 
          testID="test-text" 
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          Text with props
        </ThemedText>
      );
      const element = getByTestId('test-text');
      expect(element.props.numberOfLines).toBe(1);
      expect(element.props.ellipsizeMode).toBe('tail');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible role', () => {
      const { getByText } = render(
        <ThemedText accessibilityRole="header">Header Text</ThemedText>
      );
      const element = getByText('Header Text');
      expect(element.props.accessibilityRole).toBe('header');
    });

    it('should support accessibility label', () => {
      const { getByLabelText } = render(
        <ThemedText accessibilityLabel="Important text">Content</ThemedText>
      );
      expect(getByLabelText('Important text')).toBeTruthy();
    });

    it('should support accessibility hint', () => {
      const { getByText } = render(
        <ThemedText accessibilityHint="This is additional help text">Content</ThemedText>
      );
      const element = getByText('Content');
      expect(element.props.accessibilityHint).toBe('This is additional help text');
    });
  });

  describe('Content Warnings', () => {
    it('should handle content warning text appropriately', () => {
      const { getByText } = render(
        <ThemedText type="subtitle" style={{ color: '#D32F2F' }}>
          Content Warning: Graphic Violence
        </ThemedText>
      );
      const element = getByText('Content Warning: Graphic Violence');
      expect(element).toBeTruthy();
      expect(element.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ color: '#D32F2F' })
        ])
      );
    });
  });
});