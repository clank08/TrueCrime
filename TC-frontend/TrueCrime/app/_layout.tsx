import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { TRPCProvider } from '@/components/providers/TRPCProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Create a custom dark theme for True Crime app
  const TrueCrimeDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#8B4B7F',
      background: '#1A1A1C',
      card: '#2C2C30',
      text: '#EAEAF4',
      border: '#4A4A52',
      notification: '#D32F2F',
    },
  };

  return (
    <TRPCProvider>
      <ThemeProvider value={colorScheme === 'dark' ? TrueCrimeDarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="simple-test" options={{ headerShown: false }} />
          <Stack.Screen name="test-api" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </TRPCProvider>
  );
}