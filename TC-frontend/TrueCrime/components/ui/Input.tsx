import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  containerClassName?: string;
  isPassword?: boolean;
  required?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'default',
  size = 'md',
  className = '',
  containerClassName = '',
  isPassword = false,
  required = false,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const containerBaseClasses = 'w-full';
  
  const inputContainerClasses = [
    'flex-row',
    'items-center',
    'rounded-button',
    'border',
    'transition-colors',
    'duration-short',
    error 
      ? 'border-error bg-error/5' 
      : isFocused 
        ? 'border-primary' 
        : 'border-dark-300',
    variant === 'filled' ? 'bg-dark-100' : 'bg-transparent',
  ].join(' ');

  const sizeClasses = {
    sm: 'min-h-[40px] px-3',
    md: 'min-h-[48px] px-4',
    lg: 'min-h-[56px] px-5',
  };

  const inputClasses = [
    'flex-1',
    'font-body',
    'text-dark-700',
    'placeholder:text-dark-400',
    leftIcon ? 'ml-2' : '',
    rightIcon || isPassword ? 'mr-2' : '',
  ].join(' ');

  const iconColor = error 
    ? '#D32F2F' 
    : isFocused 
      ? '#8B4B7F' 
      : '#8A8A94';

  return (
    <View className={`${containerBaseClasses} ${containerClassName}`}>
      {label && (
        <View className="flex-row items-center mb-2">
          <Text className="font-label text-dark-600">
            {label}
          </Text>
          {required && (
            <Text className="text-error ml-1">*</Text>
          )}
        </View>
      )}
      
      <View className={`${inputContainerClasses} ${sizeClasses[size]}`}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={iconColor}
          />
        )}
        
        <TextInput
          ref={ref}
          className={`${inputClasses} ${className}`}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isPassword && !isPasswordVisible}
          placeholderTextColor="#8A8A94"
          selectionColor="#8B4B7F"
          {...props}
        />
        
        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="p-1"
            accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
            accessibilityRole="button"
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={20}
              color={iconColor}
            />
          </Pressable>
        )}
        
        {rightIcon && !isPassword && (
          <Pressable
            onPress={onRightIconPress}
            className="p-1"
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color={iconColor}
            />
          </Pressable>
        )}
      </View>
      
      {(error || helperText) && (
        <View className="mt-1">
          <Text
            className={`text-body-small ${
              error ? 'text-error' : 'text-dark-500'
            }`}
          >
            {error || helperText}
          </Text>
        </View>
      )}
    </View>
  );
});