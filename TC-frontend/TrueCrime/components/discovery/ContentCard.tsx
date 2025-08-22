import React, { useState, useRef } from 'react';
import {
  View,
  Pressable,
  Image,
  Dimensions,
  Text,
  Animated,
  PlatformColor,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Content, ContentType, AvailabilityType } from '@/types/api';

interface ContentCardProps {
  content: Content;
  onPress: (content: Content) => void;
  onAddToWatchlist?: (contentId: string) => void;
  onRemoveFromWatchlist?: (contentId: string) => void;
  onMarkWatched?: (contentId: string) => void;
  isInWatchlist?: boolean;
  isWatched?: boolean;
  showQuickActions?: boolean;
  width?: number;
  className?: string;
}

const { width: screenWidth } = Dimensions.get('window');

export function ContentCard({
  content,
  onPress,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onMarkWatched,
  isInWatchlist = false,
  isWatched = false,
  showQuickActions = true,
  width,
  className = '',
}: ContentCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  // Animation values for hover effects
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const elevationAnim = useRef(new Animated.Value(3)).current;
  const imageOpacityAnim = useRef(new Animated.Value(0)).current;

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({ light: '#212121', dark: '#EAEAF4' }, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#2C2C30' }, 'card');
  const borderColor = useThemeColor({ light: '#E0E0E0', dark: '#4A4A52' }, 'border');
  const secondaryTextColor = useThemeColor({ light: '#757575', dark: '#8A8A94' }, 'text');
  const surfaceColor = useThemeColor({ light: '#F5F5F5', dark: '#3A3A40' }, 'background');

  // Calculate card dimensions - optimized for search results
  const cardWidth = width || (screenWidth - 48) / 2; // Default to half screen minus margins
  const posterHeight = 140; // Fixed poster height for search results
  const contentHeight = 90; // Fixed content info area height
  const totalCardHeight = posterHeight + contentHeight; // Total card height ~230px

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(content);
  };

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(elevationAnim, {
        toValue: 8,
        useNativeDriver: false,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(elevationAnim, {
        toValue: 3,
        useNativeDriver: false,
        tension: 300,
        friction: 10,
      }),
    ]).start();
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    Animated.timing(imageOpacityAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleLongPress = () => {
    if (showQuickActions) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowActions(!showActions);
    }
  };

  const handleQuickAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
    setShowActions(false);
  };

  const getContentTypeIcon = (type: ContentType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'DOCUMENTARY':
        return 'film-outline';
      case 'DOCUSERIES':
        return 'tv-outline';
      case 'DRAMATIZATION':
        return 'play-circle-outline';
      case 'PODCAST':
        return 'headset-outline';
      case 'BOOK':
        return 'book-outline';
      case 'MOVIE':
        return 'film-outline';
      case 'TV_SERIES':
        return 'tv-outline';
      default:
        return 'film-outline';
    }
  };

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

  const formatRuntime = (minutes: number | null): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getWarningLevel = (level: string): { color: string; icon: keyof typeof Ionicons.glyphMap; label: string } => {
    switch (level) {
      case 'LOW':
        return { color: '#FF8F00', icon: 'warning-outline', label: 'MILD' };
      case 'MODERATE':
        return { color: '#F57C00', icon: 'warning', label: 'MODERATE' };
      case 'HIGH':
        return { color: '#D32F2F', icon: 'alert-circle', label: 'SEVERE' };
      case 'EXTREME':
        return { color: '#D32F2F', icon: 'nuclear-outline', label: 'EXTREME' };
      default:
        return { color: '#757575', icon: 'information-circle-outline', label: 'WARNING' };
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      className={`relative ${className}`}
      style={{ 
        width: cardWidth,
        // Ensure border radius is preserved at container level
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{ 
          backgroundColor: cardBg,
          borderRadius: 12,
          borderWidth: 1,
          borderColor,
          height: totalCardHeight,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: elevationAnim,
          // Web-compatible box shadow
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
          transform: [{ scale: scaleAnim }],
          // Ensure card stays within bounds to prevent overlap
          maxWidth: cardWidth,
          width: cardWidth,
          overflow: 'hidden', // Force all child content to respect border radius
          // Additional platform-specific border radius enforcement
          ...({
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
          }),
        }}
      >
        {/* Poster Image */}
        <View className="relative" style={{ 
          height: posterHeight,
          overflow: 'hidden', // Prevent any child elements from extending beyond bounds
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          backgroundColor: cardBg, // Ensure background matches card
        }}>
          {content.posterUrl && !imageError ? (
            <>
              <Animated.Image
                source={{ uri: content.posterUrl }}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  opacity: imageOpacityAnim,
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                }}
                resizeMode="cover"
                onLoad={handleImageLoad}
                onError={() => setImageError(true)}
              />
              
              {/* Gradient overlay for better text readability */}
              <LinearGradient
                colors={['transparent', 'transparent', 'rgba(0,0,0,0.7)']}
                locations={[0, 0.6, 1]}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '50%',
                  pointerEvents: 'none',
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  overflow: 'hidden',
                }}
              />
              {!imageLoaded && (
                <View style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#1A1A1C',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Skeleton shimmer effect */}
                  <Animated.View
                    style={{
                      width: '80%',
                      height: '80%',
                      backgroundColor: '#2C2C30',
                      borderRadius: 8,
                      opacity: imageOpacityAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                    }}
                  />
                  <View style={{
                    position: 'absolute',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Ionicons name="image-outline" size={32} color="#8A8A94" />
                    <Text style={{ color: secondaryTextColor, fontSize: 11, marginTop: 4 }}>
                      Loading...
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View 
              className="w-full h-full items-center justify-center"
              style={{ 
                backgroundColor: surfaceColor,
                borderWidth: 2,
                borderColor: borderColor,
                borderStyle: 'dashed',
                borderTopLeftRadius: 12,
                borderTopRightRadius: 12,
                overflow: 'hidden',
              }}
            >
              <Ionicons 
                name={getContentTypeIcon(content.contentType)} 
                size={36} 
                color={secondaryTextColor} 
              />
              <Text style={{ 
                color: secondaryTextColor, 
                fontSize: 11, 
                marginTop: 6,
                textAlign: 'center',
                paddingHorizontal: 8,
              }}>
                {content.title}
              </Text>
            </View>
          )}

          {/* Content Type Badge - Enhanced */}
          <View style={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
            maxWidth: cardWidth - 80, // Leave space for sensitivity badge
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.3,
            shadowRadius: 2,
            elevation: 2,
          }}>
            <Ionicons 
              name={getContentTypeIcon(content.contentType)} 
              size={12} 
              color="#FFFFFF" 
              style={{ marginRight: 4 }}
            />
            <Text style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '700',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              textShadowColor: 'rgba(0, 0, 0, 0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 1,
            }}>
              {content.contentType.replace('_', ' ')}
            </Text>
          </View>

          {/* Sensitivity Warning - Enhanced */}
          {content.sensitivityLevel && content.sensitivityLevel !== 'LOW' && (
            <View style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: getWarningLevel(content.sensitivityLevel).color,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
              maxWidth: cardWidth - 16, // Ensure it stays within card bounds
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              elevation: 2,
            }}>
              <Ionicons 
                name={getWarningLevel(content.sensitivityLevel).icon} 
                size={12} 
                color="#FFFFFF" 
                style={{ marginRight: 4 }}
              />
              <Text style={{
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 0.5,
                textShadowColor: 'rgba(0, 0, 0, 0.5)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 1,
              }}>
                {getWarningLevel(content.sensitivityLevel).label}
              </Text>
            </View>
          )}

          {/* Platform Badges - Bottom Overlay */}
          {content.platforms && content.platforms.length > 0 && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 8,
              paddingBottom: 8,
              overflow: 'hidden', // Prevent badge overflow
            }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                flexWrap: 'wrap',
                maxWidth: cardWidth - 16, // Ensure badges stay within bounds
              }}>
                {content.platforms.slice(0, 3).map((platform, index) => (
                  <View
                    key={platform.id}
                    style={{
                      backgroundColor: getAvailabilityColor(platform.availabilityType),
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 4,
                      marginRight: 4,
                      marginBottom: 2,
                      shadowColor: '#000000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.3,
                      shadowRadius: 1,
                      elevation: 1,
                    }}
                  >
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 9,
                      fontWeight: '700',
                      letterSpacing: 0.3,
                      textShadowColor: 'rgba(0, 0, 0, 0.5)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 1,
                    }}>
                      {platform.name}
                    </Text>
                  </View>
                ))}
                {content.platforms.length > 3 && (
                  <View style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 4,
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.3,
                    shadowRadius: 1,
                    elevation: 1,
                  }}>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 9,
                      fontWeight: '700',
                      letterSpacing: 0.3,
                      textShadowColor: 'rgba(0, 0, 0, 0.5)',
                      textShadowOffset: { width: 0, height: 1 },
                      textShadowRadius: 1,
                    }}>
                      +{content.platforms.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Status Indicators */}
          <View className="absolute bottom-2 right-2 flex-row">
            {isWatched && (
              <View className="w-6 h-6 bg-green-500 rounded-full items-center justify-center mr-1">
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            )}
            {isInWatchlist && !isWatched && (
              <View className="w-6 h-6 bg-blue-500 rounded-full items-center justify-center">
                <Ionicons name="bookmark" size={14} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>

        {/* Content Info */}
        <View style={{ 
          padding: 12, 
          height: contentHeight,
          backgroundColor: cardBg,
          overflow: 'hidden', // Ensure content doesn't overflow the rounded corners
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
        }}>
          <Text 
            style={{
              fontSize: 15,
              lineHeight: 20,
              fontWeight: '700',
              color: textColor,
              marginBottom: 6,
              letterSpacing: -0.02,
              textShadowColor: 'rgba(0, 0, 0, 0.1)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 1,
            }}
            numberOfLines={2}
          >
            {content.title}
          </Text>

          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            marginBottom: 4, 
            flexWrap: 'wrap',
          }}>
            {content.releaseDate && (
              <Text style={{
                fontSize: 12,
                color: secondaryTextColor,
                marginRight: 6,
                fontWeight: '600',
                letterSpacing: 0.2,
              }}>
                {new Date(content.releaseDate).getFullYear()}
              </Text>
            )}
            <Text style={{
              fontSize: 11,
              color: secondaryTextColor,
              marginRight: 6,
              fontWeight: '500',
            }}>
              •
            </Text>
            <Text style={{
              fontSize: 11,
              color: '#8B4B7F',
              marginRight: 6,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              {content.contentType.replace('_', ' ')}
            </Text>
            {content.userRatingAvg && (
              <>
                <Text style={{
                  fontSize: 11,
                  color: secondaryTextColor,
                  marginRight: 6,
                  fontWeight: '500',
                }}>
                  •
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={11} color="#FFD700" />
                  <Text style={{
                    fontSize: 11,
                    color: secondaryTextColor,
                    marginLeft: 2,
                    fontWeight: '500',
                  }}>
                    {content.userRatingAvg.toFixed(1)}
                  </Text>
                </View>
              </>
            )}
          </View>

          {content.caseName && (
            <View style={{
              backgroundColor: 'rgba(139, 75, 127, 0.1)',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginTop: 4,
              alignSelf: 'flex-start',
              borderWidth: 1,
              borderColor: 'rgba(139, 75, 127, 0.3)',
            }}>
              <Text 
                style={{
                  fontSize: 10,
                  color: '#8B4B7F',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
                numberOfLines={1}
              >
                {content.caseName} Case
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions Overlay */}
        {showActions && showQuickActions && (
          <Animated.View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: showActions ? 1 : 0,
          }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              {!isInWatchlist ? (
                <Pressable
                  onPress={() => handleQuickAction(() => onAddToWatchlist?.(content.id))}
                  style={{
                    width: 52,
                    height: 52,
                    backgroundColor: '#8B4B7F',
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#8B4B7F',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => handleQuickAction(() => onRemoveFromWatchlist?.(content.id))}
                  style={{
                    width: 52,
                    height: 52,
                    backgroundColor: '#FF6B35',
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#FF6B35',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Ionicons name="remove" size={24} color="#FFFFFF" />
                </Pressable>
              )}

              {!isWatched && (
                <Pressable
                  onPress={() => handleQuickAction(() => onMarkWatched?.(content.id))}
                  style={{
                    width: 52,
                    height: 52,
                    backgroundColor: '#4CAF50',
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#4CAF50',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 6,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}