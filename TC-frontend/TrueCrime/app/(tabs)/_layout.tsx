import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#8B4B7F', // True Crime primary color
          tabBarInactiveTintColor: '#8A8A94', // Dark theme secondary
          headerShown: false,
          tabBarButton: HapticTab, // Re-enable for proper interaction
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
              backgroundColor: 'rgba(26, 26, 28, 0.8)', // Dark theme with transparency
            },
            web: {
              backgroundColor: '#2C2C30', // Dark theme card color
              borderTopColor: '#4A4A52', // Dark theme border
              borderTopWidth: 1,
              height: 60, // Ensure proper height for web
              paddingBottom: 8,
              paddingTop: 8,
            },
            default: {
              backgroundColor: '#2C2C30', // Dark theme card color
              borderTopColor: '#4A4A52', // Dark theme border
              borderTopWidth: 1,
            },
          }),
          tabBarLabelStyle: Platform.select({
            web: {
              fontSize: 12,
              fontWeight: '500',
            },
            default: {},
          }),
          tabBarIconStyle: Platform.select({
            web: {
              marginBottom: 0,
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="discover"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="magnifyingglass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
      </Tabs>
  );
}
