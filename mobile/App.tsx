import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { WebSocketProvider } from './src/context/WebSocketContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#060611' }}>
        <StatusBar style="light" />
        <AuthProvider>
          <WebSocketProvider>
            <AppNavigator />
          </WebSocketProvider>
        </AuthProvider>
      </View>
    </SafeAreaProvider>
  );
}

