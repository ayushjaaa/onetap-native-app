import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  noPadding?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  noPadding = false,
  style,
  contentContainerStyle,
  keyboardAvoiding = true,
}) => {
  const padding = noPadding ? 0 : spacing.lg;

  const Container = scrollable ? ScrollView : View;
  const containerProps = scrollable
    ? {
        keyboardShouldPersistTaps: 'handled' as const,
        showsVerticalScrollIndicator: false,
        contentContainerStyle: [
          { padding, flexGrow: 1 },
          contentContainerStyle,
        ],
      }
    : { style: [{ padding, flex: 1 }, contentContainerStyle] };

  const content = (
    <Container {...(containerProps as object)}>{children}</Container>
  );

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
        translucent={false}
      />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
});
