# Forms Component System - True Crime App

---
title: Forms Component Specifications
description: Comprehensive form component library for input fields, validation, error states, and accessibility
last-updated: 2025-08-20
version: 1.0
related-files:
  - ../style-guide.md
  - ../tokens/colors.md
  - ../tokens/typography.md
  - buttons.md
dependencies:
  - React Native form validation
  - NativeWind styling system
  - Accessibility APIs
status: approved
---

# Forms Component System

## Overview

The forms component system provides comprehensive input controls for the True Crime tracking app, designed with accessibility, validation, and user safety as primary considerations. All form components maintain the respectful, sophisticated aesthetic required for sensitive content while ensuring excellent usability across all platforms.

## Design Philosophy

### Form Design Principles

**Clarity Over Cleverness**: Form inputs prioritize clear labeling and obvious functionality over visual tricks that might confuse users in emotionally sensitive contexts.

**Progressive Validation**: Real-time feedback helps users succeed rather than punishing mistakes, particularly important when users are discussing sensitive topics.

**Accessibility-First**: Form controls work excellently with screen readers and keyboard navigation, ensuring inclusive access to community features.

**Trauma-Informed Design**: Form interactions never create additional stress through confusing interfaces or unclear error states.

## Component Specifications

### Text Input Component

**Purpose**: Primary text entry for search, notes, reviews, and user profile information

```typescript
interface TextInputProps {
    label: string;
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    
    // Validation
    error?: string;
    success?: boolean;
    required?: boolean;
    maxLength?: number;
    
    // Behavior
    multiline?: boolean;
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    
    // Styling
    variant?: 'default' | 'search' | 'comment' | 'sensitive';
    disabled?: boolean;
    
    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
}
```

#### Visual Specifications

