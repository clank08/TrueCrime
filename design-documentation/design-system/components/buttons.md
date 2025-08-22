# Button Component System - True Crime App

---
title: Button Component Specifications
description: Comprehensive button component library with variants, states, sizes, and accessibility implementation
last-updated: 2025-08-20
version: 1.0
related-files:
  - ../style-guide.md
  - ../tokens/colors.md
  - ../tokens/typography.md
  - forms.md
dependencies:
  - React Native Pressable API
  - NativeWind styling system
  - Expo Haptics (mobile)
  - Accessibility APIs
status: approved
---

# Button Component System

## Overview

The button component system provides consistent, accessible, and contextually appropriate interactive elements for the True Crime tracking app. All button variants maintain the sophisticated, respectful aesthetic required for sensitive content while ensuring excellent usability and clear visual hierarchy.

## Design Philosophy

### Button Design Principles

**Clear Intent**: Every button variant clearly communicates its purpose and importance level within the interface hierarchy.

**Respectful Interaction**: Button styling avoids sensationalism while maintaining engagement, appropriate for the sensitive nature of True Crime content.

**Accessible by Default**: All button states work excellently with screen readers, keyboard navigation, and provide appropriate haptic feedback.

**Context-Aware**: Button variants adapt appropriately to different content types and user safety contexts.

## Component Specifications

### Primary Button Component

**Purpose**: Primary actions, content tracking, and main call-to-action elements

```typescript
interface ButtonProps {
    // Content
    children: React.ReactNode;
    
    // Behavior
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    
    // Appearance
    variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    
    // Icon integration
    icon?: React.ComponentType<{ size: number; color: string }>;
    iconPosition?: 'left' | 'right';
    
    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: 'button' | 'link';
    
    // Styling
    style?: ViewStyle;
    testID?: string;
}
```

#### Visual Specifications

