import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

// Fixed NativeWind styled component issues

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = 'large',
  color = '#8B4B7F',
  message,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const containerClasses = fullScreen
    ? 'flex-1 bg-dark-50 items-center justify-center'
    : 'items-center justify-center p-4';

  return (
    <View className={`${containerClasses} ${className}`}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text className="font-body text-dark-500 text-center mt-3">
          {message}
        </Text>
      )}
    </View>
  );
}

interface FullScreenLoadingProps {
  message?: string;
  showLogo?: boolean;
}

export function FullScreenLoading({
  message = 'Loading...',
  showLogo = true,
}: FullScreenLoadingProps) {
  return (
    <View className="flex-1 bg-dark-50 items-center justify-center px-6">
      {showLogo && (
        <View className="w-20 h-20 bg-primary rounded-2xl items-center justify-center mb-8">
          <Text className="text-3xl">🔍</Text>
        </View>
      )}
      
      <ActivityIndicator size="large" color="#8B4B7F" />
      
      <Text className="font-body text-dark-500 text-center mt-4">
        {message}
      </Text>
    </View>
  );
}

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoading({
  loading,
  children,
  loadingText,
}: ButtonLoadingProps) {
  if (loading) {
    return (
      <View className="flex-row items-center">
        <ActivityIndicator size="small" color="currentColor" />
        {loadingText && (
          <Text className="ml-2">
            {loadingText}
          </Text>
        )}
      </View>
    );
  }

  return <>{children}</>;
}