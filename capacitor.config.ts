import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.constructionmanagement.app',
  appName: 'Insaat Takip',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerStyle: "small"
    }
  },
  // Enable session persistence across app launches
  ios: {
    preferredContentMode: 'mobile'
  },
  android: {
    preferredContentMode: 'mobile'
  }
};

export default config;
