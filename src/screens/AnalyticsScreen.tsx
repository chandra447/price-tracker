import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Appbar, Card, Text, Button, Menu, Divider } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useWindowDimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePocketBase } from '../context/pocketbase';
import { format } from 'date-fns';

type RouteParams = {
  itemId: string;
  itemName: string;
};

type Price = {
  id: string;
  price: number;
  item: string;
  created: string;
  updated: string;
};

type DateRange = '7days' | '30days' | '90days' | 'all';

export default function AnalyticsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { itemId, itemName } = route.params as RouteParams;
  const { width } = useWindowDimensions();
  const { pb } = usePocketBase();
  
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [menuVisible, setMenuVisible] = useState(false);

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
      if (dateRange !== 'all') {
        const now = new Date();
        let daysToSubtract = 7;
        
        if (dateRange === '30days') daysToSubtract = 30;
        if (dateRange === '90days') daysToSubtract = 90;
        
        const startDate = new Date();
        startDate.setDate(now.getDate() - daysToSubtract);
        
        filter += ` && created >= "${startDate.toISOString()}"`;
      }
      
      const result = await pb.collection('prices').getFullList({
        filter: filter,
        sort: 'created',
      });
      
      setPrices(result as unknown as Price[]);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (prices.length === 0) return null;

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
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d');
    } catch (e) {
      return 'Unknown';
    }
  };

  const getChartData = () => {
    if (prices.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }]
      };
    }
    
    // For many data points, we'll need to limit the number of labels shown
    const maxLabels = 6;
    const step = prices.length <= maxLabels ? 1 : Math.floor(prices.length / maxLabels);
    
    const labels = prices
      .filter((_, i) => i % step === 0 || i === prices.length - 1)
      .map(price => formatDate(price.created));
    
    return {
      labels,
      datasets: [{
        data: prices.map(p => p.price),
      }]
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`${itemName} Analytics`} />
      </Appbar.Header>

      <View style={styles.filterContainer}>
        <Text variant="labelLarge">Date Range:</Text>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button 
              mode="outlined" 
              onPress={() => setMenuVisible(true)}
              style={styles.filterButton}
            >
              {dateRange === 'all' ? 'All Time' : 
               dateRange === '7days' ? 'Last 7 Days' :
               dateRange === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
            </Button>
          }
        >
          <Menu.Item onPress={() => { setDateRange('7days'); setMenuVisible(false); }} title="Last 7 Days" />
          <Menu.Item onPress={() => { setDateRange('30days'); setMenuVisible(false); }} title="Last 30 Days" />
          <Menu.Item onPress={() => { setDateRange('90days'); setMenuVisible(false); }} title="Last 90 Days" />
          <Menu.Item onPress={() => { setDateRange('all'); setMenuVisible(false); }} title="All Time" />
        </Menu>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text>Loading price data...</Text>
        </View>
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Title title="Price History" />
            <Card.Content>
              {prices.length === 0 ? (
                <View style={styles.noDataContainer}>
                  <Text>No price data available for the selected period.</Text>
                </View>
              ) : (
                <LineChart
                  data={getChartData()}
                  width={width - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: "#007AFF"
                    },
                    propsForLabels: {
                      fontSize: 10
                    }
                  }}
                  bezier
                  style={styles.chart}
                />
              )}
            </Card.Content>
          </Card>

          {stats && (
            <Card style={styles.card}>
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
          )}

          {prices.length > 0 && (
            <Card style={styles.card}>
              <Card.Title title="Price History Table" />
              <Card.Content>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderDate}>Date</Text>
                  <Text style={styles.tableHeaderPrice}>Price</Text>
                </View>
                <Divider />
                {prices.slice().reverse().map((price) => (
                  <View key={price.id} style={styles.tableRow}>
                    <Text style={styles.tableDate}>{format(new Date(price.created), 'MMM d, yyyy')}</Text>
                    <Text style={styles.tablePrice}>${price.price.toFixed(2)}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  filterButton: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
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
  tableDate: {
    flex: 1,
  },
  tablePrice: {
    width: 80,
    textAlign: 'right',
  },
});
