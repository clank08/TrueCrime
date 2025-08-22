import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { 
  SearchFilters, 
  ContentType, 
  CaseType, 
  FactualityLevel, 
  SensitivityLevel, 
  AvailabilityType 
} from '@/types/api';

interface FilterPanelProps {
  isVisible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  availablePlatforms?: string[];
  availableGenres?: string[];
}

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

interface FilterChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  color?: string;
}

interface RangeSliderProps {
  label: string;
  min: number;
  max: number;
  fromValue: number | undefined;
  toValue: number | undefined;
  onFromChange: (value: number) => void;
  onToChange: (value: number) => void;
  unit?: string;
}

const FilterSection: React.FC<FilterSectionProps> = ({ 
  title, 
  children, 
  defaultExpanded = true 
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const textColor = useThemeColor({}, 'text');

  return (
    <View className="mb-6">
      <Pressable
        onPress={() => setExpanded(!expanded)}
        className="flex-row items-center justify-between py-2"
      >
        <ThemedText className="text-lg font-semibold" style={{ color: textColor }}>
          {title}
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={textColor}
        />
      </Pressable>
      {expanded && children}
    </View>
  );
};

const FilterChip: React.FC<FilterChipProps> = ({ 
  label, 
  selected, 
  onToggle, 
  color = '#8B4B7F' 
}) => {
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({ light: '#E5E5E5', dark: '#4A4A52' }, 'border');

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      className={`px-3 py-2 rounded-full border mr-2 mb-2 ${
        selected ? 'border-primary' : ''
      }`}
      style={{
        backgroundColor: selected ? `${color}20` : 'transparent',
        borderColor: selected ? color : borderColor,
      }}
    >
      <ThemedText
        className={`text-sm ${selected ? 'font-medium' : ''}`}
        style={{
          color: selected ? color : textColor,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
};

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  unit = '',
}) => {
  const textColor = useThemeColor({}, 'text');

  return (
    <View className="mb-4">
      <ThemedText className="text-sm font-medium mb-2" style={{ color: textColor }}>
        {label}
      </ThemedText>
      <View className="flex-row items-center justify-between">
        <ThemedText className="text-sm text-gray-500">
          {fromValue || min}{unit}
        </ThemedText>
        <ThemedText className="text-sm text-gray-500">-</ThemedText>
        <ThemedText className="text-sm text-gray-500">
          {toValue || max}{unit}
        </ThemedText>
      </View>
      {/* Note: In a real implementation, you would use a proper range slider component */}
      <View className="mt-2">
        <ThemedText className="text-xs text-gray-400">
          Range controls will be implemented with a slider component
        </ThemedText>
      </View>
    </View>
  );
};

export function FilterPanel({
  isVisible,
  onClose,
  filters,
  onFiltersChange,
  onApplyFilters,
  onClearFilters,
  availablePlatforms = [],
  availableGenres = [],
}: FilterPanelProps) {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);
  const [hasChanges, setHasChanges] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBg = useThemeColor({ light: '#FFFFFF', dark: '#2C2C30' }, 'card');

  useEffect(() => {
    setLocalFilters(filters);
    setHasChanges(false);
  }, [filters]);

  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    setHasChanges(true);
  };

  const toggleArrayFilter = <K extends keyof SearchFilters>(
    key: K,
    value: string,
    currentArray: string[] = []
  ) => {
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray.length > 0 ? newArray : undefined);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApplyFilters();
    setHasChanges(false);
    onClose();
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Filters',
      'Are you sure you want to clear all filters?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setLocalFilters({});
            onClearFilters();
            setHasChanges(false);
          },
        },
      ]
    );
  };

  const contentTypes: { value: ContentType; label: string }[] = [
    { value: 'DOCUMENTARY', label: 'Documentary' },
    { value: 'DOCUSERIES', label: 'Docuseries' },
    { value: 'DRAMATIZATION', label: 'Dramatization' },
    { value: 'PODCAST', label: 'Podcast' },
    { value: 'BOOK', label: 'Book' },
    { value: 'MOVIE', label: 'Movie' },
    { value: 'TV_SERIES', label: 'TV Series' },
  ];

  const caseTypes: { value: CaseType; label: string }[] = [
    { value: 'SERIAL_KILLER', label: 'Serial Killer' },
    { value: 'MASS_MURDER', label: 'Mass Murder' },
    { value: 'MISSING_PERSON', label: 'Missing Person' },
    { value: 'COLD_CASE', label: 'Cold Case' },
    { value: 'SOLVED_MURDER', label: 'Solved Murder' },
    { value: 'UNSOLVED_MURDER', label: 'Unsolved Murder' },
    { value: 'FINANCIAL_CRIME', label: 'Financial Crime' },
    { value: 'ORGANIZED_CRIME', label: 'Organized Crime' },
    { value: 'CULT_CRIME', label: 'Cult Crime' },
    { value: 'POLITICAL_ASSASSINATION', label: 'Political Assassination' },
    { value: 'KIDNAPPING', label: 'Kidnapping' },
    { value: 'TERRORISM', label: 'Terrorism' },
    { value: 'CYBER_CRIME', label: 'Cyber Crime' },
    { value: 'CORPORATE_CRIME', label: 'Corporate Crime' },
    { value: 'HISTORICAL_CRIME', label: 'Historical Crime' },
  ];

  const factualityLevels: { value: FactualityLevel; label: string }[] = [
    { value: 'DOCUMENTARY', label: 'Documentary' },
    { value: 'DOCUDRAMA', label: 'Docudrama' },
    { value: 'BASED_ON_TRUE_EVENTS', label: 'Based on True Events' },
    { value: 'INSPIRED_BY', label: 'Inspired By' },
    { value: 'FICTIONAL', label: 'Fictional' },
  ];

  const sensitivityLevels: { value: SensitivityLevel; label: string; color: string }[] = [
    { value: 'LOW', label: 'Low', color: '#4CAF50' },
    { value: 'MODERATE', label: 'Moderate', color: '#FF9800' },
    { value: 'HIGH', label: 'High', color: '#F44336' },
    { value: 'EXTREME', label: 'Extreme', color: '#9C27B0' },
  ];

  const availabilityTypes: { value: AvailabilityType; label: string; color: string }[] = [
    { value: 'FREE', label: 'Free', color: '#4CAF50' },
    { value: 'SUBSCRIPTION', label: 'Subscription', color: '#2196F3' },
    { value: 'PREMIUM_SUBSCRIPTION', label: 'Premium', color: '#9C27B0' },
    { value: 'PURCHASE', label: 'Purchase', color: '#FF9800' },
    { value: 'RENTAL', label: 'Rental', color: '#FF5722' },
  ];

  return (
    <Modal
      visible={isVisible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <ThemedView style={{ backgroundColor, flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <Pressable onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color={textColor} />
          </Pressable>
          <ThemedText className="text-lg font-semibold" style={{ color: textColor }}>
            Filters
          </ThemedText>
          <Pressable onPress={handleClear} className="p-2">
            <ThemedText className="text-primary font-medium">Clear</ThemedText>
          </Pressable>
        </View>

        {/* Filter Content */}
        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {/* Content Type */}
          <FilterSection title="Content Type">
            <View className="flex-row flex-wrap">
              {contentTypes.map((type) => (
                <FilterChip
                  key={type.value}
                  label={type.label}
                  selected={localFilters.contentType === type.value}
                  onToggle={() => updateFilter('contentType', 
                    localFilters.contentType === type.value ? undefined : type.value
                  )}
                />
              ))}
            </View>
          </FilterSection>

          {/* Case Type */}
          <FilterSection title="Case Type">
            <View className="flex-row flex-wrap">
              {caseTypes.map((type) => (
                <FilterChip
                  key={type.value}
                  label={type.label}
                  selected={localFilters.caseType === type.value}
                  onToggle={() => updateFilter('caseType',
                    localFilters.caseType === type.value ? undefined : type.value
                  )}
                />
              ))}
            </View>
          </FilterSection>

          {/* Platforms */}
          {availablePlatforms.length > 0 && (
            <FilterSection title="Platforms">
              <View className="flex-row flex-wrap">
                {availablePlatforms.map((platform) => (
                  <FilterChip
                    key={platform}
                    label={platform}
                    selected={localFilters.platforms?.includes(platform) || false}
                    onToggle={() => toggleArrayFilter('platforms', platform, localFilters.platforms)}
                  />
                ))}
              </View>
            </FilterSection>
          )}

          {/* Availability Type */}
          <FilterSection title="Availability">
            <View className="flex-row flex-wrap">
              {availabilityTypes.map((type) => (
                <FilterChip
                  key={type.value}
                  label={type.label}
                  selected={localFilters.availabilityType === type.value}
                  onToggle={() => updateFilter('availabilityType',
                    localFilters.availabilityType === type.value ? undefined : type.value
                  )}
                  color={type.color}
                />
              ))}
            </View>
          </FilterSection>

          {/* Release Year Range */}
          <FilterSection title="Release Year">
            <RangeSlider
              label="Year Range"
              min={1900}
              max={new Date().getFullYear()}
              fromValue={localFilters.yearFrom}
              toValue={localFilters.yearTo}
              onFromChange={(value) => updateFilter('yearFrom', value)}
              onToChange={(value) => updateFilter('yearTo', value)}
            />
          </FilterSection>

          {/* Rating Range */}
          <FilterSection title="User Rating">
            <RangeSlider
              label="Rating Range"
              min={0}
              max={10}
              fromValue={localFilters.ratingFrom}
              toValue={localFilters.ratingTo}
              onFromChange={(value) => updateFilter('ratingFrom', value)}
              onToChange={(value) => updateFilter('ratingTo', value)}
              unit="/10"
            />
          </FilterSection>

          {/* Factuality Level */}
          <FilterSection title="Factuality Level">
            <View className="flex-row flex-wrap">
              {factualityLevels.map((level) => (
                <FilterChip
                  key={level.value}
                  label={level.label}
                  selected={localFilters.factualityLevel === level.value}
                  onToggle={() => updateFilter('factualityLevel',
                    localFilters.factualityLevel === level.value ? undefined : level.value
                  )}
                />
              ))}
            </View>
          </FilterSection>

          {/* Sensitivity Level */}
          <FilterSection title="Content Warning Level">
            <View className="flex-row flex-wrap">
              {sensitivityLevels.map((level) => (
                <FilterChip
                  key={level.value}
                  label={level.label}
                  selected={localFilters.sensitivityLevel === level.value}
                  onToggle={() => updateFilter('sensitivityLevel',
                    localFilters.sensitivityLevel === level.value ? undefined : level.value
                  )}
                  color={level.color}
                />
              ))}
            </View>
          </FilterSection>

          {/* Additional Options */}
          <FilterSection title="Additional Options">
            <Pressable
              onPress={() => updateFilter('includeUnavailable', !localFilters.includeUnavailable)}
              className="flex-row items-center py-2"
            >
              <View className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                localFilters.includeUnavailable ? 'bg-primary border-primary' : 'border-gray-400'
              }`}>
                {localFilters.includeUnavailable && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <ThemedText style={{ color: textColor }}>
                Include unavailable content
              </ThemedText>
            </Pressable>
          </FilterSection>
        </ScrollView>

        {/* Footer */}
        <View className="p-4 border-t border-gray-200">
          <Button
            onPress={handleApply}
            className={`${hasChanges ? 'bg-primary' : 'bg-gray-400'}`}
            disabled={!hasChanges}
          >
            <ThemedText className="text-white font-semibold text-center">
              Apply Filters
            </ThemedText>
          </Button>
        </View>
      </ThemedView>
    </Modal>
  );
}