import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  SlideInUp,
  Layout,
  Easing,
  FadeOut
} from 'react-native-reanimated';

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, StatusBar, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  Appbar,
  Card,
  Text,
  FAB,
  Dialog,
  Portal,
  IconButton,
  Button,
  TextInput,
  Searchbar
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePocketBase } from '../context/pocketbase';
import { useAuth } from '../context/auth';
import { useTheme } from '../context/theme';
import { LinearGradient } from 'expo-linear-gradient';
import AppLayout from '../components/AppLayout';

// Define types based on the PocketBase schema
type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  User: string; // Reference to user ID
  created_at: string;
  updated_at: string;
};

type Price = {
  id: string;
  price: number;
  item: string; // Reference to item ID
  created_at: string;
  updated_at: string;
};

type RootStackParamList = {
  Dashboard: undefined;
  Analytics: { itemId: string; itemName: string };
};

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Item>);

export default function DashboardScreen() {
  const { pb } = usePocketBase();
  const { user } = useAuth();
  const { colors, theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<Record<string, Price[]>>({});
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => {
    return {
      opacity: 1,
    };
  });

  const animatedSearchBarStyle = useAnimatedStyle(() => {
    return {
      opacity: 1,
    };
  });

  useEffect(() => {
    if (pb && user) {
      console.log('Auth state:', {
        isValid: pb.authStore.isValid,
        userId: user.id,
        model: pb.authStore.model
      });
      fetchItems();
    } else {
      // For testing - add mock data if no real data is available
      setItems([
        {
          id: '1',
          name: 'Item1',
          description: 'Test item 1',
          category: 'Test',
          User: 'user1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Item2',
          description: 'Test item 2',
          category: 'Test',
          User: 'user1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

      // Mock prices
      setPrices({
        '1': [
          {
            id: 'p1',
            price: 123.00,
            item: '1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ],
        '2': [
          {
            id: 'p2',
            price: 45.00,
            item: '2',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
      });
    }
  }, [pb, user]);

  const fetchItems = async () => {
    if (!pb || !user) {
      console.error('PocketBase not initialized or user not logged in');
      return;
    }

    try {
      setLoading(true);
      // Get items for the current user
      const result = await pb.collection('items').getFullList({
        filter: `User = "${user.id}"`,
        sort: '-created_at',
        expand: 'User'
      });

      setItems(result as unknown as Item[]);

      // Fetch prices for each item
      const itemIds = result.map((item: any) => item.id);
      if (itemIds.length > 0) {
        await fetchPricesForItems(itemIds);
      }
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to fetch items:', {
          message: err.message,
          details: err,
          userId: user.id
        });
      } else {
        console.error('Failed to fetch items:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPricesForItems = async (itemIds: string[]) => {
    if (!pb) return;

    try {
      // Use expand and filter with the correct syntax
      const priceResults = await pb.collection('prices').getFullList({
        filter: itemIds.map(id => `item = "${id}"`).join(' || '),  // Using OR operator for multiple items
        sort: '-created_at',
        expand: 'item'  // Expand the item relation
      });

      // Group prices by item ID
      const pricesByItem: Record<string, Price[]> = {};
      priceResults.forEach((price: any) => {
        if (!pricesByItem[price.item]) {
          pricesByItem[price.item] = [];
        }
        pricesByItem[price.item].push(price as Price);
      });

      setPrices(pricesByItem);
    } catch (err) {
      if (err instanceof Error) {
        console.error('Failed to fetch prices:', {
          message: err.message,
          details: err,
          itemIds: itemIds
        });
      } else {
        console.error('Failed to fetch prices:', err);
      }
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    console.log('Items state updated:', {
      totalItems: items.length,
      filteredItems: filteredItems.length,
      itemIds: items.map(item => item.id)
    });
  }, [items, filteredItems]);

  const handleAddPrice = (itemId: string) => {
    setSelectedItemId(itemId);
    setNewItemPrice('');
    setShowPriceDialog(true);
  };

  const submitNewPrice = async () => {
    if (!pb || !selectedItemId) return;

    try {
      const price = Number.parseFloat(newItemPrice);
      if (Number.isNaN(price)) return;

      // Create a new price entry in the prices collection
      await pb.collection('prices').create({
        price: price,
        item: selectedItemId
      });

      setShowPriceDialog(false);
      setNewItemPrice('');

      // Refresh prices for this item
      await fetchPricesForItems([selectedItemId]);
    } catch (err) {
      console.error('Failed to add price:', err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!pb) return;

    try {
      // First, delete all associated prices
      try {
        // Get all prices for this item
        const priceRecords = await pb.collection('prices').getFullList({
          filter: `item = "${itemId}"`
        });

        // Delete each price record
        for (const price of priceRecords) {
          await pb.collection('prices').delete(price.id);
        }

        console.log(`Deleted ${priceRecords.length} price records for item ${itemId}`);
      } catch (priceErr) {
        console.error('Error deleting price records:', priceErr);
        // Continue with item deletion even if price deletion fails
      }

      // Now delete the item
      await pb.collection('items').delete(itemId);
      console.log(`Successfully deleted item ${itemId}`);

      // Update local state
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));

      // Remove prices from local state
      setPrices(prevPrices => {
        const newPrices = { ...prevPrices };
        delete newPrices[itemId];
        return newPrices;
      });

    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Failed to delete item: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleCreateItem = async () => {
    if (!pb || !user) return;

    try {
      if (!newItemName) return;

      // Create the new item in the items collection
      const newItem = await pb.collection('items').create({
        name: newItemName,
        description: null,
        category: null,
        User: user.id
      });

      // If a price was provided, create a price entry
      if (newItemPrice) {
        const price = Number.parseFloat(newItemPrice);
        if (!Number.isNaN(price)) {
          await pb.collection('prices').create({
            price: price,
            item: newItem.id
          });
        }
      }

      // Reset form and close dialog
      resetFormFields();
      setShowDialog(false);

      // Refresh items list
      fetchItems();
    } catch (err) {
      console.error('Failed to create item:', err);
    }
  };

  const resetFormFields = () => {
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleItemPress = (item: Item) => {
    navigation.navigate('Analytics', {
      itemId: item.id,
      itemName: item.name,
    });
  };

  const getCurrentPrice = (itemId: string): string => {
    if (prices[itemId] && prices[itemId].length > 0) {
      // Return the most recent price (prices are sorted by created date desc)
      return `$${prices[itemId][0].price.toFixed(2)}`;
    }
    return 'No price data';
  };

  const getPriceHistoryCount = (itemId: string): number => {
    if (prices[itemId]) {
      return prices[itemId].length;
    }
    return 0;
  };

  const cardEnteringStyle = (index: number) => {
    return SlideInUp
      .duration(600)
      .delay(index * 80)
      .springify()
      .damping(10)
      .withInitialValues({
        transform: [
          { translateY: 20 },
          { scale: 0.97 }
        ],
        opacity: 0.85
      });
  };

  useEffect(() => {
    const tabBarHeight = 60; // Height of the tab bar
    const styles = StyleSheet.create({
      bottomPadding: {
        height: 0, // No padding - we want content to flow into tab bar
      }
    });
  }, []);

  return (
    <AppLayout style={{ paddingBottom: 0 }}>
      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={styles.searchBarContainer}>
          <Searchbar
            placeholder="Search items"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={[styles.searchBar, { backgroundColor: colors.card, elevation: 0 }]}
            inputStyle={styles.searchInput}
            placeholderTextColor="rgba(0, 0, 0, 0.5)"
            iconColor={colors.accent}
            theme={{ colors: { primary: 'transparent' } }}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            underlineColorAndroid="transparent"
          />
        </View>
        <IconButton
          icon="plus"
          mode="contained"
          onPress={() => {
            resetFormFields();
            setShowDialog(true);
          }}
          style={[styles.addButton, { backgroundColor: colors.accent }]}
          size={24}
          iconColor="#ffffff"
        />
      </View>

      <View style={{ flex: 1, marginBottom: -60 }}>
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 0,
          }}
          style={{
            padding: 0,
            margin: 0,
            flex: 1,
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text>No items found. Add your first item!</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={SlideInUp.delay(index * 100).springify()}
              exiting={FadeOut}
              layout={Layout.springify()}
            >
              <Card
                style={[
                  index === filteredItems.length - 1 ? styles.lastCard : styles.card,
                  { backgroundColor: colors.card, shadowColor: theme === 'dark' ? '#000' : '#333' }
                ]}
                onPress={() => handleItemPress(item)}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Card.Title
                      title={item.name}
                      titleStyle={[styles.cardTitle, { color: colors.text }]}
                    />
                    <TouchableOpacity
                      style={styles.deleteIcon}
                      onPress={() => handleDeleteItem(item.id)}
                    >
                      <Icon name="trash-can-outline" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                  <Card.Content>
                    <Text style={[styles.price, { color: colors.accent }]}>Current Price: {getCurrentPrice(item.id)}</Text>
                    <Text style={{ color: colors.textSecondary }}>Price History: {getPriceHistoryCount(item.id)} entries</Text>
                  </Card.Content>
                  <Card.Actions>
                    <Button
                      onPress={() => handleAddPrice(item.id)}
                      textColor={colors.accent}
                    >
                      Add Price
                    </Button>
                  </Card.Actions>
                </View>
              </Card>
            </Animated.View>
          )}
        />
      </View>

      {/* Create New Item Dialog */}
      <Portal>
        <Dialog
          visible={showDialog}
          onDismiss={() => setShowDialog(false)}
          style={[styles.dialog, { backgroundColor: colors.card }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.text }]}>Create New Item</Dialog.Title>
          <Dialog.Content>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Item Name</Text>
              <TextInput
                value={newItemName}
                onChangeText={setNewItemName}
                style={[styles.modernInput, {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text
                }]}
                placeholder="Enter item name"
                placeholderTextColor={colors.textSecondary}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Initial Price</Text>
              <TextInput
                value={newItemPrice}
                onChangeText={setNewItemPrice}
                keyboardType="numeric"
                style={[styles.modernInput, {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text
                }]}
                placeholder="Enter initial price"
                placeholderTextColor={colors.textSecondary}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setShowDialog(false)}
              textColor={colors.textSecondary}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              onPress={handleCreateItem}
              mode="contained"
              style={[styles.createButton, { backgroundColor: colors.accent }]}
            >
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Add Price Dialog */}
      <Portal>
        <Dialog
          visible={showPriceDialog}
          onDismiss={() => setShowPriceDialog(false)}
          style={[styles.dialog, { backgroundColor: colors.card }]}
        >
          <Dialog.Title style={[styles.dialogTitle, { color: colors.text }]}>Add New Price</Dialog.Title>
          <Dialog.Content>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Price</Text>
              <TextInput
                value={newItemPrice}
                onChangeText={setNewItemPrice}
                keyboardType="numeric"
                style={[styles.modernInput, {
                  backgroundColor: colors.input,
                  borderColor: colors.inputBorder,
                  color: colors.text
                }]}
                placeholder="Enter price"
                placeholderTextColor={colors.textSecondary}
                mode="flat"
                underlineColor="transparent"
                activeUnderlineColor="transparent"
                selectionColor={colors.accent}
                cursorColor={colors.accent}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setShowPriceDialog(false)}
              textColor={colors.textSecondary}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              onPress={submitNewPrice}
              mode="contained"
              style={[styles.createButton, { backgroundColor: colors.accent }]}
            >
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  searchBarContainer: {
    flex: 1,
    marginRight: 8,
  },
  searchBar: {
    height: 40,
    borderRadius: 25,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    paddingLeft: 5,     // Add some left padding
    paddingBottom: 15,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlignVertical: 'center',
  },
  addButton: {
    margin: 0,
  },
  itemsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 80, // Add extra margin to the last card
    borderRadius: 12,
    elevation: 2,
  },
  cardContent: {
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  price: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  deleteIcon: {
    padding: 8,
  },
  input: {
    marginBottom: 12,
  },
  dialog: {
    borderRadius: 12,
    padding: 8,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 4,
    fontWeight: '500',
  },
  modernInput: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    height: 45,
  },
  dialogActions: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cancelButton: {
    borderRadius: 8,
  },
  createButton: {
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 16,
  },
});
