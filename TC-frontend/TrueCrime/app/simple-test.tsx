import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';

export default function SimpleTest() {
  const [email, setEmail] = useState('test@truecrime.app');
  const [password, setPassword] = useState('Password123!');
  const [result, setResult] = useState<string>('Ready to test...');
  const [loading, setLoading] = useState(false);

  const testBackendHealth = async () => {
    setLoading(true);
    setResult('Testing backend health...');
    
    try {
      const response = await fetch('http://localhost:3000/health');
      const data = await response.json();
      
      if (response.ok) {
        setResult(`✅ Backend Health: ${data.status}
Services:
- Database: ${data.services.database}
- Redis: ${data.services.redis}
- Search: ${data.services.search}
- Storage: ${data.services.storage}

Uptime: ${Math.round(data.metrics.uptime)}s
Memory: ${Math.round(data.metrics.memoryUsage)}MB`);
      } else {
        setResult(`❌ Health check failed: ${response.status}`);
      }
    } catch (error: any) {
      setResult(`❌ Connection failed: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testRegistration = async () => {
    setLoading(true);
    setResult('Testing user registration...');
    
    try {
      const response = await fetch('http://localhost:3000/api/trpc/auth.register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            email,
            password,
            firstName: 'Test',
            lastName: 'User',
            displayName: 'Test User'
          }
        }),
      });
      
      const data = await response.text();
      
      setResult(`📝 Registration Test:
Status: ${response.status}
Response: ${data.substring(0, 800)}...`);
      
    } catch (error: any) {
      setResult(`❌ Registration failed: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testLogin = async () => {
    setLoading(true);
    setResult('Testing user login...');
    
    try {
      const response = await fetch('http://localhost:3000/api/trpc/auth.login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            email,
            password,
            rememberMe: true
          }
        }),
      });
      
      const data = await response.text();
      
      setResult(`🔐 Login Test:
Status: ${response.status}
Response: ${data.substring(0, 800)}...`);
      
    } catch (error: any) {
      setResult(`❌ Login failed: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🧪 True Crime API Integration Test</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Credentials</Text>
          
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter test email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <Text style={styles.label}>Password:</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter test password"
            secureTextEntry
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.healthButton]} 
            onPress={testBackendHealth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '🔄 Testing...' : '🏥 Test Backend Health'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.registerButton]} 
            onPress={testRegistration}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '🔄 Testing...' : '📝 Test Registration API'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.loginButton]} 
            onPress={testLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? '🔄 Testing...' : '🔐 Test Login API'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>📊 Test Results:</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>🔗 Connection Info:</Text>
          <Text style={styles.infoText}>
            Backend: http://localhost:3000{'\n'}
            Frontend: http://localhost:8092{'\n'}
            tRPC Base: /api/trpc{'\n'}
            Auth Endpoints: auth.register, auth.login{'\n'}
            Status: Ready for testing 🚀
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1C',
  },
  content: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EAEAF4',
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4B7F',
    marginBottom: 15,
  },
  label: {
    color: '#8A8A94',
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#2C2C30',
    color: '#EAEAF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A52',
    fontSize: 16,
  },
  buttonContainer: {
    marginBottom: 25,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  healthButton: {
    backgroundColor: '#4CAF50',
  },
  registerButton: {
    backgroundColor: '#8B4B7F',
  },
  loginButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultSection: {
    backgroundColor: '#2C2C30',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4A4A52',
  },
  resultTitle: {
    color: '#8B4B7F',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultText: {
    color: '#EAEAF4',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
  },
  infoSection: {
    backgroundColor: '#2C2C30',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A52',
  },
  infoTitle: {
    color: '#8B4B7F',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    color: '#8A8A94',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
});