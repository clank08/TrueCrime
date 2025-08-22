import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  Pressable,
  Linking,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useContentTracking } from '@/hooks/useContentTracking';
import type { Content, AvailabilityType } from '@/types/api';

interface ContentDetailViewProps {
  content: Content;
  isLoading?: boolean;
  onClose?: () => void;
  className?: string;
}

interface PlatformButtonProps {
  platform: {
    id: string;
    name: string;
    type: string;
    availabilityType: AvailabilityType;
    isAvailable: boolean;
    deepLinkUrl: string | null;
    price: number | null;
    currency: string | null;
  };
  onPress: () => void;
}

function PlatformButton({ platform, onPress }: PlatformButtonProps) {
  const getAvailabilityColor = (type: AvailabilityType): string => {
    switch (type) {
      case 'FREE':
        return '#4CAF50';
      case 'SUBSCRIPTION':
        return '#2196F3';
      case 'PREMIUM_SUBSCRIPTION':
        return '#9C27B0';
      case 'PURCHASE':
        return '#FF9800';
      case 'RENTAL':
        return '#FF5722';
      default:
        return '#757575';
    }
  };

  const getAvailabilityLabel = (type: AvailabilityType): string => {
    switch (type) {
      case 'FREE':
        return 'Free';
      case 'SUBSCRIPTION':
        return 'Included';
      case 'PREMIUM_SUBSCRIPTION':
        return 'Premium';
      case 'PURCHASE':
        return platform.price ? `$${platform.price}` : 'Buy';
      case 'RENTAL':
        return platform.price ? `$${platform.price}` : 'Rent';
      default:
        return 'Available';
    }
  };

  const getAvailabilityIcon = (type: AvailabilityType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'FREE':
        return 'gift';
      case 'SUBSCRIPTION':
        return 'checkmark-circle';
      case 'PREMIUM_SUBSCRIPTION':
        return 'star';
      case 'PURCHASE':
        return 'card';
      case 'RENTAL':
        return 'time';
      default:
        return 'tv';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm"
      style={{
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(139, 75, 127, 0.1)',
      }}
    >
      <View className="flex-row items-center flex-1">
        <View 
          className="w-12 h-12 rounded-xl items-center justify-center mr-4"
          style={{ 
            backgroundColor: getAvailabilityColor(platform.availabilityType),
            shadowColor: getAvailabilityColor(platform.availabilityType),
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name={getAvailabilityIcon(platform.availabilityType)} size={22} color="#FFFFFF" />
        </View>
        <View className="flex-1">
          <ThemedText className="font-bold text-base mb-1">
            {platform.name}
          </ThemedText>
          <ThemedText className="text-sm" style={{ color: getAvailabilityColor(platform.availabilityType) }}>
            {getAvailabilityLabel(platform.availabilityType)}
          </ThemedText>
        </View>
      </View>
      
      <View className="flex-row items-center">
        <View 
          className="px-3 py-1 rounded-full mr-3"
          style={{ backgroundColor: `${getAvailabilityColor(platform.availabilityType)}20` }}
        >
          <ThemedText 
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: getAvailabilityColor(platform.availabilityType) }}
          >
            {getAvailabilityLabel(platform.availabilityType)}
          </ThemedText>
        </View>
        <View 
          className="w-8 h-8 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(139, 75, 127, 0.1)' }}
        >
          <Ionicons name="chevron-forward" size={16} color="#8B4B7F" />
        </View>
      </View>
    </Pressable>
  );
}

