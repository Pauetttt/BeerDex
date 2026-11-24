import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS } from '../theme/tokens';
import { BeerFormat } from '../types/api';

interface Props {
  format: BeerFormat;
  size?: number;
  color?: string;
}

export function BeerSilhouette({
  format,
  size = 64,
  color = COLORS.lockedText,
}: Props) {
  return (
    <View
      style={[
        styles.pedestal,
        { width: size + 18, height: size + 18, borderRadius: (size + 18) / 2 },
      ]}
    >
      {format === 'lata' ? (
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <Rect x="21" y="10" width="22" height="4" rx="2" fill={color} opacity={0.85} />
          <Path
            d="M21 14 L18 19 L18 49 C18 52 20 54 23 54 L41 54 C44 54 46 52 46 49 L46 19 L43 14 Z"
            fill={color}
            opacity={0.28}
            stroke={color}
            strokeWidth="2"
          />
          <Path d="M23 19 L23 48" stroke="#FAF4EC" strokeOpacity={0.14} strokeWidth="2" strokeLinecap="round" />
          <Rect x="22" y="25" width="20" height="16" rx="3" fill={color} opacity={0.22} />
          <Circle cx="32" cy="33" r="4.5" fill={color} opacity={0.5} />
        </Svg>
      ) : format === 'litrona' ? (
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <Rect x="27" y="5" width="10" height="3.5" rx="1.5" fill={color} />
          <Path
            d="M28 8.5 L28 17 C28 21 17 24 17 31 L17 53 C17 56 19.5 58 22.5 58 L41.5 58 C44.5 58 47 56 47 53 L47 31 C47 24 36 21 36 17 L36 8.5 Z"
            fill={color}
            opacity={0.28}
            stroke={color}
            strokeWidth="2"
          />
          <Path d="M21 32 L21 52" stroke="#FAF4EC" strokeOpacity={0.14} strokeWidth="2" strokeLinecap="round" />
          <Rect x="21" y="33" width="22" height="15" rx="3" fill={color} opacity={0.22} />
          <SvgText
            x="32"
            y="44"
            fontSize="9"
            fontWeight="bold"
            fill={color}
            textAnchor="middle"
          >
            1L
          </SvgText>
        </Svg>
      ) : (
        <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <Rect x="27.5" y="7" width="9" height="3.5" rx="1.5" fill={color} />
          <Path
            d="M28.5 10.5 L28 21 C28 25 21 27 21 33 L21 53 C21 55.5 23 57 25.5 57 L38.5 57 C41 57 43 55.5 43 53 L43 33 C43 27 36 25 35.5 21 L35.5 10.5 Z"
            fill={color}
            opacity={0.28}
            stroke={color}
            strokeWidth="2"
          />
          <Path d="M25 34 L25 51" stroke="#FAF4EC" strokeOpacity={0.14} strokeWidth="2" strokeLinecap="round" />
          <Rect x="24" y="35" width="16" height="12" rx="2.5" fill={color} opacity={0.22} />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pedestal: {
    backgroundColor: 'rgba(255, 224, 180, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 180, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
