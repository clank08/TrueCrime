import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  className = '',
  ...props
}: CardProps) {
  const variantClasses = {
    default: 'bg-dark-100 shadow-card-dark',
    elevated: 'bg-dark-100 shadow-card-hover',
    outlined: 'bg-dark-100 border border-dark-300',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const cardClasses = [
    'rounded-card',
    variantClasses[variant],
    paddingClasses[padding],
    className,
  ].join(' ');

  return (
    <View className={cardClasses} {...props}>
      {children}
    </View>
  );
}