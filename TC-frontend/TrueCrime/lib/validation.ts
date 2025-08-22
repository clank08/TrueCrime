import { z } from 'zod';

// Common validation patterns
export const emailValidation = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

export const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const nameValidation = z
  .string()
  .max(50, 'Name must be less than 50 characters')
  .optional()
  .transform(val => val?.trim() || undefined);

export const displayNameValidation = z
  .string()
  .max(100, 'Display name must be less than 100 characters')
  .optional()
  .transform(val => val?.trim() || undefined);

// Enhanced validation schemas for forms
export const EnhancedLoginFormSchema = z.object({
  email: emailValidation,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const EnhancedRegisterFormSchema = z
  .object({
    email: emailValidation,
    password: passwordValidation,
    confirmPassword: z.string(),
    firstName: nameValidation,
    lastName: nameValidation,
    displayName: displayNameValidation,
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const PasswordResetFormSchema = z.object({
  email: emailValidation,
});

export const PasswordResetConfirmSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: passwordValidation,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Password strength checker
export function getPasswordStrength(password: string): {
  score: number;
  feedback: string[];
  color: string;
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length === 0) {
    return {
      score: 0,
      feedback: ['Password is required'],
      color: '#D32F2F',
    };
  }

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('At least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Lowercase letter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Uppercase letter');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Number');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  }

  // Common pattern penalties
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeated characters');
  }

  if (/123|abc|qwe/i.test(password)) {
    score -= 1;
    feedback.push('Avoid common sequences');
  }

  const maxScore = 6;
  const normalizedScore = Math.max(0, Math.min(maxScore, score));

  let color = '#D32F2F'; // Weak - Red
  if (normalizedScore >= 4) {
    color = '#F57C00'; // Medium - Orange
  }
  if (normalizedScore >= 5) {
    color = '#388E3C'; // Strong - Green
  }

  return {
    score: normalizedScore,
    feedback,
    color,
  };
}

// Email validation helper
export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Form error handling utilities
export function getFieldError(
  fieldName: string,
  errors: Record<string, any>
): string | undefined {
  return errors[fieldName]?.message;
}

export function hasFieldError(
  fieldName: string,
  errors: Record<string, any>
): boolean {
  return Boolean(errors[fieldName]);
}

export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};
  
  error.errors.forEach(err => {
    if (err.path.length > 0) {
      const fieldName = err.path[0].toString();
      formattedErrors[fieldName] = err.message;
    }
  });
  
  return formattedErrors;
}

// Network error handling
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

export function handleApiError(error: any): ApiError {
  // Handle different types of errors
  if (error?.data?.message) {
    return {
      message: error.data.message,
      code: error.data.code,
      field: error.data.field,
    };
  }

  if (error?.message) {
    return {
      message: error.message,
      code: error.code,
    };
  }

  // Network errors
  if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
    return {
      message: 'Network connection error. Please check your internet connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  // Timeout errors
  if (error?.name === 'TimeoutError' || error?.code === 'TIMEOUT') {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT',
    };
  }

  // Authentication errors
  if (error?.status === 401 || error?.code === 'UNAUTHORIZED') {
    return {
      message: 'Your session has expired. Please sign in again.',
      code: 'UNAUTHORIZED',
    };
  }

  // Server errors
  if (error?.status >= 500) {
    return {
      message: 'Server error. Please try again later.',
      code: 'SERVER_ERROR',
    };
  }

  // Default error
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
  };
}

export type {
  EnhancedLoginFormSchema as LoginFormData,
  EnhancedRegisterFormSchema as RegisterFormData,
  PasswordResetFormSchema as PasswordResetFormData,
  PasswordResetConfirmSchema as PasswordResetConfirmData,
};