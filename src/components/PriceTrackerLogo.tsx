import React from 'react';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { View } from 'react-native';

type LogoProps = {
  size?: number;
};

const PriceTrackerLogo: React.FC<LogoProps> = ({ size = 100 }) => {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        {/* Background circle */}
        <Circle cx="100" cy="100" r="90" fill="#F5F5DC" />
        
        {/* Price tag shape */}
        <Path d="M60,50 L125,50 L150,75 L150,150 L60,150 Z" fill="white" />
        
        {/* Rupee symbol (narrower) */}
        <G transform="translate(85, 70) scale(0.14, 0.16)">
          <Path fill="#da7756" d="M308 96c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v44.748c0 6.627 5.373 12 12 12h85.28c27.308 0 48.261 9.958 60.97 27.252H12c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h158.757c-6.217 36.086-32.961 58.632-74.757 58.632H12c-6.627 0-12 5.373-12 12v53.012c0 3.349 1.4 6.546 3.861 8.818l165.052 152.356a12.001 12.001 0 0 0 8.139 3.182h82.562c10.924 0 16.166-13.408 8.139-20.818L116.871 319.906c76.499-2.34 131.144-53.395 138.318-127.906H308c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-58.69c-3.486-11.541-8.28-22.246-14.252-32H308z" />
        </G>
        
        {/* Price tag hole */}
        <Circle cx="75" cy="65" r="5" fill="#da7756" />
        
        {/* Down arrow for tracking */}
        <Path d="M160,75 L175,75 L167.5,90 Z" fill="#da7756" />
        
        {/* Up arrow for price increase */}
        <Path d="M160,110 L175,110 L167.5,95 Z" fill="#da7756" />
      </Svg>
    </View>
  );
};

export default PriceTrackerLogo;