**Default Text Input**:
- **Height**: 48px for single-line, auto-expanding for multiline
- **Padding**: 12px horizontal, 14px vertical
- **Border Radius**: 8px for consistency with other components
- **Border**: 1px solid Dark-300 (#4A4A52) on dark theme
- **Background**: Dark-200 (#3A3A40) on dark theme for subtle depth
- **Typography**: Body (16px/24px, 400) for optimal readability

**State Variations**:

*Default State*:
```css
background: #3A3A40;
border: 1px solid #4A4A52;
color: #AAAAB4;
```

*Focus State*:
```css
background: #3A3A40;
border: 2px solid #8B4B7F;
outline: none;
box-shadow: 0 0 0 3px rgba(139, 75, 127, 0.1);
```

*Error State*:
```css
background: rgba(211, 47, 47, 0.05);
border: 2px solid #D32F2F;
color: #AAAAB4;
```

*Success State*:
```css
background: rgba(56, 142, 60, 0.05);
border: 2px solid #388E3C;
color: #AAAAB4;
```

*Disabled State*:
```css
background: #2C2C30;
border: 1px solid #4A4A52;
color: #6A6A74;
opacity: 0.6;
```

#### Accessibility Implementation

```typescript
const TextInput: React.FC<TextInputProps> = ({
    label,
    error,
    success,
    required,
    accessibilityLabel,
    ...props
}) => {
    const inputId = useId();
    const errorId = useId();
    
    return (
        <View>
            <Text 
                style={styles.label}
                accessibilityRole="text"
            >
                {label} {required && <Text style={styles.required}>*</Text>}
            </Text>
            
            <TextInput
                {...props}
                id={inputId}
                accessibilityLabel={accessibilityLabel || label}
                accessibilityRequired={required}
                accessibilityInvalid={!!error}
                accessibilityDescribedBy={error ? errorId : undefined}
                style={[
                    styles.input,
                    error && styles.inputError,
                    success && styles.inputSuccess
                ]}
            />
            
            {error && (
                <Text 
                    id={errorId}
                    style={styles.errorText}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                >
                    {error}
                </Text>
            )}
        </View>
    );
};
```

### Search Input Component

**Purpose**: Specialized input for content discovery with auto-complete and filtering

```typescript
interface SearchInputProps extends Omit<TextInputProps, 'variant'> {
    suggestions?: SearchSuggestion[];
    onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
    filters?: SearchFilter[];
    onFilterChange?: (filters: SearchFilter[]) => void;
    clearable?: boolean;
    recentSearches?: string[];
}

interface SearchSuggestion {
    id: string;
    text: string;
    type: 'content' | 'case' | 'person' | 'location';
    subtitle?: string;
    imageUrl?: string;
}
```

#### Visual Specifications

**Search Input Layout**:
- **Icon Integration**: Search icon (16px) positioned 12px from left edge
- **Clear Button**: X icon (16px) positioned 12px from right edge when content present
- **Suggestion Dropdown**: Appears below input with 4px gap, max 6 visible suggestions
- **Filter Integration**: Filter chips appear below search input when active

**Search Suggestions**:
- **Suggestion Height**: 56px for comfortable touch targets
- **Layout**: Icon (32px) + text content + suggestion type badge
- **Typography**: Body (16px/24px, 400) for main text, Caption (12px/16px, 400) for subtitle
- **Hover/Focus**: Background color change to Dark-100 (#2C2C30)

```typescript
const SearchInput: React.FC<SearchInputProps> = ({
    suggestions,
    onSuggestionSelect,
    clearable,
    value,
    onChangeText,
    ...props
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    return (
        <View style={styles.searchContainer}>
            <View style={styles.inputWrapper}>
                <Icon name="search" size={16} style={styles.searchIcon} />
                
                <TextInput
                    {...props}
                    value={value}
                    onChangeText={onChangeText}
                    onFocus={() => setShowSuggestions(true)}
                    style={styles.searchInput}
                    accessibilityRole="searchbox"
                />
                
                {clearable && value && (
                    <Pressable 
                        onPress={() => onChangeText('')}
                        style={styles.clearButton}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                    >
                        <Icon name="x" size={16} />
                    </Pressable>
                )}
            </View>
            
            {showSuggestions && suggestions && (
                <View style={styles.suggestionsDropdown}>
                    {suggestions.map((suggestion) => (
                        <SearchSuggestionItem
                            key={suggestion.id}
                            suggestion={suggestion}
                            onSelect={onSuggestionSelect}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};
```

### Comment/Review Input Component

**Purpose**: Specialized input for community discussions and content reviews with moderation features

```typescript
interface CommentInputProps extends TextInputProps {
    mentionSupport?: boolean;
    contentWarnings?: boolean;
    characterLimit?: number;
    moderationGuidelines?: string[];
    onSubmit?: (text: string, warnings: string[]) => void;
    replyTo?: {
        username: string;
        text: string;
    };
}
```

#### Visual Specifications

**Comment Input Layout**:
- **Minimum Height**: 80px for comfortable text entry
- **Maximum Height**: 200px with scroll for longer content
- **Character Counter**: Bottom-right corner with warning at 90% limit
- **Content Warning Toggles**: Respectful checkboxes for trigger warnings

**Community Guidelines Integration**:
- **Guidelines Link**: Subtle link to community guidelines below input
- **Auto-Detection**: Real-time content appropriateness checking
- **Warning Prompts**: Gentle prompts when potentially inappropriate content detected

```typescript
const CommentInput: React.FC<CommentInputProps> = ({
    characterLimit = 500,
    contentWarnings,
    moderationGuidelines,
    onSubmit,
    replyTo,
    ...props
}) => {
    const [text, setText] = useState('');
    const [selectedWarnings, setSelectedWarnings] = useState<string[]>([]);
    const [showGuidelines, setShowGuidelines] = useState(false);
    
    const charactersRemaining = characterLimit - text.length;
    const isNearLimit = charactersRemaining <= characterLimit * 0.1;
    
    return (
        <View style={styles.commentContainer}>
            {replyTo && (
                <View style={styles.replyContext}>
                    <Text style={styles.replyLabel}>Replying to {replyTo.username}</Text>
                    <Text style={styles.replyText} numberOfLines={2}>
                        {replyTo.text}
                    </Text>
                </View>
            )}
            
            <TextInput
                {...props}
                value={text}
                onChangeText={setText}
                multiline
                style={styles.commentInput}
                placeholder="Share your thoughts respectfully..."
                maxLength={characterLimit}
            />
            
            <View style={styles.commentFooter}>
                <View style={styles.leftActions}>
                    <Pressable 
                        onPress={() => setShowGuidelines(!showGuidelines)}
                        style={styles.guidelinesButton}
                    >
                        <Text style={styles.guidelinesText}>Community Guidelines</Text>
                    </Pressable>
                </View>
                
                <View style={styles.rightActions}>
                    <Text 
                        style={[
                            styles.characterCount,
                            isNearLimit && styles.characterCountWarning
                        ]}
                    >
                        {charactersRemaining}
                    </Text>
                </View>
            </View>
            
            {contentWarnings && (
                <ContentWarningSelector
                    selectedWarnings={selectedWarnings}
                    onWarningChange={setSelectedWarnings}
                />
            )}
        </View>
    );
};
```

### Rating Input Component

**Purpose**: Star rating system for content reviews with accessibility support

```typescript
interface RatingInputProps {
    rating: number;
    onRatingChange: (rating: number) => void;
    maxRating?: number;
    allowHalfStars?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    accessibilityLabel?: string;
}
```

#### Visual Specifications

**Star Rating Layout**:
- **Star Sizes**: Small (16px), Medium (24px), Large (32px)
- **Star Spacing**: 4px between stars for comfortable interaction
- **Colors**: Primary (#8B4B7F) for filled, Dark-400 (#6A6A74) for empty
- **Half Star Support**: Gradient fill for half-star ratings
- **Touch Targets**: Minimum 44px for mobile accessibility

```typescript
const RatingInput: React.FC<RatingInputProps> = ({
    rating,
    onRatingChange,
    maxRating = 5,
    allowHalfStars = false,
    size = 'md',
    showValue = false,
    disabled = false,
    accessibilityLabel,
    ...props
}) => {
    const starSize = {
        sm: 16,
        md: 24,
        lg: 32
    }[size];
    
    const handleStarPress = (starIndex: number, event: PressEvent) => {
        if (disabled) return;
        
        let newRating = starIndex + 1;
        
        if (allowHalfStars) {
            const { locationX } = event.nativeEvent;
            const starWidth = starSize;
            if (locationX < starWidth / 2) {
                newRating = starIndex + 0.5;
            }
        }
        
        onRatingChange(newRating);
    };
    
    return (
        <View 
            style={styles.ratingContainer}
            accessibilityRole="adjustable"
            accessibilityLabel={accessibilityLabel || `Rating: ${rating} out of ${maxRating} stars`}
            accessibilityValue={{ min: 0, max: maxRating, now: rating }}
        >
            <View style={styles.starsContainer}>
                {Array.from({ length: maxRating }, (_, index) => (
                    <Pressable
                        key={index}
                        onPress={(event) => handleStarPress(index, event)}
                        style={[styles.starTouchArea, { width: starSize, height: starSize }]}
                        disabled={disabled}
                        accessibilityRole="button"
                        accessibilityLabel={`Rate ${index + 1} stars`}
                    >
                        <StarIcon
                            size={starSize}
                            filled={index < Math.floor(rating)}
                            halfFilled={allowHalfStars && index === Math.floor(rating) && rating % 1 !== 0}
                        />
                    </Pressable>
                ))}
            </View>
            
            {showValue && (
                <Text style={styles.ratingValue}>
                    {rating.toFixed(allowHalfStars ? 1 : 0)}
                </Text>
            )}
        </View>
    );
};
```

### Content Warning Form Component

**Purpose**: Respectful content warning selection for sensitive material

```typescript
interface ContentWarningProps {
    selectedWarnings: string[];
    onWarningChange: (warnings: string[]) => void;
    customWarningSupport?: boolean;
    required?: boolean;
}

const CONTENT_WARNING_OPTIONS = [
    { id: 'violence', label: 'Violence', description: 'Graphic or detailed violence' },
    { id: 'death', label: 'Death/Dying', description: 'Detailed discussion of death' },
    { id: 'mental_health', label: 'Mental Health', description: 'Mental illness or psychological trauma' },
    { id: 'substance_abuse', label: 'Substance Use', description: 'Drug or alcohol abuse' },
    { id: 'sexual_content', label: 'Sexual Content', description: 'Sexual violence or explicit content' },
    { id: 'family_trauma', label: 'Family Issues', description: 'Child abuse or family dysfunction' },
    { id: 'ongoing_case', label: 'Ongoing Investigation', description: 'Active legal proceedings' }
];
```

#### Visual Specifications

**Warning Selection Interface**:
- **Layout**: Grid of checkbox options with clear labels and descriptions
- **Checkbox Design**: 20px squares with checkmark icon, Primary color when selected
- **Typography**: Label (14px/16px, 500) for warning names, Caption (12px/16px, 400) for descriptions
- **Spacing**: 16px between warning options for comfortable selection

```typescript
const ContentWarningForm: React.FC<ContentWarningProps> = ({
    selectedWarnings,
    onWarningChange,
    customWarningSupport = false,
    required = false
}) => {
    const [customWarning, setCustomWarning] = useState('');
    
    const toggleWarning = (warningId: string) => {
        if (selectedWarnings.includes(warningId)) {
            onWarningChange(selectedWarnings.filter(id => id !== warningId));
        } else {
            onWarningChange([...selectedWarnings, warningId]);
        }
    };
    
    return (
        <View style={styles.warningContainer}>
            <Text style={styles.warningHeader}>
                Content Warnings {required && <Text style={styles.required}>*</Text>}
            </Text>
            <Text style={styles.warningDescription}>
                Help others prepare for sensitive content by selecting appropriate warnings.
            </Text>
            
            <View style={styles.warningGrid}>
                {CONTENT_WARNING_OPTIONS.map((warning) => (
                    <Pressable
                        key={warning.id}
                        style={styles.warningOption}
                        onPress={() => toggleWarning(warning.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selectedWarnings.includes(warning.id) }}
                        accessibilityLabel={`${warning.label}: ${warning.description}`}
                    >
                        <View style={[
                            styles.checkbox,
                            selectedWarnings.includes(warning.id) && styles.checkboxSelected
                        ]}>
                            {selectedWarnings.includes(warning.id) && (
                                <Icon name="check" size={12} color="#FFFFFF" />
                            )}
                        </View>
                        
                        <View style={styles.warningText}>
                            <Text style={styles.warningLabel}>{warning.label}</Text>
                            <Text style={styles.warningDesc}>{warning.description}</Text>
                        </View>
                    </Pressable>
                ))}
            </View>
            
            {customWarningSupport && (
                <View style={styles.customWarningSection}>
                    <Text style={styles.customWarningLabel}>Custom Warning (Optional)</Text>
                    <TextInput
                        value={customWarning}
                        onChangeText={setCustomWarning}
                        placeholder="Specify additional content warnings..."
                        style={styles.customWarningInput}
                        maxLength={100}
                    />
                </View>
            )}
        </View>
    );
};
```

## Form Validation System

### Validation Pattern Implementation

```typescript
interface ValidationRule {
    type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
    value?: any;
    message: string;
    validator?: (value: string) => boolean;
}

interface FormFieldConfig {
    name: string;
    label: string;
    type: 'text' | 'email' | 'password' | 'search' | 'comment' | 'rating';
    rules?: ValidationRule[];
    initialValue?: any;
}

const useFormValidation = (fields: FormFieldConfig[]) => {
    const [values, setValues] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    
    const validateField = (name: string, value: any): string | null => {
        const field = fields.find(f => f.name === name);
        if (!field?.rules) return null;
        
        for (const rule of field.rules) {
            switch (rule.type) {
                case 'required':
                    if (!value || (typeof value === 'string' && value.trim() === '')) {
                        return rule.message;
                    }
                    break;
                    
                case 'email':
                    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        return rule.message;
                    }
                    break;
                    
                case 'minLength':
                    if (value && value.length < rule.value) {
                        return rule.message;
                    }
                    break;
                    
                case 'custom':
                    if (rule.validator && !rule.validator(value)) {
                        return rule.message;
                    }
                    break;
            }
        }
        
        return null;
    };
    
    const setValue = (name: string, value: any) => {
        setValues(prev => ({ ...prev, [name]: value }));
        
        // Real-time validation with debounce
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error || '' }));
        }
    };
    
    const setFieldTouched = (name: string) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, values[name]);
        setErrors(prev => ({ ...prev, [name]: error || '' }));
    };
    
    const validateAll = (): boolean => {
        const newErrors: Record<string, string> = {};
        let isValid = true;
        
        fields.forEach(field => {
            const error = validateField(field.name, values[field.name]);
            if (error) {
                newErrors[field.name] = error;
                isValid = false;
            }
        });
        
        setErrors(newErrors);
        setTouched(fields.reduce((acc, field) => ({ ...acc, [field.name]: true }), {}));
        
        return isValid;
    };
    
    return {
        values,
        errors,
        touched,
        setValue,
        setFieldTouched,
        validateAll,
        isValid: Object.keys(errors).length === 0
    };
};
```

## Platform-Specific Adaptations

### iOS Implementation

```typescript
// iOS-specific form enhancements
const IOSTextInput = (props: TextInputProps) => {
    return (
        <TextInput
            {...props}
            // iOS-specific optimizations
            clearButtonMode="while-editing"
            returnKeyType="done"
            enablesReturnKeyAutomatically
            spellCheck
            autoCorrect
            // Haptic feedback on focus
            onFocus={() => {
                HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
            }}
        />
    );
};
```

### Android Implementation

```typescript
// Android-specific form enhancements
const AndroidTextInput = (props: TextInputProps) => {
    return (
        <TextInput
            {...props}
            // Android-specific optimizations
            underlineColorAndroid="transparent"
            importantForAutofill="yes"
            autoComplete="email" // Context-appropriate values
            // Material Design ripple effect
            rippleColor="rgba(139, 75, 127, 0.2)"
        />
    );
};
```

### Web Implementation

```typescript
// Web-specific form enhancements
const WebTextInput = (props: TextInputProps) => {
    return (
        <TextInput
            {...props}
            // Web-specific optimizations
            autoComplete="email" // Appropriate autocomplete attributes
            spellCheck="true"
            // Focus management for keyboard navigation
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !props.multiline) {
                    e.currentTarget.blur();
                }
            }}
        />
    );
};
```

## Accessibility Compliance

### Screen Reader Support

**Form Structure**:
- Proper heading hierarchy for form sections
- Fieldset and legend elements for grouped form controls
- Clear error announcements with aria-live regions
- Progress indicators for multi-step forms

**Input Labeling**:
- All inputs have associated labels (explicit or implicit)
- Required field indicators announced by screen readers
- Error messages properly associated with form controls
- Help text linked to inputs via aria-describedby

### Keyboard Navigation

**Focus Management**:
- Logical tab order through all form controls
- Visible focus indicators meeting 3:1 contrast ratio
- Skip links for long forms with multiple sections
- Enter key submission for single-line inputs

**Keyboard Shortcuts**:
- Alt+S for form submission (where appropriate)
- Escape key for modal form dismissal
- Arrow keys for rating input navigation
- Space bar for checkbox and radio button selection

## Testing and Quality Assurance

### Automated Testing

```typescript
// Example form component test
describe('TextInput Component', () => {
    it('displays error state correctly', () => {
        const { getByText, getByDisplayValue } = render(
            <TextInput
                label="Email Address"
                value="invalid-email"
                error="Please enter a valid email address"
                onChangeText={jest.fn()}
            />
        );
        
        expect(getByText('Please enter a valid email address')).toBeTruthy();
        expect(getByDisplayValue('invalid-email')).toHaveStyle({
            borderColor: '#D32F2F'
        });
    });
    
    it('handles accessibility requirements', () => {
        const { getByLabelText } = render(
            <TextInput
                label="Search Content"
                value=""
                onChangeText={jest.fn()}
                accessibilityHint="Search for True Crime content"
            />
        );
        
        const input = getByLabelText('Search Content');
        expect(input).toBeTruthy();
        expect(input.props.accessibilityHint).toBe('Search for True Crime content');
    });
});
```

### Manual Testing Checklist

**Form Functionality**:
- [ ] All form inputs accept and display text correctly
- [ ] Validation messages appear at appropriate times
- [ ] Form submission works with valid data
- [ ] Error recovery is clear and helpful
- [ ] Form state persists appropriately during navigation

**Accessibility Validation**:
- [ ] Screen reader announces all form elements correctly
- [ ] Keyboard navigation reaches all interactive elements
- [ ] Focus indicators visible and consistent
- [ ] Error messages properly announced by assistive technology
- [ ] Form completion possible without using mouse or touch

**Platform Consistency**:
- [ ] Form appearance consistent across iOS, Android, and Web
- [ ] Platform-specific input behaviors work correctly (autocomplete, spell check)
- [ ] Touch targets meet minimum size requirements on all platforms
- [ ] Keyboard types appropriate for input content on mobile platforms

## Implementation Guidelines

### NativeWind Integration

```javascript
// Tailwind configuration for form components
module.exports = {
    theme: {
        extend: {
            colors: {
                'form-bg': '#3A3A40',
                'form-border': '#4A4A52',
                'form-error': '#D32F2F',
                'form-success': '#388E3C',
            }
        }
    }
};
```

### Performance Optimization

**Form Performance**:
- Debounced validation to prevent excessive re-renders
- Memoized form components to avoid unnecessary updates
- Lazy loading for complex form sections
- Efficient state management for large forms

**Memory Management**:
- Proper cleanup of form event listeners
- Efficient handling of form data in component state
- Optimized re-rendering through React.memo and useMemo

This forms component system provides the foundation for all user input in the True Crime app, ensuring accessibility, usability, and respect for the sensitive nature of the content being discussed.