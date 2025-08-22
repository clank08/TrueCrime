import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Button } from './Button';
import { Card } from './Card';

// Fixed NativeWind styled component issues

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // In production, you would send this to your error reporting service
    // reportError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: undefined });
    router.replace('/(tabs)');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 bg-dark-50 items-center justify-center px-6">
          <Card className="w-full max-w-sm p-6">
            <View className="items-center mb-6">
              <View className="w-16 h-16 bg-error/20 rounded-2xl items-center justify-center mb-4">
                <Text className="text-3xl">⚠️</Text>
              </View>
              
              <Text className="font-h3 text-dark-800 text-center mb-2">
                Something went wrong
              </Text>
              
              <Text className="font-body text-dark-500 text-center">
                We've encountered an unexpected error. Don't worry, your data is safe.
              </Text>
            </View>

            {__DEV__ && this.state.error && (
              <Card variant="outlined" className="mb-4 border-error/30 bg-error/5">
                <Text className="font-body-small text-error font-medium mb-2">
                  Debug Information:
                </Text>
                <Text className="font-caption text-error">
                  {this.state.error.message}
                </Text>
              </Card>
            )}

            <View className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={this.handleReset}
              >
                Try Again
              </Button>
              
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onPress={this.handleGoHome}
              >
                Go to Home
              </Button>
            </View>
          </Card>
        </View>
      );
    }

    return this.props.children;
  }
}

// Functional component version for specific error states
interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showDebug?: boolean;
  debugInfo?: string;
}

export function ErrorDisplay({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again.',
  onRetry,
  onGoBack,
  showDebug = false,
  debugInfo,
}: ErrorDisplayProps) {
  return (
    <View className="flex-1 bg-dark-50 items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <View className="items-center mb-6">
          <View className="w-16 h-16 bg-error/20 rounded-2xl items-center justify-center mb-4">
            <Text className="text-3xl">⚠️</Text>
          </View>
          
          <Text className="font-h3 text-dark-800 text-center mb-2">
            {title}
          </Text>
          
          <Text className="font-body text-dark-500 text-center">
            {message}
          </Text>
        </View>

        {showDebug && debugInfo && (
          <Card variant="outlined" className="mb-4 border-error/30 bg-error/5">
            <Text className="font-body-small text-error font-medium mb-2">
              Debug Information:
            </Text>
            <Text className="font-caption text-error">
              {debugInfo}
            </Text>
          </Card>
        )}

        <View className="space-y-3">
          {onRetry && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onPress={onRetry}
            >
              Try Again
            </Button>
          )}
          
          {onGoBack && (
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onPress={onGoBack}
            >
              Go Back
            </Button>
          )}
        </View>
      </Card>
    </View>
  );
}

// Network error specific component
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Connection Problem"
      message="Please check your internet connection and try again."
      onRetry={onRetry}
    />
  );
}

// Authentication error component
export function AuthError({ onRetry }: { onRetry?: () => void }) {
  const handleGoToLogin = () => {
    router.replace('/auth/login');
  };

  return (
    <ErrorDisplay
      title="Authentication Required"
      message="Your session has expired. Please sign in again."
      onRetry={handleGoToLogin}
    />
  );
}