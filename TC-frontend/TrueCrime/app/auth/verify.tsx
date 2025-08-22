import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { trpc } from '@/lib/trpc';

export default function VerifyScreen() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyMutation = trpc.auth.verifyEmail.useMutation();

  const handleVerify = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter your verification token');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyMutation.mutateAsync({
        token: token.trim(),
      });
      
      console.log('Verification successful:', result.message);
      
      setLoading(false);
      
      // Show success message and redirect to login
      Alert.alert(
        'Email Verified!', 
        'Your email has been verified successfully. You can now sign in.',
        [{ text: 'Sign In', onPress: () => router.replace('/auth/login') }]
      );
      
      // Auto-redirect after 2 seconds in case alert doesn't show
      setTimeout(() => {
        router.replace('/auth/login');
      }, 2000);
      
    } catch (error) {
      setLoading(false);
      console.error('Verification error:', error);
      
      if (error instanceof Error) {
        Alert.alert('Verification Failed', error.message);
      } else {
        Alert.alert('Verification Failed', 'Invalid or expired verification token. Please check your email or try registering again.');
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Verify Your Email</Text>
        
        <Text style={styles.subtitle}>
          We've sent a verification token to your email address. Please enter it below to verify your account.
        </Text>
        
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Verification Token</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Enter verification token from your email"
              placeholderTextColor="#6A6A74"
              autoCapitalize="none"
              multiline={true}
              numberOfLines={3}
            />
          </View>
          
          <Pressable 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleVerify}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify Email'}
            </Text>
          </Pressable>
          
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>
              Didn't receive the email? Check your spam folder or try registering again.
            </Text>
            
            <Pressable 
              style={styles.linkButton}
              onPress={() => router.push('/auth/register')}
            >
              <Text style={styles.linkText}>Register Again</Text>
            </Pressable>
            
            <Pressable 
              style={styles.linkButton}
              onPress={() => router.push('/auth/login')}
            >
              <Text style={styles.linkText}>Back to Sign In</Text>
            </Pressable>
          </View>
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
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#B4B4C0',
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 22,
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
    fontSize: 14,
    color: '#EAEAF4',
    textAlignVertical: 'top',
    minHeight: 80,
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
  helpContainer: {
    marginTop: 30,
    alignItems: 'center',
    gap: 12,
  },
  helpText: {
    color: '#B4B4C0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: '#8B4B7F',
    fontSize: 16,
    fontWeight: '500',
  },
});