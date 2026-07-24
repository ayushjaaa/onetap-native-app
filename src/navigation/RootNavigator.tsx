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
 *  - Token valid but phone not verified → AuthNavigator, forced to Phone
 *  - Token valid and phone verified → MainNavigator
 */
export const RootNavigator: React.FC = () => {
  const { ready } = useBootstrap();
  const { isLoggedIn, hasOnboarded, isHydrated, user } = useAppSelector(
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

  // Re-checked on every launch (not just at login time) — a valid token alone
  // doesn't mean the phone is verified, and the backend gate (Gateway's /api/v1
  // middleware) will 403 every other endpoint until it is, so sending an
  // unverified user to MainNavigator would just strand them on broken screens.
  if (!user?.phoneVerified) {
    return <AuthNavigator initialRouteName="Phone" />;
  }

  return <MainNavigator />;
};
