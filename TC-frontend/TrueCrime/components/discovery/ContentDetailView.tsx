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
  Dimensions,
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

const { width: screenWidth } = Dimensions.get('window');

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
        return '#10B981'; // Success green from design system
      case 'SUBSCRIPTION':
        return '#00338D'; // Evidence blue from design system
      case 'PREMIUM_SUBSCRIPTION':
        return '#4A1850'; // Midnight purple from design system
      case 'PURCHASE':
        return '#F59E0B'; // Warning amber from design system
      case 'RENTAL':
        return '#BA0C2F'; // Crime red from design system
      default:
        return '#71797E'; // Steel gray from design system
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
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          backgroundColor: cardBg,
          borderRadius: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: borderColor,
          shadowColor: getAvailabilityColor(platform.availabilityType),
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
        }
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Watch on ${platform.name}, ${getAvailabilityLabel(platform.availabilityType)}`}
      accessibilityHint="Double tap to open streaming platform"
    >
      <View className="flex-row items-center flex-1">
        <View 
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
            backgroundColor: getAvailabilityColor(platform.availabilityType),
            shadowColor: getAvailabilityColor(platform.availabilityType),
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name={getAvailabilityIcon(platform.availabilityType)} size={24} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: textColor,
            marginBottom: 4,
            letterSpacing: -0.02,
          }}>
            {platform.name}
          </ThemedText>
          <ThemedText style={{ 
            fontSize: 14, 
            fontWeight: '500',
            color: getAvailabilityColor(platform.availabilityType) 
          }}>
            {getAvailabilityLabel(platform.availabilityType)}
          </ThemedText>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View 
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            marginRight: 12,
            backgroundColor: `${getAvailabilityColor(platform.availabilityType)}20`,
          }}
        >
          <ThemedText 
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: getAvailabilityColor(platform.availabilityType),
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {getAvailabilityLabel(platform.availabilityType)}
          </ThemedText>
        </View>
        <View 
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(139, 75, 127, 0.1)',
          }}
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

  const backgroundColor = useThemeColor({ light: '#FFFFFF', dark: '#0A0A0B' }, 'background');
  const textColor = useThemeColor({ light: '#111827', dark: '#FFFFFF' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#6B7280', dark: '#B8B8BD' }, 'text');
  const cardBg = useThemeColor({ light: '#F9FAFB', dark: '#1A1A1C' }, 'card');
  const borderColor = useThemeColor({ light: '#E5E7EB', dark: '#3A3A3F' }, 'border');

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
        <View style={{ position: 'relative' }}>
          {/* Backdrop Image */}
          {content.backdropUrl && (
            <View style={{ height: 320, position: 'relative' }}>
              <Image
                source={{ uri: content.backdropUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
                onLoad={() => setImageLoaded(true)}
              />
              {/* Enhanced gradient overlay */}
              <LinearGradient
                colors={['transparent', 'rgba(10,10,11,0.4)', 'rgba(10,10,11,0.9)']}
                locations={[0, 0.5, 1]}
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
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 24,
          }}>
            <View style={{ flexDirection: 'row' }}>
              {/* Poster */}
              {content.posterUrl && (
                <View style={{
                  width: 112,
                  height: 160,
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginRight: 20,
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 8,
                }}>
                  <Image
                    source={{ uri: content.posterUrl }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  {/* Subtle border on poster */}
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }} />
                </View>
              )}

              {/* Title and Metadata */}
              <View style={{ flex: 1 }}>
                <ThemedText style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  marginBottom: 12,
                  textShadowColor: 'rgba(0, 0, 0, 0.8)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 6,
                  letterSpacing: -0.02,
                  lineHeight: 32,
                }}>
                  {content.title}
                </ThemedText>
                
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginBottom: 12,
                  flexWrap: 'wrap',
                }}>
                  {content.releaseDate && (
                    <View style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      marginRight: 8,
                      marginBottom: 4,
                    }}>
                      <ThemedText style={{
                        color: 'rgba(255, 255, 255, 0.95)',
                        fontSize: 14,
                        fontWeight: '600',
                      }}>
                        {new Date(content.releaseDate).getFullYear()}
                      </ThemedText>
                    </View>
                  )}
                  {content.runtime && (
                    <View style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      marginRight: 8,
                      marginBottom: 4,
                    }}>
                      <ThemedText style={{
                        color: 'rgba(255, 255, 255, 0.95)',
                        fontSize: 14,
                        fontWeight: '600',
                      }}>
                        {formatRuntime(content.runtime)}
                      </ThemedText>
                    </View>
                  )}
                  {content.userRatingAvg && (
                    <View style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      marginRight: 8,
                      marginBottom: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <Ionicons name="star" size={14} color="#FFD700" style={{ marginRight: 4 }} />
                      <ThemedText style={{
                        color: 'rgba(255, 255, 255, 0.95)',
                        fontSize: 14,
                        fontWeight: '600',
                      }}>
                        {content.userRatingAvg.toFixed(1)}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    backgroundColor: '#8B4B7F',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginRight: 8,
                    shadowColor: '#8B4B7F',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }}>
                    <ThemedText style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      {content.contentType.replace('_', ' ')}
                    </ThemedText>
                  </View>
                  {content.caseType && (
                    <View style={{
                      backgroundColor: '#FF6B35',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      shadowColor: '#FF6B35',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.3,
                      shadowRadius: 4,
                      elevation: 3,
                    }}>
                      <ThemedText style={{
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
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
        <View style={{ padding: 24 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={handleWatchlistToggle}
              disabled={isAddingToWatchlist || isRemovingFromWatchlist}
              style={[
                {
                  flex: 1,
                  backgroundColor: '#BA0C2F', // Crime red from design system
                  paddingVertical: 16,
                  paddingHorizontal: 24,
                  borderRadius: 12,
                  shadowColor: '#BA0C2F',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                },
                inWatchlist && { backgroundColor: '#388E3C' } // Success green when added
              ]}
              accessibilityRole="button"
              accessibilityLabel={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isAddingToWatchlist || isRemovingFromWatchlist ? (
                  <LoadingSpinner size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons 
                      name={inWatchlist ? "checkmark-circle" : "add-circle"} 
                      size={20} 
                      color="#FFFFFF" 
                      style={{ marginRight: 8 }}
                    />
                    <ThemedText style={{
                      color: '#FFFFFF',
                      fontWeight: '700',
                      fontSize: 16,
                      letterSpacing: -0.02,
                    }}>
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
                  backgroundColor: '#10B981', // Success green from design system
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                accessibilityRole="button"
                accessibilityLabel="Mark as watched"
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isUpdatingProgress ? (
                    <LoadingSpinner size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                      <ThemedText style={{
                        color: '#FFFFFF',
                        fontWeight: '700',
                        fontSize: 16,
                        marginLeft: 8,
                        letterSpacing: -0.02,
                      }}>
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
                backgroundColor: cardBg,
                borderWidth: 2,
                borderColor: '#8B4B7F',
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                shadowColor: '#8B4B7F',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 2,
              }}
              accessibilityRole="button"
              accessibilityLabel="Share content"
            >
              <Ionicons name="share" size={20} color="#8B4B7F" />
            </Pressable>
          </View>
        </View>

        {/* Content Warnings */}
        {content.sensitivityLevel && content.sensitivityLevel !== 'LOW' && (
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View 
              style={{
                padding: 20,
                borderRadius: 12,
                backgroundColor: `${getWarningLevel(content.sensitivityLevel).color}15`,
                borderWidth: 2,
                borderColor: getWarningLevel(content.sensitivityLevel).color,
                shadowColor: getWarningLevel(content.sensitivityLevel).color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  backgroundColor: getWarningLevel(content.sensitivityLevel).color,
                }}>
                  <Ionicons 
                    name="warning" 
                    size={20} 
                    color="#FFFFFF"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{
                    fontWeight: '700',
                    fontSize: 18,
                    color: getWarningLevel(content.sensitivityLevel).color,
                    marginBottom: 2,
                  }}>
                    Content Warning
                  </ThemedText>
                  <ThemedText style={{
                    fontWeight: '600',
                    fontSize: 14,
                    color: getWarningLevel(content.sensitivityLevel).color,
                  }}>
                    {getWarningLevel(content.sensitivityLevel).label}
                  </ThemedText>
                </View>
              </View>
              {content.contentWarnings && content.contentWarnings.length > 0 && (
                <ThemedText style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: textColor,
                }}>
                  This content contains: {content.contentWarnings.join(', ')}
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Where to Watch */}
        {content.platforms && content.platforms.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="tv" size={24} color="#BA0C2F" style={{ marginRight: 12 }} />
              <ThemedText style={{
                fontSize: 24,
                fontWeight: '700',
                color: textColor,
                letterSpacing: -0.02,
              }}>
                Where to Watch
              </ThemedText>
            </View>
            <View style={{
              backgroundColor: cardBg,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: borderColor,
            }}>
              {content.platforms.map((platform, index) => (
                <View key={platform.id}>
                  <PlatformButton
                    platform={platform}
                    onPress={() => handlePlatformPress(platform)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Synopsis */}
        <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 16,
          }}>
            <Ionicons name="document-text" size={24} color="#00338D" style={{ marginRight: 12 }} />
            <ThemedText style={{
              fontSize: 24,
              fontWeight: '700',
              color: textColor,
              letterSpacing: -0.02,
            }}>
              Synopsis
            </ThemedText>
          </View>
          <View style={{
            backgroundColor: cardBg,
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: borderColor,
          }}>
            <ThemedText style={{
              fontSize: 16,
              lineHeight: 24,
              color: textColor,
            }}>
              {showFullSynopsis ? (content.synopsis || content.description) : 
               (content.synopsis || content.description)?.substring(0, 250) + '...'}
            </ThemedText>
            {(content.synopsis || content.description) && (content.synopsis || content.description)?.length && (content.synopsis || content.description)!.length > 250 && (
              <Pressable 
                onPress={() => setShowFullSynopsis(!showFullSynopsis)} 
                style={{ marginTop: 16 }}
                accessibilityRole="button"
                accessibilityLabel={showFullSynopsis ? 'Show less synopsis' : 'Show more synopsis'}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ThemedText style={{
                    color: '#BA0C2F',
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
                    {showFullSynopsis ? 'Show Less' : 'Read More'}
                  </ThemedText>
                  <Ionicons 
                    name={showFullSynopsis ? 'chevron-up' : 'chevron-down'} 
                    size={16} 
                    color="#BA0C2F" 
                    style={{ marginLeft: 4 }}
                  />
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {/* Case Information */}
        {content.caseName && (
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="folder" size={24} color="#FF6B35" style={{ marginRight: 12 }} />
              <ThemedText style={{
                fontSize: 24,
                fontWeight: '700',
                color: textColor,
                letterSpacing: -0.02,
              }}>
                Case Information
              </ThemedText>
            </View>
            <View style={{
              backgroundColor: cardBg,
              padding: 20,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#FF6B35',
              shadowColor: '#FF6B35',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}>
              <View>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12,
                }}>
                  <ThemedText style={{
                    fontWeight: '600',
                    color: secondaryTextColor,
                    fontSize: 16,
                  }}>Case Name:</ThemedText>
                  <ThemedText style={{
                    fontWeight: '700',
                    textAlign: 'right',
                    flex: 1,
                    marginLeft: 16,
                    color: '#FF6B35',
                    fontSize: 16,
                  }}>
                    {content.caseName}
                  </ThemedText>
                </View>
                {content.location && (
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                  }}>
                    <ThemedText style={{
                      fontWeight: '600',
                      color: secondaryTextColor,
                      fontSize: 16,
                    }}>Location:</ThemedText>
                    <ThemedText style={{
                      textAlign: 'right',
                      flex: 1,
                      marginLeft: 16,
                      color: textColor,
                      fontSize: 15,
                    }}>
                      {content.location}
                    </ThemedText>
                  </View>
                )}
                {content.timeframStart && (
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}>
                    <ThemedText style={{
                      fontWeight: '600',
                      color: secondaryTextColor,
                      fontSize: 16,
                    }}>Timeframe:</ThemedText>
                    <ThemedText style={{
                      textAlign: 'right',
                      flex: 1,
                      marginLeft: 16,
                      color: textColor,
                      fontSize: 15,
                    }}>
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
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="people" size={24} color="#4A1850" style={{ marginRight: 12 }} />
              <ThemedText style={{
                fontSize: 24,
                fontWeight: '700',
                color: textColor,
                letterSpacing: -0.02,
              }}>
                Cast & Crew
              </ThemedText>
            </View>
            
            <View style={{
              backgroundColor: cardBg,
              borderRadius: 12,
              padding: 20,
              borderWidth: 1,
              borderColor: borderColor,
            }}>
              {content.crew && content.crew.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="camera" size={18} color="#FF6B35" style={{ marginRight: 8 }} />
                    <ThemedText style={{
                      fontWeight: '700',
                      fontSize: 18,
                      color: textColor,
                    }}>
                      Crew
                    </ThemedText>
                  </View>
                  {content.crew.slice(0, 6).map((person, index) => (
                    <View key={person.id}>
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                      }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={{
                            fontWeight: '600',
                            fontSize: 16,
                            color: textColor,
                            marginBottom: 2,
                          }}>
                            {person.name}
                          </ThemedText>
                          <ThemedText style={{
                            fontSize: 14,
                            color: secondaryTextColor,
                          }}>
                            {person.job} • {person.department}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                      </View>
                      {index < Math.min(content.crew?.length || 0, 6) - 1 && (
                        <View style={{
                          height: 1,
                          backgroundColor: borderColor,
                          marginHorizontal: 8,
                        }} />
                      )}
                    </View>
                  ))}
                  {content.crew && content.crew.length > 6 && (
                    <ThemedText style={{
                      textAlign: 'center',
                      fontSize: 14,
                      color: secondaryTextColor,
                      marginTop: 8,
                    }}>
                      +{content.crew.length - 6} more crew members
                    </ThemedText>
                  )}
                </View>
              )}

              {content.cast && content.cast.length > 0 && (
                <View>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}>
                    <Ionicons name="person" size={18} color="#4A1850" style={{ marginRight: 8 }} />
                    <ThemedText style={{
                      fontWeight: '700',
                      fontSize: 18,
                      color: textColor,
                    }}>
                      Cast
                    </ThemedText>
                  </View>
                  {content.cast.slice(0, 6).map((person, index) => (
                    <View key={person.id}>
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                      }}>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={{
                            fontWeight: '600',
                            fontSize: 16,
                            color: textColor,
                            marginBottom: 2,
                          }}>
                            {person.name}
                          </ThemedText>
                          <ThemedText style={{
                            fontSize: 14,
                            color: secondaryTextColor,
                          }}>
                            {person.role || 'Actor'}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={secondaryTextColor} />
                      </View>
                      {index < Math.min(content.cast?.length || 0, 6) - 1 && (
                        <View style={{
                          height: 1,
                          backgroundColor: borderColor,
                          marginHorizontal: 8,
                        }} />
                      )}
                    </View>
                  ))}
                  {content.cast && content.cast.length > 6 && (
                    <ThemedText style={{
                      textAlign: 'center',
                      fontSize: 14,
                      color: secondaryTextColor,
                      marginTop: 8,
                    }}>
                      +{content.cast.length - 6} more cast members
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer spacing */}
        <View style={{ height: 48 }} />
      </ScrollView>
    </ThemedView>
  );
}