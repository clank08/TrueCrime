import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'trending' | 'autocomplete';
  icon?: keyof typeof Ionicons.glyphMap;
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: (query: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  isLoading?: boolean;
  showVoiceSearch?: boolean;
  className?: string;
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  onFocus,
  onBlur,
  placeholder = 'Search True Crime content...',
  suggestions = [],
  recentSearches = [],
  isLoading = false,
  showVoiceSearch = Platform.OS !== 'web',
  className = '',
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#4A4A52' }, 'text');
  const placeholderColor = useThemeColor({ light: '#8A8A94', dark: '#8A8A94' }, 'text');

  const handleFocus = () => {
    setIsFocused(true);
    setShowSuggestions(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Delay hiding suggestions to allow for suggestion selection
    setTimeout(() => setShowSuggestions(false), 150);
    onBlur?.();
  };

  const handleSubmit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      setShowSuggestions(false);
      Keyboard.dismiss();
    }
  };

  const handleSuggestionPress = (suggestion: SearchSuggestion) => {
    onChangeText(suggestion.text);
    onSubmit(suggestion.text);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const startVoiceSearch = async () => {
    try {
      setIsListening(true);
      
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Microphone access is needed for voice search. Please enable it in your device settings.'
        );
        setIsListening(false);
        return;
      }

      // Configure audio session for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      // Start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;

      // Stop recording after 5 seconds (or when user taps again)
      setTimeout(() => {
        if (isListening) {
          stopVoiceSearch();
        }
      }, 5000);

    } catch (error) {
      console.error('Failed to start voice search:', error);
      Alert.alert('Error', 'Voice search is not available. Please try typing your search.');
      setIsListening(false);
    }
  };

  const stopVoiceSearch = async () => {
    try {
      setIsListening(false);
      
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        recordingRef.current = null;

        // In a real implementation, you would send the audio to a speech-to-text service
        // For now, we'll show a placeholder message
        Alert.alert(
          'Voice Search',
          'Voice search functionality will be available in a future update. Please type your search for now.'
        );
      }
    } catch (error) {
      console.error('Failed to stop voice search:', error);
    }
  };

  const renderSuggestion = ({ item }: { item: SearchSuggestion }) => {
    const getIcon = () => {
      switch (item.type) {
        case 'recent':
          return 'time-outline';
        case 'trending':
          return 'trending-up';
        case 'autocomplete':
          return 'search-outline';
        default:
          return 'search-outline';
      }
    };

    return (
      <Pressable
        onPress={() => handleSuggestionPress(item)}
        className="flex-row items-center px-4 py-3 border-b border-dark-100"
        style={{ backgroundColor }}
      >
        <Ionicons 
          name={item.icon || getIcon()} 
          size={16} 
          color={placeholderColor} 
          style={{ marginRight: 12 }}
        />
        <ThemedText className="flex-1" style={{ color: textColor }}>
          {item.text}
        </ThemedText>
        {item.type === 'trending' && (
          <ThemedText className="text-xs text-primary">Trending</ThemedText>
        )}
      </Pressable>
    );
  };

  // Combine suggestions with recent searches
  const allSuggestions: SearchSuggestion[] = [
    ...suggestions,
    ...recentSearches.map((search, index) => ({
      id: `recent-${index}`,
      text: search,
      type: 'recent' as const,
    })),
  ];

  return (
    <View className={`relative ${className}`}>
      {/* Search Input Container */}
      <View 
        className={`flex-row items-center px-4 py-3 rounded-xl border ${
          isFocused ? 'border-primary' : ''
        }`}
        style={{ 
          backgroundColor,
          borderColor: isFocused ? '#8B4B7F' : borderColor,
        }}
      >
        <Ionicons 
          name="search" 
          size={20} 
          color={placeholderColor} 
          style={{ marginRight: 12 }}
        />
        
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          selectionColor="#8B4B7F"
          returnKeyType="search"
          autoCorrect={false}
          autoComplete="off"
          className="flex-1 text-base"
          style={{ color: textColor }}
          editable={!isLoading}
        />

        {/* Clear Button */}
        {value.length > 0 && (
          <Pressable
            onPress={handleClear}
            className="p-1 ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={20} color={placeholderColor} />
          </Pressable>
        )}

        {/* Voice Search Button */}
        {showVoiceSearch && (
          <Pressable
            onPress={isListening ? stopVoiceSearch : startVoiceSearch}
            className={`p-2 ml-2 rounded-full ${isListening ? 'bg-primary' : ''}`}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={isListening ? 'mic' : 'mic-outline'} 
              size={20} 
              color={isListening ? '#FFFFFF' : placeholderColor} 
            />
          </Pressable>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <View className="ml-2">
            <Ionicons name="refresh" size={20} color={placeholderColor} />
          </View>
        )}
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && allSuggestions.length > 0 && (
        <ThemedView 
          className="absolute top-full left-0 right-0 mt-1 rounded-xl border shadow-lg z-50"
          style={{ 
            backgroundColor,
            borderColor,
            maxHeight: 300,
          }}
        >
          <FlatList
            data={allSuggestions}
            keyExtractor={(item) => item.id}
            renderItem={renderSuggestion}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 300 }}
          />
        </ThemedView>
      )}

      {/* Voice Search Indicator */}
      {isListening && (
        <View className="absolute -bottom-12 left-0 right-0 flex-row justify-center">
          <View className="bg-primary px-4 py-2 rounded-full">
            <ThemedText className="text-white text-sm font-medium">
              Listening... Tap mic to stop
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}