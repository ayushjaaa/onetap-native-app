import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  LucideIcon,
  Smartphone,
  Car,
  Home,
  Briefcase,
  Armchair,
  Shirt,
  Laptop,
  Volleyball,
  BookOpen,
  PawPrint,
  Zap,
  Wrench,
  Snowflake,
  SprayCan,
  Hammer,
  PaintBucket,
  ShoppingCart,
  UtensilsCrossed,
  Stethoscope,
  GraduationCap,
  Tag,
} from 'lucide-react-native';
import { colors, fontSize, layout, radius, spacing } from '@/theme';

const ICON_SIZE = layout.iconSize.lg;

const ICON_MAP: Record<string, LucideIcon> = {
  phone_iphone: Smartphone,
  directions_car: Car,
  home: Home,
  work: Briefcase,
  chair: Armchair,
  checkroom: Shirt,
  computer: Laptop,
  sports_soccer: Volleyball,
  book: BookOpen,
  pets: PawPrint,
  electric_bolt: Zap,
  plumbing: Wrench,
  ac_unit: Snowflake,
  cleaning_services: SprayCan,
  handyman: Hammer,
  format_paint: PaintBucket,
  shopping_cart: ShoppingCart,
  restaurant: UtensilsCrossed,
  local_hospital: Stethoscope,
  school: GraduationCap,
  category: Tag,
};

export interface CategoryCardProps {
  name: string;
  iconName?: string;
  iconUrl?: string;
  iconColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  iconName,
  iconUrl,
  iconColor = colors.primary,
  onPress,
  style,
}) => {
  const Icon = (iconName && ICON_MAP[iconName]) || resolveIconFromName(name);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.iconImg} />
        ) : (
          <Icon size={ICON_SIZE} color={iconColor} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name}
      </Text>
    </Pressable>
  );
};

const resolveIconFromName = (name: string): LucideIcon => {
  const n = name.toLowerCase();
  if (n.includes('mobile') || n.includes('phone')) return Smartphone;
  if (n.includes('vehicle') || n.includes('car')) return Car;
  if (n.includes('property') || n.includes('home') || n.includes('real estate'))
    return Home;
  if (n.includes('job') || n.includes('employment')) return Briefcase;
  if (n.includes('furniture')) return Armchair;
  if (n.includes('fashion') || n.includes('clothing')) return Shirt;
  if (n.includes('electronics') || n.includes('computer')) return Laptop;
  if (n.includes('sports') || n.includes('fitness')) return Volleyball;
  if (n.includes('books') || n.includes('education')) return BookOpen;
  if (n.includes('pets') || n.includes('animals')) return PawPrint;
  return Tag;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  iconWrap: {
    height: ICON_SIZE + spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImg: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  name: {
    color: colors.textPrimary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
