import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Appbar, Searchbar, Card, Button, Text, FAB, Dialog, Portal, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePocketBase } from '../context/pocketbase';
import { useAuth } from '../context/auth';

// Define types based on the PocketBase schema
type Item = {
  id: string;
  name: string;
  description: string;
  category: string;
  user: string; // Reference to user ID
  created: string;
  updated: string;
};

type Price = {
  id: string;
  price: number;
  item: string; // Reference to item ID
  created: string;
  updated: string;
};

type RootStackParamList = {
  Dashboard: undefined;
  Analytics: { itemId: string; itemName: string };
};

export default function DashboardScreen() {
  const { pb } = usePocketBase();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [prices, setPrices] = useState<Record<string, Price[]>>({});
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (pb && user) {
      fetchItems();
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
        filter: `user = "${user.id}"`,
        sort: '-created',
      });
      
      setItems(result as unknown as Item[]);
      
      // Fetch prices for each item
      const itemIds = result.map((item: any) => item.id);
      if (itemIds.length > 0) {
        await fetchPricesForItems(itemIds);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricesForItems = async (itemIds: string[]) => {
    if (!pb) return;
    
    try {
      // Fetch prices for all items at once
      const priceResults = await pb.collection('prices').getFullList({
        filter: `item ?= "${itemIds.join('","')}"`,
        sort: '-created',
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
      console.error('Failed to fetch prices:', err);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      // Delete the item
      await pb.collection('items').delete(itemId);
      
      // Delete all associated prices
      if (prices[itemId] && prices[itemId].length > 0) {
        const priceIds = prices[itemId].map(price => price.id);
        for (const priceId of priceIds) {
          await pb.collection('prices').delete(priceId);
        }
      }
      
      // Refresh the items list
      fetchItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleCreateItem = async () => {
    if (!pb || !user) return;
    
    try {
      if (!newItemName) return;
      
      // Create the new item in the items collection
      const newItem = await pb.collection('items').create({
        name: newItemName,
        description: newItemDescription || 'N/A',
        category: newItemCategory || 'N/A',
        user: user.id // Associate with current user
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
      
      setShowDialog(false);
      resetFormFields();
      fetchItems();
    } catch (err) {
      console.error('Failed to create item:', err);
    }
  };

  const resetFormFields = () => {
    setNewItemName('');
    setNewItemDescription('');
    setNewItemCategory('');
    setNewItemPrice('');
  };

  const navigateToAnalytics = (item: Item) => {
    navigation.navigate('Analytics', {
      itemId: item.id,
      itemName: item.name
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

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.Content
          title={
            <View style={styles.titleContainer}>
              <Icon name="chart-line" size={24} style={styles.icon} />
              <Text variant="headlineSmall">Price Tracker</Text>
            </View>
          }
        />
      </Appbar.Header>

      <Searchbar
        placeholder="Search items"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.card} onPress={() => navigateToAnalytics(item)}>
            <Card.Title title={item.name} subtitle={item.category !== 'N/A' ? item.category : undefined} />
            <Card.Content>
              {item.description && item.description !== 'N/A' && (
                <Text style={styles.description}>{item.description}</Text>
              )}
              <Text style={styles.price}>Current Price: {getCurrentPrice(item.id)}</Text>
              <Text>Price History: {getPriceHistoryCount(item.id)} entries</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => handleAddPrice(item.id)}>Add Price</Button>
              <Button onPress={() => handleDeleteItem(item.id)}>Delete</Button>
            </Card.Actions>
          </Card>
        )}
        contentContainerStyle={styles.listContent}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          resetFormFields();
          setShowDialog(true);
        }}
      />

      {/* Create New Item Dialog */}
      <Portal>
        <Dialog visible={showDialog} onDismiss={() => setShowDialog(false)}>
          <Dialog.Title>Create New Item</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Item Name *"
              value={newItemName}
              onChangeText={setNewItemName}
              style={styles.input}
            />
            <TextInput
              label="Description"
              value={newItemDescription}
              onChangeText={setNewItemDescription}
              style={styles.input}
            />
            <TextInput
              label="Category"
              value={newItemCategory}
              onChangeText={setNewItemCategory}
              style={styles.input}
            />
            <TextInput
              label="Initial Price"
              value={newItemPrice}
              onChangeText={setNewItemPrice}
              keyboardType="numeric"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDialog(false)}>Cancel</Button>
            <Button onPress={handleCreateItem}>Create</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Add Price Dialog */}
      <Portal>
        <Dialog visible={showPriceDialog} onDismiss={() => setShowPriceDialog(false)}>
          <Dialog.Title>Add New Price</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Price *"
              value={newItemPrice}
              onChangeText={setNewItemPrice}
              keyboardType="numeric"
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPriceDialog(false)}>Cancel</Button>
            <Button onPress={submitNewPrice}>Add</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
    color: '#007AFF',
  },
  searchBar: {
    margin: 8,
    borderRadius: 8,
  },
  listContent: {
    padding: 8,
  },
  card: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
  },
  description: {
    marginBottom: 8,
  },
  price: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
  },
});
