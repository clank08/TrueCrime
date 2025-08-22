import { View, Text, StyleSheet } from 'react-native';
import { Link, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Check if user has valid authentication tokens
    const checkAuth = async () => {
      try {
        // Check localStorage for tokens (web) or AsyncStorage (mobile)
        const token = typeof window !== 'undefined' 
          ? localStorage.getItem('truecrime_access_token')
          : null;
        
        if (token) {
          // Basic token validation - check if not expired
          const payload = JSON.parse(atob(token.split('.')[1]));
          const isExpired = payload.exp * 1000 < Date.now();
          setIsAuthenticated(!isExpired);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  // Redirect to main app if authenticated
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  // Show welcome screen if not authenticated
  return (
    <View style={styles.container}>
      <Text style={styles.title}>True Crime App</Text>
      <Text style={styles.subtitle}>Discover True Crime Content</Text>
      
      <View style={[styles.linkContainer, { marginBottom: 16 }]}>
        <Link href="/auth/login" style={styles.link}>
          <Text style={styles.linkText}>Login</Text>
        </Link>
      </View>
      
      <View style={styles.linkContainer}>
        <Link href="/(tabs)" style={styles.link}>
          <Text style={styles.linkText}>Browse Content (Demo)</Text>
        </Link>
      </View>
      
      <Text style={styles.debug}>
        For testing, you can browse content directly or login with kellysmith8@yahoo.com
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1C',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: '#EAEAF4',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#8A8A94',
    marginBottom: 40,
  },
  linkContainer: {
    backgroundColor: '#8B4B7F',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 40,
  },
  link: {
    textDecorationLine: 'none',
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  debug: {
    fontSize: 12,
    color: '#6A6A74',
    textAlign: 'center',
    marginTop: 20,
  },
});