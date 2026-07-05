import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Screen } from '@/components/common/Screen';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Header } from '@/components/common/Header';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { SocialButton } from '@/components/auth/SocialButton';
import { loginSchema, type LoginFormData } from '@/utils/schemas';
import { trimEmail } from '@/utils/formatters';
import { useToast } from '@/hooks/useToast';
import { useLoginMutation, useGoogleSignInMutation } from '@/api/authApi';
import { mapApiError } from '@/utils/errorMapper';
import { useAppDispatch } from '@/hooks/useAppDispatch';
import { setCredentials } from '@/store/authSlice';
import { secureStorage } from '@/services/secureStorage';
import { googleAuth } from '@/services/googleAuth';
import { colors, spacing, typography } from '@/theme';
import type { AuthStackParamList } from '@/types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const [login, { isLoading: loggingIn }] = useLoginMutation();
  const [googleSignInApi, { isLoading: googling }] =
    useGoogleSignInMutation();
  const [googleBusy, setGoogleBusy] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, touchedFields, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = async (values: LoginFormData) => {
    const payload = {
      email: trimEmail(values.email),
      password: values.password,
    };
    console.log('[LOGIN] request payload:', JSON.stringify(payload, null, 2));

    try {
      const res = await login(payload).unwrap();
      console.log('[LOGIN] success response:', JSON.stringify(res, null, 2));

      navigation.navigate('Phone', {
        email: payload.email,
        password: payload.password,
        user: res.data.user,
        token: res.data.token,
      });
    } catch (err) {
      console.log('[LOGIN] error response:', JSON.stringify(err, null, 2));
      const mapped = mapApiError(err as never);
      toast.error({ title: 'Login failed', message: mapped.message });
    }
  };

  const handleForgot = () => {
    navigation.navigate('ForgotPasswordPhone');
  };

  const handleGoogle = async () => {
    if (googleBusy || googling) return;
    setGoogleBusy(true);
    console.log('[GOOGLE] handleGoogle started');
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

      // New Google user (no phone yet) → same Phone+OTP flow as manual login
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
      // Backend rejected the idToken or network/server error — clean retry
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

  const handleCreateAccount = () => {
    navigation.navigate('SignUpName');
  };

  return (
    <Screen scrollable>
      <Header onBack={() => navigation.goBack()} />

      <View style={styles.titleBlock}>
        <Text style={styles.welcome}>Welcome back</Text>
        <Text style={styles.title}>Sign In</Text>
      </View>

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Email"
            placeholder="Enter your email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            error={errors.email?.message}
            successMessage={
              touchedFields.email && !errors.email && value.length > 0
                ? 'Valid email'
                : undefined
            }
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
          />
        )}
      />

      <Pressable
        onPress={handleForgot}
        style={({ pressed }) => [styles.forgotBtn, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Text style={styles.forgotText}>Forgot password?</Text>
      </Pressable>

      <View style={styles.actionGap} />

      <Button
        title="Sign In"
        onPress={handleSubmit(onSubmit)}
        disabled={!isValid || loggingIn}
        loading={loggingIn}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <Button
        title="Create Account"
        variant="outline"
        onPress={handleCreateAccount}
      />

      {/* Hidden temporarily — Google OAuth Android client SHA-1/package
          mismatch in Google Cloud Console. Re-enable once fixed. */}
      {/* <View style={styles.gap} />

      <SocialButton
        provider="google"
        onPress={handleGoogle}
        loading={googleBusy || googling}
        disabled={loggingIn || googleBusy || googling}
      /> */}
    </Screen>
  );
};

const styles = StyleSheet.create({
  titleBlock: {
    marginTop: spacing.lg,
    marginBottom: spacing['2xl'],
  },
  welcome: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  forgotText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  actionGap: {
    height: spacing.lg,
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
  skipText: {
    ...typography.caption,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
