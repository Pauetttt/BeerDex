import React from 'react';
import { Image, StyleProp, ViewStyle } from 'react-native';

const CHAPA_COIN_SOURCE = require('../../assets/chapa-coin.png');

interface Props {
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function ChapaCoinIcon({ size = 18 }: Props) {
  return (
    <Image
      source={CHAPA_COIN_SOURCE}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