**Primary Button - Default State**:
- **Height**: 48px (mobile), 44px (desktop)
- **Padding**: 16px horizontal, 12px vertical
- **Border Radius**: 8px for consistent component language
- **Background**: Primary (#8B4B7F) with subtle gradient
- **Typography**: Button (16px/20px, 600) in white
- **Shadow**: 0px 2px 4px rgba(139, 75, 127, 0.2)

```css
/* Primary Button Styling */
.primary-button {
    background: linear-gradient(135deg, #8B4B7F 0%, #7A426F 100%);
    border: none;
    color: #FFFFFF;
    font-weight: 600;
    letter-spacing: 0.01em;
    transition: all 250ms cubic-bezier(0.0, 0, 0.2, 1);
}
```

**State Variations**:

*Hover State*:
```css
.primary-button:hover {
    background: linear-gradient(135deg, #6B3760 0%, #5A2E50 100%);
    box-shadow: 0px 4px 8px rgba(139, 75, 127, 0.3);
    transform: translateY(-1px);
}
```

*Active/Pressed State*:
```css
.primary-button:active {
    background: linear-gradient(135deg, #5A2E50 0%, #4A2540 100%);
    box-shadow: inset 0px 2px 4px rgba(0, 0, 0, 0.2);
    transform: translateY(0px);
}
```

*Focus State*:
```css
.primary-button:focus {
    outline: 2px solid #A66B9E;
    outline-offset: 2px;
    box-shadow: 0px 2px 4px rgba(139, 75, 127, 0.2), 0 0 0 3px rgba(166, 107, 158, 0.3);
}
```

*Disabled State*:
```css
.primary-button:disabled {
    background: #4A4A52;
    color: #6A6A74;
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
}
```

*Loading State*:
```css
.primary-button-loading {
    background: #8B4B7F;
    color: transparent;
    position: relative;
}

.primary-button-loading::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border: 2px solid transparent;
    border-top: 2px solid #FFFFFF;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
```

#### Implementation

```typescript
const Button: React.FC<ButtonProps> = ({
    children,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    accessibilityLabel,
    accessibilityHint,
    style,
    testID,
    ...props
}) => {
    const theme = useTheme();
    const [isPressed, setIsPressed] = useState(false);
    
    const handlePressIn = () => {
        setIsPressed(true);
        // Haptic feedback on mobile platforms
        if (Platform.OS !== 'web') {
            HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
        }
    };
    
    const handlePressOut = () => {
        setIsPressed(false);
    };
    
    const handlePress = () => {
        if (!disabled && !loading) {
            onPress();
        }
    };
    
    const buttonStyles = useMemo(() => [
        styles.base,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        loading && styles.loading,
        isPressed && styles.pressed,
        style
    ], [variant, size, fullWidth, disabled, loading, isPressed, style]);
    
    const textStyles = useMemo(() => [
        styles.text,
        styles[`text_${variant}`],
        styles[`text_${size}`],
        disabled && styles.textDisabled,
        loading && styles.textLoading
    ], [variant, size, disabled, loading]);
    
    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={buttonStyles}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
            accessibilityHint={accessibilityHint}
            accessibilityState={{
                disabled: disabled || loading,
                busy: loading
            }}
            testID={testID}
            {...props}
        >
            {loading ? (
                <ActivityIndicator 
                    size="small" 
                    color={variant === 'primary' ? '#FFFFFF' : theme.colors.primary}
                />
            ) : (
                <View style={styles.content}>
                    {Icon && iconPosition === 'left' && (
                        <Icon 
                            size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} 
                            color={disabled ? theme.colors.disabled : theme.colors[`${variant}Text`]}
                            style={styles.iconLeft}
                        />
                    )}
                    
                    <Text style={textStyles}>
                        {children}
                    </Text>
                    
                    {Icon && iconPosition === 'right' && (
                        <Icon 
                            size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16}
                            color={disabled ? theme.colors.disabled : theme.colors[`${variant}Text`]}
                            style={styles.iconRight}
                        />
                    )}
                </View>
            )}
        </Pressable>
    );
};
```

### Secondary Button Component

**Purpose**: Supporting actions, alternative options, and less prominent interactions

#### Visual Specifications

**Secondary Button - Default State**:
- **Height**: Same as primary (48px mobile, 44px desktop)
- **Padding**: 16px horizontal, 12px vertical
- **Border Radius**: 8px
- **Background**: Transparent
- **Border**: 2px solid #4A4A5A (Secondary color)
- **Typography**: Button (16px/20px, 600) in Secondary color
- **Shadow**: None (relies on border for definition)

```css
.secondary-button {
    background: transparent;
    border: 2px solid #4A4A5A;
    color: #4A4A5A;
    font-weight: 600;
}

.secondary-button:hover {
    background: rgba(74, 74, 90, 0.1);
    border-color: #6B6B7A;
    color: #6B6B7A;
}

.secondary-button:active {
    background: rgba(74, 74, 90, 0.2);
    border-color: #4A4A5A;
}

.secondary-button:focus {
    outline: 2px solid #6B6B7A;
    outline-offset: 2px;
}
```

### Tertiary Button Component

**Purpose**: Subtle actions, text-like interactions, and minimal visual weight

#### Visual Specifications

**Tertiary Button - Default State**:
- **Height**: Auto (based on content)
- **Padding**: 8px horizontal, 6px vertical
- **Border Radius**: 4px (smaller for text-like appearance)
- **Background**: Transparent
- **Border**: None
- **Typography**: Body (16px/24px, 500) in Primary color
- **Underline**: On hover for web, none for mobile

```css
.tertiary-button {
    background: transparent;
    border: none;
    color: #8B4B7F;
    font-weight: 500;
    padding: 6px 8px;
    border-radius: 4px;
}

.tertiary-button:hover {
    background: rgba(139, 75, 127, 0.1);
    text-decoration: underline;
}

.tertiary-button:active {
    background: rgba(139, 75, 127, 0.2);
}
```

### Ghost Button Component

**Purpose**: Minimal visual impact actions, destructive confirmations, and subtle interactions

#### Visual Specifications

**Ghost Button - Default State**:
- **Height**: Same as primary (48px mobile, 44px desktop)
- **Padding**: 16px horizontal, 12px vertical
- **Border Radius**: 8px
- **Background**: Transparent
- **Border**: None
- **Typography**: Button (16px/20px, 600) in current text color
- **Shadow**: None

```css
.ghost-button {
    background: transparent;
    border: none;
    color: #AAAAB4;
    font-weight: 600;
}

.ghost-button:hover {
    background: rgba(170, 170, 180, 0.1);
    color: #CACAD4;
}

.ghost-button:active {
    background: rgba(170, 170, 180, 0.2);
}
```

### Danger Button Component

**Purpose**: Destructive actions, account deletion, and warning confirmations

#### Visual Specifications

**Danger Button - Default State**:
- **Height**: Same as primary (48px mobile, 44px desktop)
- **Padding**: 16px horizontal, 12px vertical
- **Border Radius**: 8px
- **Background**: Error color (#D32F2F)
- **Typography**: Button (16px/20px, 600) in white
- **Shadow**: 0px 2px 4px rgba(211, 47, 47, 0.2)

```css
.danger-button {
    background: linear-gradient(135deg, #D32F2F 0%, #C62828 100%);
    border: none;
    color: #FFFFFF;
    font-weight: 600;
}

.danger-button:hover {
    background: linear-gradient(135deg, #C62828 0%, #B71C1C 100%);
    box-shadow: 0px 4px 8px rgba(211, 47, 47, 0.3);
}

.danger-button:active {
    background: linear-gradient(135deg, #B71C1C 0%, #A00000 100%);
    box-shadow: inset 0px 2px 4px rgba(0, 0, 0, 0.2);
}
```

## Size Variations

### Small Buttons

**Usage**: Compact interfaces, secondary actions, and space-constrained layouts

```css
.button-sm {
    height: 32px;
    padding: 6px 12px;
    font-size: 14px;
    line-height: 16px;
}

.button-sm .icon {
    width: 12px;
    height: 12px;
}
```

### Medium Buttons (Default)

**Usage**: Standard interface interactions, primary actions, and general use

```css
.button-md {
    height: 48px; /* mobile */
    height: 44px; /* desktop */
    padding: 12px 16px;
    font-size: 16px;
    line-height: 20px;
}

.button-md .icon {
    width: 16px;
    height: 16px;
}
```

### Large Buttons

**Usage**: Hero sections, primary call-to-actions, and emphasis

```css
.button-lg {
    height: 56px;
    padding: 16px 24px;
    font-size: 18px;
    line-height: 22px;
}

.button-lg .icon {
    width: 20px;
    height: 20px;
}
```

## Specialized Button Components

### Icon Button Component

**Purpose**: Space-efficient actions with clear iconographic meaning

```typescript
interface IconButtonProps extends Omit<ButtonProps, 'children'> {
    icon: React.ComponentType<{ size: number; color: string }>;
    accessibilityLabel: string; // Required for icon-only buttons
}

const IconButton: React.FC<IconButtonProps> = ({
    icon: Icon,
    size = 'md',
    variant = 'ghost',
    accessibilityLabel,
    ...props
}) => {
    const iconSize = {
        sm: 16,
        md: 20,
        lg: 24
    }[size];
    
    const buttonSize = {
        sm: 32,
        md: 44,
        lg: 52
    }[size];
    
    return (
        <Pressable
            style={[
                styles.iconButton,
                styles[variant],
                { width: buttonSize, height: buttonSize }
            ]}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            {...props}
        >
            <Icon size={iconSize} color={theme.colors[`${variant}Text`]} />
        </Pressable>
    );
};
```

### Split Button Component

**Purpose**: Primary action with secondary options dropdown

```typescript
interface SplitButtonProps extends ButtonProps {
    dropdownItems: DropdownItem[];
    onDropdownItemPress: (item: DropdownItem) => void;
}

const SplitButton: React.FC<SplitButtonProps> = ({
    children,
    onPress,
    dropdownItems,
    onDropdownItemPress,
    ...props
}) => {
    const [showDropdown, setShowDropdown] = useState(false);
    
    return (
        <View style={styles.splitButtonContainer}>
            <Button
                {...props}
                style={[styles.splitButtonMain, props.style]}
                onPress={onPress}
            >
                {children}
            </Button>
            
            <IconButton
                icon={ChevronDownIcon}
                size={props.size}
                variant={props.variant}
                onPress={() => setShowDropdown(!showDropdown)}
                accessibilityLabel="More options"
                style={styles.splitButtonDropdown}
            />
            
            {showDropdown && (
                <DropdownMenu
                    items={dropdownItems}
                    onItemPress={(item) => {
                        onDropdownItemPress(item);
                        setShowDropdown(false);
                    }}
                    onDismiss={() => setShowDropdown(false)}
                />
            )}
        </View>
    );
};
```

### Floating Action Button (FAB)

**Purpose**: Primary floating action for content creation and quick actions

```typescript
interface FABProps extends Omit<ButtonProps, 'variant' | 'fullWidth'> {
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    extended?: boolean;
}

const FloatingActionButton: React.FC<FABProps> = ({
    position = 'bottom-right',
    extended = false,
    icon: Icon,
    children,
    ...props
}) => {
    const positionStyles = {
        'bottom-right': { bottom: 24, right: 24 },
        'bottom-left': { bottom: 24, left: 24 },
        'bottom-center': { bottom: 24, alignSelf: 'center' }
    };
    
    return (
        <Pressable
            style={[
                styles.fab,
                extended ? styles.fabExtended : styles.fabCircular,
                positionStyles[position]
            ]}
            {...props}
        >
            {Icon && (
                <Icon 
                    size={24} 
                    color="#FFFFFF" 
                    style={extended && children ? styles.fabIconWithText : undefined}
                />
            )}
            {extended && children && (
                <Text style={styles.fabText}>{children}</Text>
            )}
        </Pressable>
    );
};
```

## Platform-Specific Adaptations

### iOS Implementation

```typescript
const IOSButton: React.FC<ButtonProps> = ({ onPress, children, ...props }) => {
    const handlePress = () => {
        // iOS-specific haptic feedback
        HapticFeedback.impactAsync(HapticFeedback.ImpactFeedbackStyle.Light);
        onPress?.();
    };

    return (
        <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.iosPressed, // iOS-specific pressed state
                // iOS blur effect for glass morphism
                props.variant === 'ghost' && styles.iosGlassEffect
            ]}
            {...props}
        >
            {children}
        </Pressable>
    );
};
```

### Android Implementation

```typescript
const AndroidButton: React.FC<ButtonProps> = ({ ...props }) => {
    return (
        <Pressable
            style={[
                styles.button,
                // Material Design elevation
                props.variant === 'primary' && { elevation: 2 }
            ]}
            // Material ripple effect
            android_ripple={{ 
                color: 'rgba(139, 75, 127, 0.2)',
                borderless: false
            }}
            {...props}
        />
    );
};
```

### Web Implementation

```typescript
const WebButton: React.FC<ButtonProps> = ({ onPress, ...props }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    return (
        <Pressable
            onPress={onPress}
            onHoverIn={() => setIsHovered(true)}
            onHoverOut={() => setIsHovered(false)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={[
                styles.button,
                isHovered && styles.webHovered,
                isFocused && styles.webFocused
            ]}
            // Web-specific keyboard handling
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPress();
                }
            }}
            {...props}
        />
    );
};
```

## Accessibility Implementation

### Screen Reader Support

```typescript
const AccessibleButton: React.FC<ButtonProps> = ({
    children,
    loading,
    disabled,
    accessibilityLabel,
    accessibilityHint,
    ...props
}) => {
    const getAccessibilityLabel = () => {
        if (accessibilityLabel) return accessibilityLabel;
        if (typeof children === 'string') return children;
        return 'Button';
    };
    
    const getAccessibilityState = () => ({
        disabled: disabled || loading,
        busy: loading
    });
    
    const getAccessibilityHint = () => {
        if (accessibilityHint) return accessibilityHint;
        if (loading) return 'Please wait, action in progress';
        if (disabled) return 'Button is currently disabled';
        return undefined;
    };
    
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={getAccessibilityLabel()}
            accessibilityHint={getAccessibilityHint()}
            accessibilityState={getAccessibilityState()}
            // Ensure proper focus for keyboard navigation
            focusable={!disabled && !loading}
            {...props}
        >
            {children}
        </Pressable>
    );
};
```

### High Contrast Support

```typescript
const useHighContrastStyles = () => {
    const colorScheme = useColorScheme();
    const isHighContrast = useAccessibilityInfo().isHighContrastEnabled;
    
    if (!isHighContrast) return {};
    
    return {
        primary: {
            backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
            color: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
            borderWidth: 2,
            borderColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF'
        },
        secondary: {
            backgroundColor: 'transparent',
            color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
            borderWidth: 3,
            borderColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000'
        }
    };
};
```

## Animation and Micro-interactions

### Button Press Animation

```typescript
const useButtonAnimation = () => {
    const scaleValue = useRef(new Animated.Value(1)).current;
    
    const animatePress = () => {
        Animated.sequence([
            Animated.timing(scaleValue, {
                toValue: 0.96,
                duration: 100,
                useNativeDriver: true
            }),
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true
            })
        ]).start();
    };
    
    return {
        scaleValue,
        animatePress
    };
};
```

### Loading State Animation

```typescript
const LoadingSpinner: React.FC<{ color: string }> = ({ color }) => {
    const rotationValue = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(rotationValue, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true
            })
        );
        
        animation.start();
        
        return () => animation.stop();
    }, [rotationValue]);
    
    const rotation = rotationValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });
    
    return (
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <LoadingIcon color={color} size={16} />
        </Animated.View>
    );
};
```

## Testing and Quality Assurance

### Component Testing

```typescript
describe('Button Component', () => {
    it('renders primary variant correctly', () => {
        const { getByRole } = render(
            <Button variant="primary" onPress={jest.fn()}>
                Add to Watchlist
            </Button>
        );
        
        const button = getByRole('button');
        expect(button).toBeTruthy();
        expect(button.props.children).toBe('Add to Watchlist');
    });
    
    it('handles disabled state correctly', () => {
        const onPressMock = jest.fn();
        const { getByRole } = render(
            <Button disabled onPress={onPressMock}>
                Disabled Button
            </Button>
        );
        
        const button = getByRole('button');
        fireEvent.press(button);
        expect(onPressMock).not.toHaveBeenCalled();
        expect(button.props.accessibilityState.disabled).toBe(true);
    });
    
    it('shows loading state correctly', () => {
        const { getByRole } = render(
            <Button loading onPress={jest.fn()}>
                Loading Button
            </Button>
        );
        
        const button = getByRole('button');
        expect(button.props.accessibilityState.busy).toBe(true);
    });
});
```

### Manual Testing Checklist

**Visual Appearance**:
- [ ] All button variants display correctly across themes
- [ ] State changes (hover, active, focus) are visually distinct
- [ ] Loading states show appropriate animation
- [ ] Disabled states are clearly distinguishable
- [ ] Icon placement and sizing correct for all sizes

**Interaction Testing**:
- [ ] Buttons respond to touch/click appropriately
- [ ] Haptic feedback works on mobile platforms
- [ ] Keyboard navigation functions correctly
- [ ] Focus indicators meet accessibility standards
- [ ] Loading state prevents multiple activations

**Accessibility Validation**:
- [ ] Screen reader announces button labels correctly
- [ ] Button states communicated to assistive technology
- [ ] Keyboard navigation reaches all buttons
- [ ] High contrast mode supported
- [ ] Touch targets meet minimum size requirements (44px)

## Performance Optimization

### Button Memoization

```typescript
const Button = React.memo<ButtonProps>(
    ({ children, onPress, variant, size, disabled, loading, ...props }) => {
        const memoizedStyle = useMemo(() => [
            styles.base,
            styles[variant || 'primary'],
            styles[size || 'md'],
            disabled && styles.disabled,
            loading && styles.loading
        ], [variant, size, disabled, loading]);
        
        const handlePress = useCallback(() => {
            if (!disabled && !loading) {
                onPress();
            }
        }, [onPress, disabled, loading]);
        
        return (
            <Pressable
                onPress={handlePress}
                style={memoizedStyle}
                {...props}
            >
                {children}
            </Pressable>
        );
    },
    (prevProps, nextProps) => {
        return (
            prevProps.variant === nextProps.variant &&
            prevProps.size === nextProps.size &&
            prevProps.disabled === nextProps.disabled &&
            prevProps.loading === nextProps.loading &&
            prevProps.children === nextProps.children
        );
    }
);
```

This comprehensive button system provides the foundation for all interactive elements in the True Crime app, ensuring consistency, accessibility, and appropriate visual treatment for the sensitive nature of the content.