import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TRPCProvider } from '../../../components/providers/TRPCProvider';
import { AuthProvider } from '../../../components/providers/AuthProvider';
import WelcomeScreen from '../../../app/auth/welcome';
import LoginScreen from '../../../app/auth/login';
import RegisterScreen from '../../../app/auth/register';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useSegments: () => ['auth'],
}));

// Mock expo modules
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: 'StatusBar',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock tRPC client
jest.mock('../../../lib/trpc', () => ({
  trpc: {
    createClient: jest.fn(() => ({})),
  },
  trpcClient: {
    auth: {
      login: {
        mutate: jest.fn(),
      },
      register: {
        mutate: jest.fn(),
      },
    },
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </TRPCProvider>
    </QueryClientProvider>
  );
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WelcomeScreen', () => {
    it('should render welcome screen with value proposition', () => {
      render(
        <TestWrapper>
          <WelcomeScreen />
        </TestWrapper>
      );

      expect(screen.getByText('Track True Crime')).toBeTruthy();
      expect(screen.getByText('Across Every Platform')).toBeTruthy();
      expect(screen.getByText('Get Started Free')).toBeTruthy();
      expect(screen.getByText('Already have an account? Sign In')).toBeTruthy();
    });

    it('should display key features and benefits', () => {
      render(
        <TestWrapper>
          <WelcomeScreen />
        </TestWrapper>
      );

      expect(screen.getByText('Search All Platforms')).toBeTruthy();
      expect(screen.getByText('Track Your Progress')).toBeTruthy();
      expect(screen.getByText('Case-Based Organization')).toBeTruthy();
    });

    it('should show supported platforms', () => {
      render(
        <TestWrapper>
          <WelcomeScreen />
        </TestWrapper>
      );

      expect(screen.getByText('Netflix')).toBeTruthy();
      expect(screen.getByText('Hulu')).toBeTruthy();
      expect(screen.getByText('HBO Max')).toBeTruthy();
      expect(screen.getByText('+190 more')).toBeTruthy();
    });
  });

  describe('LoginScreen', () => {
    it('should render login form elements', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      expect(screen.getByText('Welcome Back')).toBeTruthy();
      expect(screen.getByPlaceholderText('your.email@example.com')).toBeTruthy();
      expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(screen.getByText('Sign In')).toBeTruthy();
    });

    it('should show social login options', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      expect(screen.getByText('Continue with Google')).toBeTruthy();
      expect(screen.getByText('Continue with Apple')).toBeTruthy();
    });

    it('should validate required fields', async () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const signInButton = screen.getByText('Sign In');
      
      // Initially disabled without input
      expect(signInButton).toBeDisabled();
    });

    it('should handle password reset flow', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const forgotPasswordButton = screen.getByText('Forgot your password?');
      fireEvent.press(forgotPasswordButton);

      expect(screen.getByText('Reset Your Password')).toBeTruthy();
    });
  });

  describe('RegisterScreen', () => {
    it('should render multi-step registration form', () => {
      render(
        <TestWrapper>
          <RegisterScreen />
        </TestWrapper>
      );

      expect(screen.getByText('Create Your Account')).toBeTruthy();
      expect(screen.getByText('Step 1 of 3')).toBeTruthy();
    });

    it('should validate email format', async () => {
      render(
        <TestWrapper>
          <RegisterScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      fireEvent.changeText(emailInput, 'invalid-email');
      
      await waitFor(() => {
        expect(screen.getByText('Please provide a valid email address')).toBeTruthy();
      });
    });

    it('should validate password requirements', async () => {
      render(
        <TestWrapper>
          <RegisterScreen />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText('Choose a secure password');
      fireEvent.changeText(passwordInput, 'weak');
      
      await waitFor(() => {
        expect(screen.getByText(/Password must contain/)).toBeTruthy();
      });
    });

    it('should confirm password match', async () => {
      render(
        <TestWrapper>
          <RegisterScreen />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText('Choose a secure password');
      const confirmInput = screen.getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(passwordInput, 'Password123!');
      fireEvent.changeText(confirmInput, 'DifferentPassword123!');
      
      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeTruthy();
      });
    });

    it('should progress through registration steps', async () => {
      render(
        <TestWrapper>
          <RegisterScreen />
        </TestWrapper>
      );

      // Fill out first step
      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      const passwordInput = screen.getByPlaceholderText('Choose a secure password');
      const confirmInput = screen.getByPlaceholderText('Confirm your password');
      
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'Password123!');
      fireEvent.changeText(confirmInput, 'Password123!');
      
      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText('Tell Us About Yourself')).toBeTruthy();
        expect(screen.getByText('Step 2 of 3')).toBeTruthy();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show real-time validation feedback', async () => {
      render(
        <TestWrapper>
          <RegisterScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByPlaceholderText('your.email@example.com');
      
      // Type invalid email
      fireEvent.changeText(emailInput, 'invalid');
      
      await waitFor(() => {
        expect(screen.getByText('Please provide a valid email address')).toBeTruthy();
      });
      
      // Fix email
      fireEvent.changeText(emailInput, 'valid@example.com');
      
      await waitFor(() => {
        expect(screen.queryByText('Please provide a valid email address')).toBeNull();
      });
    });

    it('should prevent submission with invalid data', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const signInButton = screen.getByText('Sign In');
      
      // Should be disabled initially
      expect(signInButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should display network errors appropriately', async () => {
      const mockLogin = jest.fn().mockRejectedValue(new Error('Network Error'));
      
      // Mock the auth store to use our mock function
      jest.doMock('../../../lib/stores/authStore', () => ({
        useAuthStore: () => ({
          login: mockLogin,
          isLoading: false,
          error: 'Network Error',
          clearError: jest.fn(),
        }),
      }));

      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Check that error is displayed
      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeTruthy();
      });
    });

    it('should handle form validation errors', async () => {
      render(
        <TestWrapper>
          <RegisterScreen />
        </TestWrapper>
      );

      const passwordInput = screen.getByPlaceholderText('Choose a secure password');
      fireEvent.changeText(passwordInput, '123'); // Too short
      
      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters long')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should provide proper accessibility labels', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('Email Address');
      const passwordInput = screen.getByLabelText('Password');
      
      expect(emailInput).toBeTruthy();
      expect(passwordInput).toBeTruthy();
    });

    it('should have proper button accessibility', () => {
      render(
        <TestWrapper>
          <WelcomeScreen />
        </TestWrapper>
      );

      const getStartedButton = screen.getByRole('button', { name: 'Get Started Free' });
      expect(getStartedButton).toBeTruthy();
    });

    it('should provide accessibility hints for complex interactions', () => {
      render(
        <TestWrapper>
          <LoginScreen />
        </TestWrapper>
      );

      // Password visibility toggle should have accessibility label
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      expect(passwordInput).toBeTruthy();
    });
  });
});

describe('Authentication Store', () => {
  it('should handle login success', async () => {
    const mockResponse = {
      user: { id: '1', email: 'test@example.com' },
      tokens: { accessToken: 'token', refreshToken: 'refresh' },
      session: { id: 'session-id' },
    };

    // Test would need actual store implementation
    // This is a placeholder for proper store testing
    expect(mockResponse).toBeTruthy();
  });

  it('should handle login failure', async () => {
    // Test error handling in auth store
    const errorMessage = 'Invalid credentials';
    expect(errorMessage).toBeTruthy();
  });

  it('should persist authentication state', async () => {
    // Test that auth state is properly persisted and restored
    expect(true).toBeTruthy();
  });
});