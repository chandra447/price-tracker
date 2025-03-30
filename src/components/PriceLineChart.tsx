import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Path, Skia, Group, Circle, RoundedRect, Text as SkiaText } from '@shopify/react-native-skia';
import { curveBasis, line, scaleLinear, scaleTime } from 'd3';
import {
  SharedValue,
  clamp,
  runOnJS,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { getYForX, parse } from 'react-native-redash';
import { format } from 'date-fns';

type DataPoint = {
  date: Date;
  value: number;
};

type Props = {
  chartWidth: number;
  chartHeight: number;
  data: DataPoint[];
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  onPointSelected?: (date: Date, value: number) => void;
};

const PriceLineChart = ({
  chartHeight,
  chartWidth,
  data,
  accentColor = '#da7756',
  textColor = '#000000',
  backgroundColor = '#ffffff',
  onPointSelected,
}: Props) => {
  const [showCursor, setShowCursor] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ date: Date; value: number } | null>(null);
  
  const animationLine = useSharedValue(0);
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  
  // Sort data by date
  const sortedData = [...data].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Find high and low points
  const highPoint = sortedData.reduce((prev, current) => 
    prev.value > current.value ? prev : current, sortedData[0]
  );
  
  const lowPoint = sortedData.reduce((prev, current) => 
    prev.value < current.value ? prev : current, sortedData[0]
  );

  // Margins for the chart
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const width = chartWidth - margin.left - margin.right;
  const height = chartHeight - margin.top - margin.bottom;

  useEffect(() => {
    // Animate the line
    animationLine.value = withTiming(1, { duration: 1000 });
  }, [animationLine, data]);

  // Create scales
  const xDomain = [
    sortedData[0]?.date || new Date(),
    sortedData[sortedData.length - 1]?.date || new Date()
  ];
  
  const xRange = [0, width];
  const x = scaleTime().domain(xDomain).range(xRange);

  // Find the max and min values with padding
  const max = Math.max(...sortedData.map(val => val.value));
  const min = Math.min(...sortedData.map(val => val.value));
  const padding = (max - min) * 0.1 || 1;
  
  const yDomain = [min - padding, max + padding];
  const yRange = [height, 0];
  const y = scaleLinear().domain(yDomain).range(yRange);

  // Create the curved line
  const curvedLine = line<DataPoint>()
    .x(d => x(d.date))
    .y(d => y(d.value))
    .curve(curveBasis)(sortedData);

  const linePath = Skia.Path.MakeFromSVGString(curvedLine!);

  // Parse the path to get the points
  const path = parse(linePath!.toSVGString());

  // Handle the gesture event
  const handleGestureEvent = (e: PanGestureHandlerEventPayload) => {
    'worklet';
    
    // Adjust for margins
    const touchX = e.absoluteX - margin.left;
    
    if (touchX < 0 || touchX > width) {
      return;
    }
    
    // Find closest point in data
    const date = x.invert(touchX);
    
    // Find the closest data point
    let closestPoint = sortedData[0];
    let closestDistance = Math.abs(closestPoint.date.getTime() - date.getTime());
    
    for (const point of sortedData) {
      const distance = Math.abs(point.date.getTime() - date.getTime());
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    }
    
    // Get the x and y coordinates for the cursor
    const pointX = x(closestPoint.date);
    const pointY = y(closestPoint.value);
    
    cx.value = pointX;
    cy.value = pointY;
    
    runOnJS(setSelectedPoint)({ date: closestPoint.date, value: closestPoint.value });
    
    if (onPointSelected) {
      runOnJS(onPointSelected)(closestPoint.date, closestPoint.value);
    }
  };

  // Pan gesture handler
  const pan = Gesture.Pan()
    .onTouchesDown(() => {
      runOnJS(setShowCursor)(true);
    })
    .onTouchesUp(() => {
      runOnJS(setShowCursor)(false);
      runOnJS(setSelectedPoint)(null);
    })
    .onBegin(handleGestureEvent)
    .onChange(handleGestureEvent);

  // Convert colors to Skia format
  const skAccentColor = Skia.Color(accentColor);
  const skTextColor = Skia.Color(textColor);
  const skBackgroundColor = Skia.Color(backgroundColor);
  
  // Format price for display
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.container}>
        <Canvas style={{ width: chartWidth, height: chartHeight }}>
          <Group transform={[{ translateX: margin.left }, { translateY: margin.top }]}>
            {/* Base line */}
            <Path
              path={Skia.Path.Make().moveTo(0, height).lineTo(width, height)}
              style="stroke"
              strokeWidth={1}
              color={skTextColor}
              opacity={0.2}
            />
            
            {/* Main line */}
            <Path
              path={linePath!}
              style="stroke"
              strokeWidth={3}
              color={skAccentColor}
              end={animationLine}
              strokeCap="round"
            />
            
            {/* High point */}
            <Circle
              cx={x(highPoint.date)}
              cy={y(highPoint.value)}
              r={6}
              color={skBackgroundColor}
              style="fill"
            />
            <Circle
              cx={x(highPoint.date)}
              cy={y(highPoint.value)}
              r={6}
              color={skAccentColor}
              style="stroke"
              strokeWidth={2}
            />
            
            {/* Low point */}
            <Circle
              cx={x(lowPoint.date)}
              cy={y(lowPoint.value)}
              r={6}
              color={skBackgroundColor}
              style="fill"
            />
            <Circle
              cx={x(lowPoint.date)}
              cy={y(lowPoint.value)}
              r={6}
              color={skAccentColor}
              style="stroke"
              strokeWidth={2}
            />
            
            {/* Cursor and tooltip */}
            {showCursor && selectedPoint && (
              <>
                {/* Cursor circle */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  color={skBackgroundColor}
                  style="fill"
                />
                <Circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  color={skAccentColor}
                  style="stroke"
                  strokeWidth={2}
                />
                
                {/* Tooltip */}
                <Group transform={[{ translateX: cx.value + 10 }, { translateY: cy.value - 30 }]}>
                  <RoundedRect
                    x={-5}
                    y={-20}
                    width={110}
                    height={40}
                    r={5}
                    color={skBackgroundColor}
                    style="fill"
                  />
                  <RoundedRect
                    x={-5}
                    y={-20}
                    width={110}
                    height={40}
                    r={5}
                    color={skAccentColor}
                    style="stroke"
                    strokeWidth={1}
                  />
                  <SkiaText
                    x={5}
                    y={-5}
                    text={formatPrice(selectedPoint.value)}
                    font={Skia.Font(undefined, 14)}
                    color={skTextColor}
                  />
                  <SkiaText
                    x={5}
                    y={15}
                    text={format(selectedPoint.date, 'MMM d, yyyy')}
                    font={Skia.Font(undefined, 12)}
                    color={skTextColor}
                    opacity={0.7}
                  />
                </Group>
              </>
            )}
          </Group>
        </Canvas>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
});

export default PriceLineChart;
