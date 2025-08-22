import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        // Only provide haptic feedback on iOS devices, not web
        if (Platform.OS === 'ios' && Platform.OS !== 'web') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (error) {
            // Silently fail if haptics not available
            console.warn('Haptics not available:', error);
          }
        }
        props.onPressIn?.(ev);
      }}
      // Ensure proper accessibility and interaction for web
      accessibilityRole="button"
      style={[
        props.style,
        // Web-specific cursor styling
        Platform.OS === 'web' && { cursor: 'pointer' }
      ]}
    />
  );
}
