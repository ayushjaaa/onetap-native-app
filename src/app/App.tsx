import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Pressable, Text } from 'react-native';

import { store } from './store';
import { RootNavigator } from '@/navigation/RootNavigator';
import { navigationRef } from '@/navigation/navigationRef';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { toastConfig } from '@/components/common/ToastConfig';
import { initSentry, navigationIntegration, Sentry } from '@/config/sentry';
import { env } from '@/config/env';

initSentry();

// TEMP — Sentry wiring smoke test, remove after verifying dashboard receives events.
const SentryTestButton: React.FC = () => {
  if (env.isProd) return null;
  return (
    <Pressable
      onPress={() => {
        throw new Error('TEMP Sentry test crash — safe to ignore');
      }}
      style={{
        position: 'absolute',
        bottom: 40,
        right: 20,
        backgroundColor: 'red',
        padding: 12,
        borderRadius: 8,
        zIndex: 999,
      }}
    >
      <Text style={{ color: 'white' }}>Test Crash</Text>
    </Pressable>
  );
};

const AppRoot: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ErrorBoundary>
            <NavigationContainer
              ref={navigationRef}
              onReady={() =>
                navigationIntegration.registerNavigationContainer(navigationRef)
              }
            >
              <OfflineBanner />
              <RootNavigator />
            </NavigationContainer>
            <Toast config={toastConfig} />
            <SentryTestButton />
          </ErrorBoundary>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export const App = Sentry.wrap(AppRoot);

export default App;
