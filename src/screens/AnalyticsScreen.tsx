import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Platform, Dimensions, Modal as RNModal, GestureResponderEvent } from 'react-native';
import { Appbar, Card, Text, Button, Divider, Portal, Modal } from 'react-native-paper';
import { Svg, Path, G, Line as SvgLine, Text as SvgText, Circle, Rect } from 'react-native-svg';
import * as d3 from 'd3';
import { useWindowDimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePocketBase } from '../context/pocketbase';
import { useTheme } from '../context/theme';
import { format, parseISO } from 'date-fns';
import { Calendar, DateData } from 'react-native-calendars';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AppLayout from '../components/AppLayout';

type RouteParams = {
  itemId: string;
  itemName: string;
};

type Price = {
  id: string;
  price: number;
  item: string;
  created_at: string;
  updated_at: string;
};

type DateRangeType = {
  startDate: string | null;
  endDate: string | null;
};

export default function AnalyticsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { itemId, itemName } = route.params as RouteParams;
  const { width: screenWidth } = useWindowDimensions();
  const { pb } = usePocketBase();
  const { colors } = useTheme();

  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeType>({ startDate: null, endDate: null });
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectingStartDate, setSelectingStartDate] = useState(true);
  const [markedDates, setMarkedDates] = useState<{ [date: string]: any }>({});
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState<{ x: number, y: number, date: Date, price: number } | null>(null);

  useEffect(() => {
    if (pb) {
      fetchPrices();
    }
  }, [pb, itemId, dateRange]);

  const fetchPrices = async () => {
    if (!pb) return;

    try {
      setLoading(true);

      let filter = `item = "${itemId}"`;

      // Add date filter if needed
      if (dateRange.startDate && dateRange.endDate) {
        filter += ` && created_at >= "${new Date(dateRange.startDate).toISOString()}" && created_at <= "${new Date(dateRange.endDate).toISOString()}"`;
      }

      const result = await pb.collection('prices').getFullList({
        filter: filter,
        sort: 'created_at',
      });

      setPrices(result as unknown as Price[]);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (prices.length === 0) {
      return {
        latest: 0,
        average: 0,
        min: 0,
        max: 0,
        change: 0
      };
    }

    const priceValues = prices.map(p => p.price);
    const average = priceValues.reduce((sum, price) => sum + price, 0) / priceValues.length;
    const change = priceValues.length > 1
      ? ((priceValues[priceValues.length - 1] - priceValues[0]) / priceValues[0]) * 100
      : 0;

    return {
      average,
      change,
      min: Math.min(...priceValues),
      max: Math.max(...priceValues),
      latest: priceValues[priceValues.length - 1],
    };
  };

  const stats = calculateStats();

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'M/d');
  };

  const chartWidth = screenWidth - 64; // Further reduce width to prevent overflow
  const chartHeight = 250;
  const margin = { top: 30, right: 30, bottom: 30, left: 30 }; // Minimal margins for clean look
  const width = chartWidth - margin.left - margin.right;
  const height = chartHeight - margin.top - margin.bottom;

  const parsedData = useMemo(() => prices.map(d => ({
    date: parseISO(d.created_at),
    value: d.price,
  })).sort((a, b) => a.date.getTime() - b.date.getTime()), [prices]);

  const xScale = useMemo(() => {
    const domain = d3.extent(parsedData, d => d.date) as [Date, Date] | [undefined, undefined];
    if (!domain[0] || !domain[1]) return null; // Handle empty data
    return d3.scaleTime().domain(domain).range([0, width]);
  }, [parsedData, width]);

  const yScale = useMemo(() => {
    const domain = d3.extent(parsedData, d => d.value) as [number, number] | [undefined, undefined];
    if (domain[0] === undefined || domain[1] === undefined) return null; // Handle empty data
    // Add padding to the domain
    const padding = (domain[1] - domain[0]) * 0.1 || 1; // Ensure padding is not 0
    return d3.scaleLinear().domain([domain[0] - padding, domain[1] + padding]).range([height, 0]);
  }, [parsedData, height]);

  const lineGenerator = useMemo(() => {
    if (!xScale || !yScale) return null;
    return d3.line<{ date: Date; value: number }>()
      .x(d => xScale(d.date)!)
      .y(d => yScale(d.value)!)
      .curve(d3.curveMonotoneX); // Use monotone curve to ensure it passes through all points
  }, [xScale, yScale]);

  const pathData = useMemo(() => {
    if (!lineGenerator || parsedData.length === 0) return null;
    return lineGenerator(parsedData);
  }, [lineGenerator, parsedData]);

  // Find highest and lowest points
  const highLowPoints = useMemo(() => {
    if (parsedData.length === 0 || !xScale || !yScale) return { high: null, low: null };

    // Find the point with the highest value
    let highPoint = parsedData[0];
    for (const point of parsedData) {
      if (point.value > highPoint.value) {
        highPoint = point;
      }
    }

    // Find the point with the lowest value
    let lowPoint = parsedData[0];
    for (const point of parsedData) {
      if (point.value < lowPoint.value) {
        lowPoint = point;
      }
    }

    return {
      high: {
        x: xScale(highPoint.date),
        y: yScale(highPoint.value),
        date: highPoint.date,
        price: highPoint.value
      },
      low: {
        x: xScale(lowPoint.date),
        y: yScale(lowPoint.value),
        date: lowPoint.date,
        price: lowPoint.value
      }
    };
  }, [parsedData, xScale, yScale]);

  // Handle touch/drag on chart
  const handleChartTouch = (event: GestureResponderEvent) => {
    if (!xScale || !yScale || parsedData.length === 0) return;

    // Get touch position relative to the chart
    const { locationX } = event.nativeEvent;
    const chartX = locationX - margin.left;

    // Find closest data point
    if (chartX < 0 || chartX > width) {
      setTooltipVisible(false);
      return;
    }

    const x0 = xScale.invert(chartX);

    // Find the closest data point to the touch position
    const bisect = d3.bisector((d: { date: Date, value: number }) => d.date).left;
    const index = bisect(parsedData, x0, 1);

    if (index >= parsedData.length) {
      setTooltipVisible(false);
      return;
    }

    const d0 = parsedData[Math.max(0, index - 1)];
    const d1 = parsedData[Math.min(index, parsedData.length - 1)];

    if (!d0 || !d1) {
      setTooltipVisible(false);
      return;
    }

    const d = x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;

    setTooltipData({
      x: xScale(d.date),
      y: yScale(d.value),
      date: d.date,
      price: d.value
    });
    setTooltipVisible(true);
  };

  const handleChartTouchEnd = () => {
    setTooltipVisible(false);
  };

  const handleDateSelect = (date: DateData) => {
    const selectedDate = date.dateString;

    if (selectingStartDate) {
      const newMarkedDates = {
        [selectedDate]: { selected: true, startingDay: true, color: colors.accent }
      };

      setMarkedDates(newMarkedDates);
      setDateRange({ startDate: selectedDate, endDate: null });
      setSelectingStartDate(false);
    } else {
      const startDate = dateRange.startDate;
      if (!startDate) return;

      if (new Date(selectedDate) < new Date(startDate)) {
        const newMarkedDates = {
          [selectedDate]: { selected: true, startingDay: true, color: colors.accent }
        };
        setMarkedDates(newMarkedDates);
        setDateRange({ startDate: selectedDate, endDate: null });
        setSelectingStartDate(false);
        return;
      }

      const newMarkedDates: { [date: string]: any } = {};

      newMarkedDates[startDate] = { selected: true, startingDay: true, color: colors.accent };

      newMarkedDates[selectedDate] = { selected: true, endingDay: true, color: colors.accent };

      const start = new Date(startDate);
      const end = new Date(selectedDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateString = format(d, 'yyyy-MM-dd');
        if (!newMarkedDates[dateString]) {
          newMarkedDates[dateString] = { selected: true, color: colors.accent };
        }
      }

      setMarkedDates(newMarkedDates);
      setDateRange({ startDate, endDate: selectedDate });
      setCalendarVisible(false);
      setSelectingStartDate(true);
    }
  };

  const resetDateRange = () => {
    setDateRange({ startDate: null, endDate: null });
    setMarkedDates({});
    setSelectingStartDate(true);
  };

  const getDateRangeText = () => {
    if (!dateRange.startDate) return 'All Time';
    if (!dateRange.endDate) return `From ${format(new Date(dateRange.startDate), 'MMM d, yyyy')}`;
    return `${format(new Date(dateRange.startDate), 'MMM d, yyyy')} - ${format(new Date(dateRange.endDate), 'MMM d, yyyy')}`;
  };

  return (
    <AppLayout title={`${itemName} Analytics`}>
      {/* Use React Native's Modal instead of Paper's Modal for better z-index handling */}
      <RNModal
        visible={calendarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarWrapper, { backgroundColor: colors.background }]}>
            <Calendar
              current={dateRange.startDate || undefined}
              markedDates={markedDates}
              onDayPress={handleDateSelect}
              markingType={'period'}
              theme={{
                backgroundColor: colors.background,
                calendarBackground: colors.background,
                textSectionTitleColor: colors.textSecondary,
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.accent,
                dayTextColor: colors.text,
                textDisabledColor: '#cccccc', // Use explicit color instead of theme
                dotColor: colors.accent,
                selectedDotColor: '#ffffff',
                arrowColor: colors.accent,
                monthTextColor: colors.text,
                indicatorColor: colors.text,
                textDayFontWeight: '300',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '300',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14
              }}
            />
            <Button
              onPress={() => setCalendarVisible(false)}
              style={styles.closeButton}
              mode="contained"
              buttonColor={colors.accent}
              textColor="#ffffff"
            >
              Close
            </Button>
          </View>
        </View>
      </RNModal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.filterContainer}>
          <Button
            mode="outlined"
            onPress={() => setCalendarVisible(true)}
            style={styles.filterButton}
          >
            {getDateRangeText()}
          </Button>
          {(dateRange.startDate || dateRange.endDate) && (
            <Button
              mode="text"
              onPress={resetDateRange}
              style={styles.resetButton}
            >
              Reset
            </Button>
          )}
        </View>

        {loading ? (
          <ActivityIndicator animating={true} size="large" color={colors.accent} style={styles.loadingIndicator} />
        ) : prices.length === 0 ? (
          <View style={styles.centerMessage}><Text>No price data available for the selected range.</Text></View>
        ) : (
          <>
            <Card style={styles.chartCard}>
              <Card.Title title="Price Trend" titleStyle={{ color: colors.text }} />
              <Card.Content>
                <View style={styles.chartWrapper}>
                  {xScale && yScale && pathData ? (
                    <Svg
                      width={chartWidth}
                      height={chartHeight}
                      onTouchMove={handleChartTouch}
                      onTouchEnd={handleChartTouchEnd}
                    >
                      <G x={margin.left} y={margin.top}>
                        {/* Base Line - subtle horizontal line */}
                        <SvgLine
                          x1={0}
                          y1={height}
                          x2={width}
                          y2={height}
                          stroke={colors.textSecondary}
                          strokeWidth={0.5}
                          strokeOpacity={0.5}
                        />
                        {/* Line Path */}
                        <Path
                          d={pathData}
                          fill="none"
                          stroke={colors.accent}
                          strokeWidth={3}
                        />
                        {/* Highest and Lowest Points */}
                        {highLowPoints.high && (
                          <Circle
                            cx={highLowPoints.high.x}
                            cy={highLowPoints.high.y}
                            r={6}
                            fill={colors.card}
                            stroke={colors.accent}
                            strokeWidth={2}
                          />
                        )}
                        {highLowPoints.low && (
                          <Circle
                            cx={highLowPoints.low.x}
                            cy={highLowPoints.low.y}
                            r={6}
                            fill={colors.card}
                            stroke={colors.accent}
                            strokeWidth={2}
                          />
                        )}
                        {/* Tooltip */}
                        {tooltipVisible && tooltipData && (
                          <G>
                            <Circle
                              cx={tooltipData.x}
                              cy={tooltipData.y}
                              r={8}
                              fill={colors.card}
                              stroke={colors.accent}
                              strokeWidth={2}
                            />
                            <G transform={`translate(${tooltipData.x + 10}, ${tooltipData.y - 30})`}>
                              <Rect
                                x={-5}
                                y={-20}
                                width={110}
                                height={40}
                                fill={colors.card}
                                stroke={colors.accent}
                                strokeWidth={1}
                                rx={5}
                                ry={5}
                              />
                              <SvgText
                                y={-5}
                                fill={colors.text}
                                fontSize={12}
                                fontWeight="bold"
                              >
                                ${tooltipData.price.toFixed(2)}
                              </SvgText>
                              <SvgText
                                y={15}
                                fill={colors.textSecondary}
                                fontSize={10}
                              >
                                {format(tooltipData.date, 'MMM d, yyyy')}
                              </SvgText>
                            </G>
                          </G>
                        )}
                      </G>
                    </Svg>
                  ) : (
                    <View style={styles.centerMessage}><Text>Not enough data to draw chart.</Text></View>
                  )}
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.statsCard}>
              <Card.Title title="Statistics" />
              <Card.Content>
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text variant="labelMedium">Latest Price</Text>
                    <Text variant="bodyLarge" style={styles.statValue}>${stats.latest.toFixed(2)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelMedium">Average Price</Text>
                    <Text variant="bodyLarge" style={styles.statValue}>${stats.average.toFixed(2)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelMedium">Price Change</Text>
                    <Text
                      variant="bodyLarge"
                      style={[
                        styles.statValue,
                        { color: stats.change >= 0 ? 'green' : 'red' }
                      ]}
                    >
                      {stats.change.toFixed(1)}%
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelMedium">Lowest Price</Text>
                    <Text variant="bodyLarge" style={styles.statValue}>${stats.min.toFixed(2)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelMedium">Highest Price</Text>
                    <Text variant="bodyLarge" style={styles.statValue}>${stats.max.toFixed(2)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text variant="labelMedium">Data Points</Text>
                    <Text variant="bodyLarge" style={styles.statValue}>{prices.length}</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            <Card style={styles.tableCard}>
              <Card.Title title="Price History Table" />
              <Card.Content>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderMonth}>Month</Text>
                  <Text style={styles.tableHeaderDate}>Date</Text>
                  <Text style={styles.tableHeaderPrice}>Price</Text>
                </View>
                <Divider />
                {prices.slice().reverse().map((price) => {
                  const date = parseISO(price.created_at);
                  return (
                    <View key={price.id} style={styles.tableRow}>
                      <Text style={styles.tableMonth}>{format(date, 'MMM')}</Text>
                      <Text style={styles.tableDate}>{format(date, 'd, yyyy')}</Text>
                      <Text style={styles.tablePrice}>${price.price.toFixed(2)}</Text>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
  },
  resetButton: {
    marginLeft: 8,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  chartCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  tableCard: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  tableHeaderMonth: {
    width: 60,
    fontWeight: 'bold',
  },
  tableHeaderDate: {
    flex: 1,
    fontWeight: 'bold',
  },
  tableHeaderPrice: {
    width: 80,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableMonth: {
    width: 60,
  },
  tableDate: {
    flex: 1,
  },
  tablePrice: {
    width: 80,
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 9999,
  },
  calendarWrapper: {
    width: '90%',
    borderRadius: 10,
    overflow: 'hidden',
    paddingBottom: 10,
    padding: 10,
    elevation: 5, // Android elevation
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 10000,
  },
  closeButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
  centerMessage: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  chartWrapper: {
    overflow: 'hidden', // Prevent content from overflowing
  },
});
