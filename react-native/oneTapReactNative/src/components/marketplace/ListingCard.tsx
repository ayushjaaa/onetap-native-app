import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { MapPin, Clock, ImageOff } from 'lucide-react-native';
import { colors, fontSize, layout, radius, spacing, typography } from '@/theme';

export interface ListingCardProps {
  image?: string;
  badge?: string;
  badgeColor?: string;
  title: string;
  price: string;
  location: string;
  time: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  image,
  badge,
  badgeColor = colors.primary,
  title,
  price,
  location,
  time,
  onPress,
  style,
}) => {
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={styles.imageWrap}>
        {image && !imageFailed ? (
          <Image
            source={{ uri: image }}
            style={styles.image}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <ImageOff size={28} color={colors.textMuted} />
          </View>
        )}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          {price}
        </Text>
        <View style={styles.metaRow}>
          <MapPin size={11} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {location}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={11} color={colors.textMuted} />
          <Text style={styles.metaText} numberOfLines={1}>
            {time}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: layout.cardImage,
    height: layout.cardImage,
    borderRadius: radius.base,
    backgroundColor: colors.surface,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.base,
  },
  badgeText: {
    fontSize: fontSize.micro,
    fontWeight: '700',
    color: colors.white,
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  title: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  price: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.primary,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },
});
