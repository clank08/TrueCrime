const { getDefaultConfig } = require('expo/metro-config');

// Get the default Metro configuration
const config = getDefaultConfig(__dirname);

// Enable CSS support for web (simplified)
config.resolver.platforms = ['native', 'web', 'ios', 'android'];

module.exports = config;