import { View } from 'react-native';
import { Platform } from 'react-native';

// Provide a consistent tab bar background for all platforms
export default function TabBarBackground() {
  return (
    <View
      style={{
        ...Platform.select({
          ios: {
            backgroundColor: 'rgba(26, 26, 28, 0.8)',
            backdropFilter: 'blur(20px)',
          },
          web: {
            backgroundColor: '#2C2C30',
            borderTopColor: '#4A4A52',
            borderTopWidth: 1,
          },
          default: {
            backgroundColor: '#2C2C30',
            borderTopColor: '#4A4A52',
            borderTopWidth: 1,
          },
        }),
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      }}
    />
  );
}

export function useBottomTabOverflow() {
  return Platform.OS === 'ios' ? 20 : 0;
}
