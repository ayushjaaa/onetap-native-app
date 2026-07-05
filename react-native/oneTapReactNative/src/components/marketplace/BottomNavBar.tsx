import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
  Search,
  PlusCircle,
  Tag,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { colors, fontSize, layout, radius, spacing } from '@/theme';

export type NavTabKey = 'home' | 'search' | 'post' | 'myAds' | 'profile';

interface NavItem {
  key: NavTabKey;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'search', label: 'Search', icon: Search },
  { key: 'post', label: 'Sell', icon: PlusCircle },
  { key: 'myAds', label: 'My Ads', icon: Tag },
  { key: 'profile', label: 'Profile', icon: User },
];

export interface BottomNavBarProps {
  current: NavTabKey;
  onChange: (key: NavTabKey) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  current,
  onChange,
}) => {
  return (
    <View style={styles.wrapper}>
      <SafeAreaView edges={['bottom']} style={styles.safe}>
        <View style={styles.row}>
          {NAV_ITEMS.map(item => {
            const isActive = current === item.key;
            const Icon = item.icon;
            const isCenter = item.key === 'post';
            return (
              <Pressable
                key={item.key}
                onPress={() => onChange(item.key)}
                style={styles.tab}
                hitSlop={4}
              >
                {isCenter ? (
                  <View style={styles.centerCircle}>
                    <Icon size={layout.iconSize.lg} color={colors.white} />
                  </View>
                ) : (
                  <>
                    <Icon
                      size={layout.iconSize.base}
                      color={isActive ? colors.primary : colors.textMuted}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                    <Text
                      style={[
                        styles.label,
                        {
                          color: isActive ? colors.primary : colors.textMuted,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {item.label.toUpperCase()}
                    </Text>
                    {isActive ? <View style={styles.activeDot} /> : null}
                  </>
                )}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    borderTopWidth: 0.8,
    borderTopColor: colors.borderSubtle,
  },
  safe: {
    backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row',
    height: layout.navBarHeight,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  label: {
    fontSize: fontSize['2xs'],
    marginTop: spacing.xs,
    letterSpacing: 0.6,
  },
  activeDot: {
    position: 'absolute',
    top: 0,
    width: layout.navIndicatorWidth,
    height: layout.navIndicatorHeight,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
  },
  centerCircle: {
    width: layout.navFabSize,
    height: layout.navFabSize,
    borderRadius: layout.navFabSize / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.4,
    shadowRadius: spacing.sm,
    elevation: 6,
  },
});
