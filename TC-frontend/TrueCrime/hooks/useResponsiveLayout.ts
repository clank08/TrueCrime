import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

interface ResponsiveLayout {
  numColumns: number;
  cardSpacing: number;
  horizontalPadding: number;
  screenSize: 'small' | 'medium' | 'large' | 'xl';
}

export function useResponsiveLayout(): ResponsiveLayout {
  const [layout, setLayout] = useState<ResponsiveLayout>(() => {
    const { width } = Dimensions.get('window');
    return getLayoutForWidth(width);
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setLayout(getLayoutForWidth(window.width));
    });

    return () => subscription?.remove();
  }, []);

  return layout;
}

function getLayoutForWidth(width: number): ResponsiveLayout {
  if (width >= 1200) {
    // Desktop large
    return {
      numColumns: 4,
      cardSpacing: 12,
      horizontalPadding: 24,
      screenSize: 'xl',
    };
  } else if (width >= 768) {
    // Tablet/Desktop
    return {
      numColumns: 3,
      cardSpacing: 10,
      horizontalPadding: 20,
      screenSize: 'large',
    };
  } else if (width >= 480) {
    // Large mobile
    return {
      numColumns: 2,
      cardSpacing: 8,
      horizontalPadding: 16,
      screenSize: 'medium',
    };
  } else {
    // Small mobile
    return {
      numColumns: 2,
      cardSpacing: 6,
      horizontalPadding: 12,
      screenSize: 'small',
    };
  }
}

// Utility function for calculating card width with edge safety
export function calculateCardWidth(
  screenWidth: number,
  numColumns: number,
  cardSpacing: number,
  horizontalPadding: number
): number {
  const totalPadding = horizontalPadding * 2;
  const totalSpacing = (numColumns - 1) * cardSpacing;
  // Use Math.floor to prevent floating point precision issues that could cause overflow
  return Math.floor((screenWidth - totalPadding - totalSpacing) / numColumns);
}