export function ContentDetailView({
  content,
  isLoading = false,
  onClose,
  className = '',
}: ContentDetailViewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);

  // Safety check for content
  if (!content) {
    return null;
  }

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#2C2C30' }, 'card');

  // Temporarily disable useContentTracking to prevent infinite loops
  // TODO: Fix the useContentTracking hook to use stable function references
  const addToWatchlist = useCallback((id: string) => {
    console.log('Add to watchlist:', id);
    // TODO: Implement actual API call
  }, []);
  
  const removeFromWatchlist = useCallback((id: string) => {
    console.log('Remove from watchlist:', id);
    // TODO: Implement actual API call  
  }, []);
  
  const markAsWatched = useCallback((id: string) => {
    console.log('Mark as watched:', id);
    // TODO: Implement actual API call
  }, []);

  // Simple state for now - these would come from the hook normally
  const inWatchlist = false;
  const watched = false;
  const isAddingToWatchlist = false;
  const isRemovingFromWatchlist = false;
  const isUpdatingProgress = false;

  const handlePlatformPress = useCallback(async (platform: Content['platforms'][0]) => {
    if (platform.deepLinkUrl) {
      try {
        const supported = await Linking.canOpenURL(platform.deepLinkUrl);
        if (supported) {
          await Linking.openURL(platform.deepLinkUrl);
        } else {
          Alert.alert(
            'Platform Not Available',
            `Please open ${platform.name} manually to watch this content.`
          );
        }
      } catch (error) {
        console.error('Failed to open platform link:', error);
        Alert.alert(
          'Error',
          'Unable to open the platform. Please try opening the app manually.'
        );
      }
    } else {
      Alert.alert(
        'Watch on ' + platform.name,
        'This content is available on ' + platform.name + '. Please search for it in the app.'
      );
    }
  }, []);

  const handleWatchlistToggle = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inWatchlist) {
      await removeFromWatchlist(content.id);
    } else {
      await addToWatchlist(content.id);
    }
  }, [inWatchlist, removeFromWatchlist, addToWatchlist, content.id]);

  const handleMarkWatched = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markAsWatched(content.id);
  }, [markAsWatched, content.id]);

  const handleShare = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await Share.share({
        message: `Check out "${content.title}" on TrueCrime App! ${content.description ? content.description.substring(0, 200) + '...' : ''}`,
        title: content.title,
        url: `https://truecrime.app/content/${content.id}`, // Replace with actual URL
      });
    } catch (error) {
      console.error('Error sharing content:', error);
    }
  }, [content.title, content.description, content.id]);

  const formatRuntime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }, []);

  const formatDate = useCallback((date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }, []);

  const getWarningLevel = useCallback((level: string): { color: string; label: string } => {
    switch (level) {
      case 'LOW':
        return { color: '#4CAF50', label: 'Mild Content' };
      case 'MODERATE':
        return { color: '#FF9800', label: 'Some Disturbing Content' };
      case 'HIGH':
        return { color: '#F44336', label: 'Graphic Content' };
      case 'EXTREME':
        return { color: '#9C27B0', label: 'Very Disturbing Content' };
      default:
        return { color: '#757575', label: 'Content Warning' };
    }
  }, []);

  if (isLoading) {
    return (
      <ThemedView style={{ backgroundColor, flex: 1 }} className={`items-center justify-center ${className}`}>
        <LoadingSpinner size="large" />
        <ThemedText className="text-lg mt-4" style={{ color: textColor }}>
          Loading content details...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ backgroundColor, flex: 1 }} className={className}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View className="relative">
          {/* Backdrop Image */}
          {content.backdropUrl && (
            <View className="h-80 relative">
              <Image
                source={{ uri: content.backdropUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
              {/* Enhanced gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                locations={[0, 0.4, 1]}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            </View>
          )}

          {/* Close Button */}
          {onClose && (
            <Pressable
              onPress={onClose}
              className="absolute top-12 right-4 w-10 h-10 bg-black/50 rounded-full items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Content Info Overlay */}
          <View className="absolute bottom-0 left-0 right-0 p-6">
            <View className="flex-row">
              {/* Poster */}
              {content.posterUrl && (
                <View className="w-28 h-40 rounded-xl overflow-hidden mr-5 shadow-2xl">
                  <Image
                    source={{ uri: content.posterUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  {/* Subtle border on poster */}
                  <View className="absolute inset-0 rounded-xl border border-white/20" />
                </View>
              )}

              {/* Title and Metadata */}
              <View className="flex-1">
                <ThemedText className="text-3xl font-bold text-white mb-3" style={{
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 4,
                  letterSpacing: -0.5,
                }}>
                  {content.title}
                </ThemedText>
                
                <View className="flex-row items-center mb-3 flex-wrap">
                  {content.releaseDate && (
                    <View className="bg-black/50 px-2 py-1 rounded-md mr-2 mb-1">
                      <ThemedText className="text-white/90 text-sm font-semibold">
                        {new Date(content.releaseDate).getFullYear()}
                      </ThemedText>
                    </View>
                  )}
                  {content.runtime && (
                    <View className="bg-black/50 px-2 py-1 rounded-md mr-2 mb-1">
                      <ThemedText className="text-white/90 text-sm font-semibold">
                        {formatRuntime(content.runtime)}
                      </ThemedText>
                    </View>
                  )}
                  {content.userRatingAvg && (
                    <View className="bg-black/50 px-2 py-1 rounded-md mr-2 mb-1 flex-row items-center">
                      <Ionicons name="star" size={14} color="#FFD700" style={{ marginRight: 4 }} />
                      <ThemedText className="text-white/90 text-sm font-semibold">
                        {content.userRatingAvg.toFixed(1)}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View className="flex-row items-center">
                  <View className="bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1 rounded-full mr-2">
                    <ThemedText className="text-white text-xs font-bold uppercase tracking-wider">
                      {content.contentType.replace('_', ' ')}
                    </ThemedText>
                  </View>
                  {content.caseType && (
                    <View className="bg-gradient-to-r from-orange-500 to-orange-600 px-3 py-1 rounded-full">
                      <ThemedText className="text-white text-xs font-bold uppercase tracking-wider">
                        {content.caseType.replace('_', ' ')}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="p-6">
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleWatchlistToggle}
              disabled={isAddingToWatchlist || isRemovingFromWatchlist}
              className="flex-1"
              style={{
                backgroundColor: inWatchlist ? '#8B4B7F' : '#8B4B7F',
                opacity: inWatchlist ? 0.8 : 1,
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                shadowColor: '#8B4B7F',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View className="flex-row items-center justify-center">
                {isAddingToWatchlist || isRemovingFromWatchlist ? (
                  <LoadingSpinner size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons 
                      name={inWatchlist ? "checkmark" : "add"} 
                      size={20} 
                      color="#FFFFFF" 
                      style={{ marginRight: 8 }}
                    />
                    <ThemedText className="text-white font-bold text-base">
                      {inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
                    </ThemedText>
                  </>
                )}
              </View>
            </Pressable>

            {!watched && (
              <Pressable
                onPress={handleMarkWatched}
                disabled={isUpdatingProgress}
                style={{
                  backgroundColor: '#4CAF50',
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  shadowColor: '#4CAF50',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
              >
                <View className="flex-row items-center">
                  {isUpdatingProgress ? (
                    <LoadingSpinner size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <ThemedText className="text-white font-bold ml-2">
                        Watched
                      </ThemedText>
                    </>
                  )}
                </View>
              </Pressable>
            )}

            <Pressable
              onPress={handleShare}
              style={{
                backgroundColor: '#FF6B35',
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                shadowColor: '#FF6B35',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <Ionicons name="share" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Content Warnings */}
        {content.sensitivityLevel && content.sensitivityLevel !== 'LOW' && (
          <View className="px-6 mb-6">
            <View 
              className="p-5 rounded-xl"
              style={{ 
                backgroundColor: `${getWarningLevel(content.sensitivityLevel).color}15`,
                borderWidth: 2,
                borderColor: getWarningLevel(content.sensitivityLevel).color,
                shadowColor: getWarningLevel(content.sensitivityLevel).color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center mb-3">
                <View 
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: getWarningLevel(content.sensitivityLevel).color }}
                >
                  <Ionicons 
                    name="warning" 
                    size={20} 
                    color="#FFFFFF"
                  />
                </View>
                <View className="flex-1">
                  <ThemedText 
                    className="font-bold text-lg"
                    style={{ color: getWarningLevel(content.sensitivityLevel).color }}
                  >
                    Content Warning
                  </ThemedText>
                  <ThemedText 
                    className="font-semibold text-sm"
                    style={{ color: getWarningLevel(content.sensitivityLevel).color }}
                  >
                    {getWarningLevel(content.sensitivityLevel).label}
                  </ThemedText>
                </View>
              </View>
              {content.contentWarnings && content.contentWarnings.length > 0 && (
                <ThemedText className="text-sm leading-5" style={{ color: textColor }}>
                  This content contains: {content.contentWarnings.join(', ')}
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Where to Watch */}
        {content.platforms && content.platforms.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex-row items-center mb-4">
              <Ionicons name="tv" size={24} color="#8B4B7F" style={{ marginRight: 8 }} />
              <ThemedText className="text-2xl font-bold" style={{ color: textColor }}>
                Where to Watch
              </ThemedText>
            </View>
            <View className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
              {content.platforms.map((platform, index) => (
                <View key={platform.id}>
                  <PlatformButton
                    platform={platform}
                    onPress={() => handlePlatformPress(platform)}
                  />
                  {index < (content.platforms?.length || 0) - 1 && (
                    <View className="h-px bg-gray-200 dark:bg-gray-700 mx-4" />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Synopsis */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center mb-4">
            <Ionicons name="document-text" size={24} color="#8B4B7F" style={{ marginRight: 8 }} />
            <ThemedText className="text-2xl font-bold" style={{ color: textColor }}>
              Synopsis
            </ThemedText>
          </View>
          <View className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
            <ThemedText className="text-base leading-7" style={{ color: textColor }}>
              {showFullSynopsis ? (content.synopsis || content.description) : 
               (content.synopsis || content.description)?.substring(0, 250) + '...'}
            </ThemedText>
            {(content.synopsis || content.description) && (content.synopsis || content.description)?.length && (content.synopsis || content.description)!.length > 250 && (
              <Pressable onPress={() => setShowFullSynopsis(!showFullSynopsis)} className="mt-4">
                <View className="flex-row items-center">
                  <ThemedText style={{ color: '#8B4B7F', fontWeight: '600', fontSize: 16 }}>
                    {showFullSynopsis ? 'Show Less' : 'Read More'}
                  </ThemedText>
                  <Ionicons 
                    name={showFullSynopsis ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color="#8B4B7F" 
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Case Information */}
        {content.caseName && (
          <View className="px-6 mb-6">
            <View className="flex-row items-center mb-4">
              <Ionicons name="folder" size={24} color="#FF6B35" style={{ marginRight: 8 }} />
              <ThemedText className="text-2xl font-bold" style={{ color: textColor }}>
                Case Information
              </ThemedText>
            </View>
            <View className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-800 dark:to-gray-700 p-5 rounded-xl border border-orange-200 dark:border-gray-600">
              <View className="space-y-3">
                <View className="flex-row justify-between items-start">
                  <ThemedText className="font-semibold text-gray-700 dark:text-gray-300 text-base">Case Name:</ThemedText>
                  <ThemedText className="font-bold text-right flex-1 ml-4" style={{ color: '#FF6B35', fontSize: 16 }}>
                    {content.caseName}
                  </ThemedText>
                </View>
                {content.location && (
                  <View className="flex-row justify-between items-start">
                    <ThemedText className="font-semibold text-gray-700 dark:text-gray-300 text-base">Location:</ThemedText>
                    <ThemedText className="text-right flex-1 ml-4" style={{ color: textColor, fontSize: 15 }}>
                      {content.location}
                    </ThemedText>
                  </View>
                )}
                {content.timeframStart && (
                  <View className="flex-row justify-between items-start">
                    <ThemedText className="font-semibold text-gray-700 dark:text-gray-300 text-base">Timeframe:</ThemedText>
                    <ThemedText className="text-right flex-1 ml-4" style={{ color: textColor, fontSize: 15 }}>
                      {formatDate(content.timeframStart)}
                      {content.timeframEnd && ` - ${formatDate(content.timeframEnd)}`}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Cast & Crew */}
        {((content.cast && content.cast.length > 0) || (content.crew && content.crew.length > 0)) && (
          <View className="px-6 mb-6">
            <View className="flex-row items-center mb-4">
              <Ionicons name="people" size={24} color="#8B4B7F" style={{ marginRight: 8 }} />
              <ThemedText className="text-2xl font-bold" style={{ color: textColor }}>
                Cast & Crew
              </ThemedText>
            </View>
            
            <View className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
              {content.crew && content.crew.length > 0 && (
                <View className="mb-6">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="camera" size={18} color="#FF6B35" style={{ marginRight: 6 }} />
                    <ThemedText className="font-bold text-lg" style={{ color: textColor }}>
                      Crew
                    </ThemedText>
                  </View>
                  {content.crew.slice(0, 6).map((person, index) => (
                    <View key={person.id}>
                      <View className="flex-row justify-between items-center py-3">
                        <View className="flex-1">
                          <ThemedText className="font-semibold text-base" style={{ color: textColor }}>
                            {person.name}
                          </ThemedText>
                          <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                            {person.job} • {person.department}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#8A8A94" />
                      </View>
                      {index < Math.min(content.crew?.length || 0, 6) - 1 && (
                        <View className="h-px bg-gray-200 dark:bg-gray-700" />
                      )}
                    </View>
                  ))}
                  {content.crew && content.crew.length > 6 && (
                    <ThemedText className="text-center text-sm text-gray-500 mt-2">
                      +{content.crew.length - 6} more crew members
                    </ThemedText>
                  )}
                </View>
              )}

              {content.cast && content.cast.length > 0 && (
                <View>
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="person" size={18} color="#8B4B7F" style={{ marginRight: 6 }} />
                    <ThemedText className="font-bold text-lg" style={{ color: textColor }}>
                      Cast
                    </ThemedText>
                  </View>
                  {content.cast.slice(0, 6).map((person, index) => (
                    <View key={person.id}>
                      <View className="flex-row justify-between items-center py-3">
                        <View className="flex-1">
                          <ThemedText className="font-semibold text-base" style={{ color: textColor }}>
                            {person.name}
                          </ThemedText>
                          <ThemedText className="text-sm text-gray-600 dark:text-gray-400">
                            {person.role || 'Actor'}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#8A8A94" />
                      </View>
                      {index < Math.min(content.cast?.length || 0, 6) - 1 && (
                        <View className="h-px bg-gray-200 dark:bg-gray-700" />
                      )}
                    </View>
                  ))}
                  {content.cast && content.cast.length > 6 && (
                    <ThemedText className="text-center text-sm text-gray-500 mt-2">
                      +{content.cast.length - 6} more cast members
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer spacing */}
        <View className="h-12" />
      </ScrollView>
    </ThemedView>
  );
}