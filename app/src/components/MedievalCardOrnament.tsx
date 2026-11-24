import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import { COLORS } from '../theme/tokens';

interface Props {
  borderColor?: string;
  accentColor?: string;
  variant?: 'front' | 'back' | 'locked';
  compact?: boolean;
}

/**
 * Ornamento medieval iluminado para cartas BeerDex (sin armas ni espadas):
 * filigranas botánicas de lúpulo y cebada, arcos góticos trilobulados y rosetón de códice.
 */
export function MedievalCardOrnament({
  borderColor = COLORS.borderGold,
  accentColor = COLORS.amberBright,
  variant = 'front',
  compact = false,
}: Props) {
  const isLocked = variant === 'locked';
  const outerOpacity = isLocked ? 0.35 : 0.65;
  const innerOpacity = isLocked ? 0.2 : 0.32;
  const cornerOpacity = isLocked ? 0.38 : 0.85;

  if (compact) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 100 130" preserveAspectRatio="none">
          <Rect
            x={3.5}
            y={3.5}
            width={93}
            height={123}
            rx={7}
            fill="none"
            stroke={borderColor}
            strokeWidth={1.1}
            strokeOpacity={0.7}
          />
          <Rect
            x={6.5}
            y={6.5}
            width={87}
            height={117}
            rx={5}
            fill="none"
            stroke={accentColor}
            strokeWidth={0.7}
            strokeOpacity={0.42}
          />

          {/* Esquinas botánicas compactas */}
          <Path
            d="M 8 20 C 8 10 10 8 20 8 M 11 15 C 12 12 13 11 16 11"
            fill="none"
            stroke={accentColor}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeOpacity={0.85}
          />
          <G transform="translate(100,0) scale(-1,1)">
            <Path
              d="M 8 20 C 8 10 10 8 20 8 M 11 15 C 12 12 13 11 16 11"
              fill="none"
              stroke={accentColor}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeOpacity={0.85}
            />
          </G>
          <G transform="translate(0,130) scale(1,-1)">
            <Path
              d="M 8 20 C 8 10 10 8 20 8 M 11 15 C 12 12 13 11 16 11"
              fill="none"
              stroke={accentColor}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeOpacity={0.85}
            />
          </G>
          <G transform="translate(100,130) scale(-1,-1)">
            <Path
              d="M 8 20 C 8 10 10 8 20 8 M 11 15 C 12 12 13 11 16 11"
              fill="none"
              stroke={accentColor}
              strokeWidth={1.2}
              strokeLinecap="round"
              strokeOpacity={0.85}
            />
          </G>

          {/* Florón superior gótico */}
          <Polygon
            points="50,3.5 54,7 50,10.5 46,7"
            fill={accentColor}
            fillOpacity={0.9}
          />
          <Circle cx={50} cy={123} r={2.2} fill={borderColor} fillOpacity={0.85} />
        </Svg>
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 200 296" preserveAspectRatio="none">
        {/* Doble marco de códice iluminado */}
        <Rect
          x={5}
          y={5}
          width={190}
          height={286}
          rx={11}
          fill="none"
          stroke={borderColor}
          strokeWidth={1.3}
          strokeOpacity={outerOpacity}
        />
        <Rect
          x={9}
          y={9}
          width={182}
          height={278}
          rx={8}
          fill="none"
          stroke={accentColor}
          strokeWidth={0.85}
          strokeOpacity={innerOpacity}
        />

        {/* Marca de agua de rosetón botánico en la crónica trasera */}
        {variant === 'back' ? (
          <G opacity={0.11} transform="translate(100, 148)">
            <Circle cx={0} cy={0} r={44} fill="none" stroke={accentColor} strokeWidth={1.2} />
            <Circle cx={0} cy={0} r={28} fill="none" stroke={borderColor} strokeWidth={1} />
            <Circle cx={0} cy={0} r={6} fill={accentColor} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <G key={deg} transform={`rotate(${deg})`}>
                <Path
                  d="M 0 -10 C 8 -20 8 -34 0 -42 C -8 -34 -8 -20 0 -10 Z"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth={1}
                />
                <Line x1={0} y1={-44} x2={0} y2={-52} stroke={borderColor} strokeWidth={1.2} />
              </G>
            ))}
          </G>
        ) : null}

        {/* Filigranas de acanto y hoja de lúpulo en las 4 esquinas */}
        <G opacity={cornerOpacity}>
          {/* Superior izquierda */}
          <Path
            d="M 10 31 C 10 14 14 10 31 10 M 13 24 C 13 15 16 13 24 13 C 20 17 17 20 13 24 Z"
            fill="none"
            stroke={accentColor}
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          <Circle cx={15} cy={15} r={1.8} fill={accentColor} />
          <Polygon points="28,10 32,7.5 36,10 32,12.5" fill={borderColor} />
          <Polygon points="10,28 12.5,32 10,36 7.5,32" fill={borderColor} />

          {/* Superior derecha */}
          <G transform="translate(200,0) scale(-1,1)">
            <Path
              d="M 10 31 C 10 14 14 10 31 10 M 13 24 C 13 15 16 13 24 13 C 20 17 17 20 13 24 Z"
              fill="none"
              stroke={accentColor}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <Circle cx={15} cy={15} r={1.8} fill={accentColor} />
            <Polygon points="28,10 32,7.5 36,10 32,12.5" fill={borderColor} />
            <Polygon points="10,28 12.5,32 10,36 7.5,32" fill={borderColor} />
          </G>

          {/* Inferior izquierda */}
          <G transform="translate(0,296) scale(1,-1)">
            <Path
              d="M 10 31 C 10 14 14 10 31 10 M 13 24 C 13 15 16 13 24 13 C 20 17 17 20 13 24 Z"
              fill="none"
              stroke={accentColor}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <Circle cx={15} cy={15} r={1.8} fill={accentColor} />
            <Polygon points="28,10 32,7.5 36,10 32,12.5" fill={borderColor} />
            <Polygon points="10,28 12.5,32 10,36 7.5,32" fill={borderColor} />
          </G>

          {/* Inferior derecha */}
          <G transform="translate(200,296) scale(-1,-1)">
            <Path
              d="M 10 31 C 10 14 14 10 31 10 M 13 24 C 13 15 16 13 24 13 C 20 17 17 20 13 24 Z"
              fill="none"
              stroke={accentColor}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <Circle cx={15} cy={15} r={1.8} fill={accentColor} />
            <Polygon points="28,10 32,7.5 36,10 32,12.5" fill={borderColor} />
            <Polygon points="10,28 12.5,32 10,36 7.5,32" fill={borderColor} />
          </G>
        </G>

        {/* Arco gótico trilobulado superior con florón de lúpulo */}
        <G opacity={cornerOpacity}>
          <Path
            d="M 76 9 Q 88 2 100 9 Q 112 2 124 9"
            fill="none"
            stroke={borderColor}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
          <Polygon points="100,4.5 104.5,9 100,13.5 95.5,9" fill={accentColor} />
          <Circle cx={82} cy={9} r={1.5} fill={accentColor} />
          <Circle cx={118} cy={9} r={1.5} fill={accentColor} />
        </G>

        {/* Cierre inferior heráldico */}
        <G opacity={cornerOpacity}>
          <Line x1={74} y1={287} x2={92} y2={287} stroke={borderColor} strokeWidth={1.1} />
          <Line x1={108} y1={287} x2={126} y2={287} stroke={borderColor} strokeWidth={1.1} />
          <Polygon points="100,283.5 104,287 100,290.5 96,287" fill={accentColor} />
        </G>
      </Svg>
    </View>
  );
}
