module.exports = {
  name: "price-tracker",
  slug: "price-tracker",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  extra: {
    // Add any extra configuration values here
  },
  plugins: [
    // Add any plugins here
  ],
  // Environment variables that will be available at runtime
  // These are prefixed with EXPO_PUBLIC_ to make them available in the app
  extra: {
    // Using the machine's IP address instead of localhost
    // This allows the app to connect to PocketBase when running on a physical device or emulator
    pocketbaseUrl: process.env.EXPO_PUBLIC_POCKETBASE_URL || "http://192.168.68.100:8090"
  }
};
