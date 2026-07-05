import React, { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import { useAppSelector } from '@/hooks/useAppSelector';
import { useBootstrap } from '@/hooks/useBootstrap';
import { SplashScreen } from '@/screens/SplashScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

/**
 * Top-level decision tree:
 *  - Bootstrap not done → animated SplashScreen
 *  - First launch → OnboardingScreen
 *  - No token → AuthNavigator
 *  - Token valid → MainNavigator
 */
export const RootNavigator: React.FC = () => {
  const { ready } = useBootstrap();
  const { isLoggedIn, hasOnboarded, isHydrated } = useAppSelector(
    state => state.auth,
  );

  // Hide native bootsplash as soon as JS mounts so our animated splash takes over
  useEffect(() => {
    BootSplash.hide({ fade: true }).catch(() => {});
  }, []);

  if (!ready || !isHydrated) {
    return <SplashScreen />;
  }

  if (!hasOnboarded) {
    return <OnboardingScreen />;
  }

  if (!isLoggedIn) {
    return <AuthNavigator />;
  }

  return <MainNavigator />;
};
