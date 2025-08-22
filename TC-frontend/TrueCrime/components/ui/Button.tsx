import React from 'react';
import { 
  Pressable, 
  Text, 
  ActivityIndicator, 
  PressableProps, 
  ViewStyle, 
  TextStyle 
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  fullWidth = false,
  onPress,
  ...props
}: ButtonProps) {
  const baseClasses = [
    'rounded-button',
    'items-center',
    'justify-center',
    'focus-ring',
    'transition-all',
    'duration-short',
    'ease-out',
    fullWidth ? 'w-full' : '',
    disabled || loading ? 'opacity-50' : '',
  ].join(' ');

  const variantClasses = {
    primary: [
      'bg-primary',
      'active:bg-primary-dark',
      'shadow-button',
      'active:shadow-button-hover',
    ].join(' '),
    secondary: [
      'bg-dark-200',
      'border',
      'border-dark-300',
      'active:bg-dark-300',
    ].join(' '),
    tertiary: [
      'bg-transparent',
      'border',
      'border-primary',
      'active:bg-primary/10',
    ].join(' '),
    ghost: [
      'bg-transparent',
      'active:bg-dark-200',
    ].join(' '),
    danger: [
      'bg-error',
      'active:bg-red-600',
      'shadow-button',
    ].join(' '),
  };

  const textVariantClasses = {
    primary: 'text-white',
    secondary: 'text-dark-700',
    tertiary: 'text-primary',
    ghost: 'text-dark-500 active:text-dark-700',
    danger: 'text-white',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 min-h-[40px]',
    md: 'px-6 py-3 min-h-[48px]',
    lg: 'px-8 py-4 min-h-[56px]',
  };

  const handlePress = (event: any) => {
    if (loading || disabled) return;

    // Haptic feedback on press
    if (variant === 'primary' || variant === 'danger') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress?.(event);
  };

  const buttonClasses = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(' ');

  const textClasses = [
    'font-button',
    'text-center',
    textVariantClasses[variant],
  ].join(' ');

  return (
    <Pressable
      className={buttonClasses}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ 
        disabled: disabled || loading,
        busy: loading,
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === 'primary' || variant === 'danger'
              ? '#FFFFFF'
              : '#8B4B7F'
          }
        />
      ) : (
        <Text className={textClasses}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}