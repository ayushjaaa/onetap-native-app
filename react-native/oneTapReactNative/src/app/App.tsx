import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { store } from './store';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { toastConfig } from '@/components/common/ToastConfig';

export const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <ErrorBoundary>
            <NavigationContainer>
              <OfflineBanner />
              <RootNavigator />
            </NavigationContainer>
            <Toast config={toastConfig} />
          </ErrorBoundary>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
