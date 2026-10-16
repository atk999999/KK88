import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dbz.fusion.lab',
  appName: 'Dragon Ball Fusion Lab',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
