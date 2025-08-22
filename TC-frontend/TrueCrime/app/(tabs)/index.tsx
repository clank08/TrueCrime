import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🔍 TrueCrime</Text>
          <Text style={styles.subtitle}>Your True Crime Content Hub</Text>
        </View>
        
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome Back!</Text>
          <Text style={styles.welcomeText}>
            Discover and track True Crime content across 200+ streaming platforms
          </Text>
        </View>
        
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔍</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Content Discovery</Text>
              <Text style={styles.featureText}>Search across Netflix, Hulu, Prime Video, and 200+ more platforms</Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📋</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Watchlist Management</Text>
              <Text style={styles.featureText}>Keep track of what you want to watch and your progress</Text>
            </View>
          </View>
          
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎬</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Platform Availability</Text>
              <Text style={styles.featureText}>Real-time streaming availability with direct links</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.actionText}>
            • Tap "Discover" to search for True Crime content{'\n'}
            • Browse trending documentaries and series{'\n'}
            • Track your viewing progress and build watchlists
          </Text>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1C',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#EAEAF4',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#8A8A94',
    textAlign: 'center',
  },
  welcomeCard: {
    backgroundColor: '#2C2C30',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderColor: '#8B4B7F',
    borderWidth: 1,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EAEAF4',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#8A8A94',
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#EAEAF4',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: '#2C2C30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
    marginTop: 4,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EAEAF4',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#8A8A94',
    lineHeight: 20,
  },
  quickActions: {
    backgroundColor: '#2C2C30',
    borderRadius: 12,
    padding: 20,
  },
  actionText: {
    fontSize: 16,
    color: '#8A8A94',
    lineHeight: 24,
  },
});
