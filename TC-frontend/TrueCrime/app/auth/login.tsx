import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
import { trpc } from '@/lib/trpc';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const loginMutation = trpc.auth.login.useMutation();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await loginMutation.mutateAsync({
        email: email.toLowerCase().trim(),
        password,
      });
      
      // Store auth tokens (you might want to use secure storage)
      console.log('Login successful:', result.user.email);
      
      setLoading(false);
      router.replace('/(tabs)');
      
    } catch (error) {
      setLoading(false);
      console.error('Login error:', error);
      
      if (error instanceof Error) {
        // Check if error is about email verification
        if (error.message.toLowerCase().includes('email verification') || 
            error.message.toLowerCase().includes('verify')) {
          Alert.alert(
            'Email Verification Required',
            'Please verify your email address before signing in. Check your email for the verification token.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Verify Now', 
                onPress: () => router.push('/auth/verify')
              }
            ]
          );
        } else {
          Alert.alert('Login Failed', error.message);
        }
      } else {
        Alert.alert('Login Failed', 'Please check your credentials');
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sign In</Text>
        
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
              placeholder="Enter your password"
              placeholderTextColor="#6A6A74"
              secureTextEntry
            />
          </View>
          
          <Pressable 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </Pressable>
          
          <Pressable 
            style={styles.linkButton}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.linkText}>
              Don't have an account? Sign Up
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