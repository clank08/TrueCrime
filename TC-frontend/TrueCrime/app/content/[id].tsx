import React, { useMemo } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ContentDetailView } from '@/components/discovery/ContentDetailView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useThemeColor } from '@/hooks/useThemeColor';
import { trpc } from '@/lib/trpc';

export default function ContentDetailScreen() {
  const params = useLocalSearchParams();
  const contentId = typeof params.id === 'string' ? params.id : '';

  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#0A0A0B' }, 'background');
  const textColor = useThemeColor({ light: '#111827', dark: '#FFFFFF' }, 'text');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#3A3A3F' }, 'border');

  // Use the proper getExternalContent endpoint for external content
  const contentQuery = trpc.content.getExternalContent.useQuery(
    { externalId: contentId },
    { 
      enabled: !!contentId,
      retry: 2,
    }
  );

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/discover');
    }
  };

  // Loading state
  if (contentQuery.isLoading) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {/* Header with back button */}
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
          style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}
        >
          <Pressable
            onPress={handleGoBack}
            style={{
              marginRight: 12,
              padding: 8,
              borderRadius: 8,
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          <ThemedText style={{
            fontSize: 18,
            fontWeight: '600',
            color: textColor,
            letterSpacing: -0.02,
          }}>
            Content Details
          </ThemedText>
        </View>

        {/* Loading content */}
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <ThemedText className="text-lg mt-4" style={{ color: textColor }}>
            Loading content details...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Error state
  if (contentQuery.error) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {/* Header with back button */}
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
          style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}
        >
          <Pressable
            onPress={handleGoBack}
            style={{
              marginRight: 12,
              padding: 8,
              borderRadius: 8,
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          <ThemedText style={{
            fontSize: 18,
            fontWeight: '600',
            color: textColor,
            letterSpacing: -0.02,
          }}>
            Content Details
          </ThemedText>
        </View>

        {/* Error content */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="alert-circle" size={32} color="#F44336" />
          </View>
          <ThemedText className="text-xl font-bold mb-2" style={{ color: textColor }}>
            Content Not Found
          </ThemedText>
          <ThemedText className="text-center text-gray-500 mb-6">
            {contentQuery.error.message || 'The content you are looking for could not be found.'}
          </ThemedText>
          <Pressable
            onPress={() => contentQuery.refetch()}
            style={{
              backgroundColor: '#BA0C2F',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            accessibilityRole="button"
            accessibilityLabel="Try again to load content"
          >
            <ThemedText style={{
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: 16,
            }}>
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Content not found
  if (!contentQuery.data) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {/* Header with back button */}
        <View 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
          }}
          style={{ paddingTop: Platform.OS === 'ios' ? 56 : 16 }}
        >
          <Pressable
            onPress={handleGoBack}
            style={{
              marginRight: 12,
              padding: 8,
              borderRadius: 8,
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </Pressable>
          <ThemedText style={{
            fontSize: 18,
            fontWeight: '600',
            color: textColor,
            letterSpacing: -0.02,
          }}>
            Content Details
          </ThemedText>
        </View>

        {/* Not found content */}
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="film-outline" size={32} color="#8A8A94" />
          </View>
          <ThemedText className="text-xl font-bold mb-2" style={{ color: textColor }}>
            Content Not Available
          </ThemedText>
          <ThemedText className="text-center text-gray-500 mb-6">
            This content is not currently available or may have been removed.
          </ThemedText>
          <Pressable
            onPress={handleGoBack}
            style={{
              backgroundColor: '#BA0C2F',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            accessibilityRole="button"
            accessibilityLabel="Try again to load content"
          >
            <ThemedText style={{
              color: '#FFFFFF',
              fontWeight: '600',
              fontSize: 16,
            }}>
              Go Back
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Success state - show content details
  return (
    <ThemedView style={{ backgroundColor, flex: 1 }}>
      {/* Header with back button */}
      <View 
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          paddingTop: Platform.OS === 'ios' ? 56 : 16,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: backgroundColor + 'F0', // Semi-transparent background
        }}
      >
        <Pressable
          onPress={handleGoBack}
          className="mr-3 p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={textColor} />
        </Pressable>
        <ThemedText 
          style={{
            fontSize: 18,
            fontWeight: '600',
            color: textColor,
            flex: 1,
            letterSpacing: -0.02,
          }}
          numberOfLines={1}
        >
          {contentQuery.data.title}
        </ThemedText>
      </View>

      {/* Content Detail View */}
      <ContentDetailView
        content={contentQuery.data}
        isLoading={false}
        className="pt-20" // Add padding to account for fixed header
      />
    </ThemedView>
  );
}