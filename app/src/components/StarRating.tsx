import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { COLORS } from '../theme/tokens';

interface Props {
  rating: number;
  size?: number;
  readonly?: boolean;
  onChange?: (nextRating: number) => void;
}

export function StarRating({
  rating,
  size = 16,
  readonly = true,
  onChange,
}: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => {
        const active = value <= rating;
        const fill = active ? COLORS.amberBright : 'transparent';
        const stroke = active ? COLORS.amberBright : COLORS.textMuted;

        const star = (
          <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Polygon
              points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
              fill={fill}
              stroke={stroke}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </Svg>
        );

        if (readonly || !onChange) {
          return (
            <View key={value} style={styles.starWrap}>
              {star}
            </View>
          );
        }

        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            hitSlop={6}
            style={styles.starBtn}
            accessibilityLabel={`Valorar con ${value} estrellas`}
          >
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  starWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starBtn: {
    padding: 3,
  },
});
