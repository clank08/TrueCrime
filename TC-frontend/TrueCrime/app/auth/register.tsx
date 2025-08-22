import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { trpc } from '@/lib/trpc';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const registerMutation = trpc.auth.register.useMutation();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    // Check password complexity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      Alert.alert('Error', 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return;
    }

    setLoading(true);
    try {
      const result = await registerMutation.mutateAsync({
        email: email.toLowerCase().trim(),
        password,
      });
      
      console.log('Registration successful:', result.user.email);
      
      setLoading(false);
      
      // Show success message and redirect to verification
      Alert.alert(
        'Account Created!', 
        'Please check your email for a verification token to activate your account.', 
        [{ text: 'Verify Email', onPress: () => router.replace('/auth/verify') }]
      );
      
      // Auto-redirect to verification screen after 2 seconds in case alert doesn't show
      setTimeout(() => {
        router.replace('/auth/verify');
      }, 2000);
      
    } catch (error) {
      setLoading(false);
      console.error('Registration error:', error);
      
      if (error instanceof Error) {
        Alert.alert('Registration Failed', error.message);
      } else {
        Alert.alert('Registration Failed', 'Please try again');
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Create Account</Text>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#6A6A74"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              placeholderTextColor="#6A6A74"
              secureTextEntry
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              placeholderTextColor="#6A6A74"
              secureTextEntry
            />
          </View>
          
          <Pressable 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </Pressable>
          
          <Pressable 
            style={styles.linkButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.linkText}>
              Already have an account? Sign In
            </Text>
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1C',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EAEAF4',
    marginBottom: 40,
    textAlign: 'center',
  },
  formContainer: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EAEAF4',
  },
  input: {
    backgroundColor: '#2C2C30',
    borderColor: '#4A4A52',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#EAEAF4',
  },
  button: {
    backgroundColor: '#8B4B7F',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: '#8B4B7F',
    fontSize: 16,
    fontWeight: '500',
  },
});