import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { Input } from '@/components/common/Input';
import { colors } from '@/theme';

interface PasswordInputProps {
  value: string;  
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  successMessage?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  (
    {
      value,
      onChangeText,
      onBlur,
      error,
      successMessage,
      label,
      placeholder = 'Enter your password',
      required = false,
    },
    ref,
  ) => {
    const [hidden, setHidden] = useState(true);

    const ToggleIcon = hidden ? EyeOff : Eye;
    const toggleIcon = (
      <Pressable
        onPress={() => setHidden(prev => !prev)}
        hitSlop={12}
        style={({ pressed }) => [styles.eyeBtn, pressed && styles.pressed]}
      >
        <ToggleIcon size={20} color={colors.textSecondary} strokeWidth={2} />
      </Pressable>
    );

    return (
      <Input
        ref={ref}
        label={label}
        required={required}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        placeholder={placeholder}
        secureTextEntry={hidden}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        error={error}
        successMessage={successMessage}
        rightIcon={toggleIcon}
      />
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

const styles = StyleSheet.create({
  eyeBtn: {
    padding: 4,
  },
  pressed: {
    opacity: 0.6,
  },
});
