import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';

export default function TestAPI() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('Password123!');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBackendConnection = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // Test basic health endpoint
      const healthResponse = await fetch('http://localhost:3000/health');
      const healthData = await healthResponse.json();
      
      if (healthResponse.ok) {
        setResult(`✅ Backend Health Check: ${healthData.status}\n` +
                  `Database: ${healthData.services.database}\n` +
                  `Redis: ${healthData.services.redis}\n` +
                  `Uptime: ${Math.round(healthData.metrics.uptime)}s`);
      } else {
        setResult('❌ Backend health check failed');
      }
    } catch (error) {
      setResult(`❌ Connection Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  const testTRPCRegistration = async () => {
    setLoading(true);
    setResult('');
    
    try {
      // Test tRPC registration endpoint
      const response = await fetch('http://localhost:3000/api/trpc/auth.register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
          firstName: 'Test',
          lastName: 'User',
          displayName: 'Test User',
        }),
      });

      const data = await response.text(); // Get raw response first
      setResult(`Status: ${response.status}\n` +
                `Response: ${data.substring(0, 500)}`);
      
    } catch (error) {
      setResult(`❌ tRPC Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 API Integration Test</Text>
      
      {/* Test Inputs */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Test Email:</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="test@example.com"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Test Password:</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password123!"
          secureTextEntry
        />
      </View>

      {/* Test Buttons */}
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#4CAF50' }]} 
        onPress={testBackendConnection}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '🔄 Testing...' : '🏥 Test Backend Health'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#8B4B7F' }]} 
        onPress={testTRPCRegistration}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? '🔄 Testing...' : '📝 Test User Registration'}
        </Text>
      </TouchableOpacity>

      {/* Results */}
      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>📊 Test Results:</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}

      {/* Backend Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Backend: http://localhost:3000{'\n'}
          tRPC Endpoint: /api/trpc{'\n'}
          Auth Registration: auth.register
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1A1A1C',
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EAEAF4',
    textAlign: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    color: '#8A8A94',
    fontSize: 14,
    marginBottom: 5,
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
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#2C2C30',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
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
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  infoContainer: {
    backgroundColor: '#2C2C30',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#4A4A52',
  },
  infoText: {
    color: '#8A8A94',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});