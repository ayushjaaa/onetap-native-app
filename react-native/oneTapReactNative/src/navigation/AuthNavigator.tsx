import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/types/navigation.types';

import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { PhoneScreen } from '@/screens/auth/PhoneScreen';
import { OtpScreen } from '@/screens/auth/OtpScreen';
import { ForgotPasswordPhoneScreen } from '@/screens/auth/ForgotPasswordPhoneScreen';
import { ForgotPasswordOtpScreen } from '@/screens/auth/ForgotPasswordOtpScreen';
import { ForgotPasswordResetScreen } from '@/screens/auth/ForgotPasswordResetScreen';
import { SignupProvider } from '@/screens/auth/signup/SignupContext';
import { SignUpStep1NameScreen } from '@/screens/auth/signup/SignUpStep1NameScreen';
import { SignUpStep2EmailScreen } from '@/screens/auth/signup/SignUpStep2EmailScreen';
import { SignUpStep3PasswordScreen } from '@/screens/auth/signup/SignUpStep3PasswordScreen';
import { SignUpStep4LocationScreen } from '@/screens/auth/signup/SignUpStep4LocationScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <SignupProvider>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />

        {/* Login flow */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Phone" component={PhoneScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />

        {/* Forgot password flow */}
        <Stack.Screen
          name="ForgotPasswordPhone"
          component={ForgotPasswordPhoneScreen}
        />
        <Stack.Screen
          name="ForgotPasswordOtp"
          component={ForgotPasswordOtpScreen}
        />
        <Stack.Screen
          name="ForgotPasswordReset"
          component={ForgotPasswordResetScreen}
        />

        {/* Signup flow */}
        <Stack.Screen name="SignUpName" component={SignUpStep1NameScreen} />
        <Stack.Screen name="SignUpEmail" component={SignUpStep2EmailScreen} />
        <Stack.Screen
          name="SignUpPassword"
          component={SignUpStep3PasswordScreen}
        />
        <Stack.Screen
          name="SignUpLocation"
          component={SignUpStep4LocationScreen}
        />
      </Stack.Navigator>
    </SignupProvider>
  );
};
