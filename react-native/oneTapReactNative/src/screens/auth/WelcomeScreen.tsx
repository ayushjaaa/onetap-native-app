import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { SocialButton } from '@/components/auth/SocialButton';
import { useToast } from '@/hooks/useToast';
import { useGoogleSignInMutation } from '@/api/authApi';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setCredentials } from '@/store/authSlice';
import { secureStorage } from '@/services/secureStorage';
import { googleAuth } from '@/services/googleAuth';
import { mapApiError } from '@/utils/errorMapper';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [googleSignInApi, { isLoading: googling }] =
    useGoogleSignInMutation();
  const [googleBusy, setGoogleBusy] = useState(false);

  const handleSignUp = () => {
    navigation.navigate('SignUpName');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleGoogle = async () => {
    if (googleBusy || googling) return;
    setGoogleBusy(true);
    console.log('[GOOGLE] handleGoogle started (Welcome)');
    try {
      const r = await googleAuth.signIn();
      console.log('[GOOGLE] signIn result.ok:', r.ok);

      if (!r.ok) {
        console.log('[GOOGLE] signIn failed:', r.code, '-', r.message);
        if (r.code === 'CANCELLED' || r.code === 'IN_PROGRESS') return;
        toast.error({ title: 'Google sign-in failed', message: r.message });
        return;
      }

      console.log(
        '[GOOGLE] calling backend /auth/google for',
        r.email,
        '- idToken length:',
        r.idToken.length,
      );
      const res = await googleSignInApi({ idToken: r.idToken }).unwrap();
      console.log(
        '[GOOGLE] backend success — needsLocation:',
        res.data.needsLocation,
        'has phone:',
        !!res.data.user.phone,
      );
      const { user, token, needsLocation } = res.data;

      // New Google user (no phone yet) → Phone+OTP flow
      if (!user.phone) {
        navigation.navigate('Phone', {
          email: user.email,
          user,
          token,
          fromGoogle: true,
          needsLocation,
        });
        return;
      }

      // Returning Google user — needs only location
      if (needsLocation) {
        navigation.navigate('SignUpLocation', {
          fromGoogle: true,
          user,
          token,
        });
        return;
      }

      // Returning Google user — fully onboarded → persist & enter app
      await secureStorage.saveToken(token);
      dispatch(setCredentials({ user, token }));
    } catch (err) {
      console.log(
        '[GOOGLE] BACKEND ERROR:',
        JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}), 2),
      );
      await googleAuth.signOut();
      const mapped = mapApiError(err as never);
      console.log('[GOOGLE] mapped error:', mapped);
      toast.error({
        title: 'Google sign-in failed',
        message: mapped.message,
      });
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <Screen scrollable>
      <View style={styles.logoBlock}>
        <View style={styles.logoCircle}>
          <Image
            source={require('@/assets/icons/img.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.brand}>
          OneTap<Text style={styles.brandAccent}>365</Text>
        </Text>
        <Text style={styles.tagline}>
          Buy, Sell, Discover – All in One Place!
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Sign In" onPress={handleLogin} />
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button
          title="Create Account"
          variant="outline"
          onPress={handleSignUp}
        />

        {/* Hidden temporarily — Google OAuth Android client SHA-1/package
            mismatch in Google Cloud Console. Re-enable once fixed. */}
        {/* <View style={styles.gap} />

        <SocialButton
          provider="google"
          onPress={handleGoogle}
          loading={googleBusy || googling}
          disabled={googleBusy || googling}
        /> */}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  logoBlock: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['2xl'],
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  brand: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  brandAccent: {
    color: colors.primary,
  },
  tagline: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    paddingTop: spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.base,
  },
  gap: {
    height: spacing.lg,
  },
  skipBtn: {
    alignSelf: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  skipText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
