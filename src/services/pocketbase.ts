import PocketBase from 'pocketbase';
import { ClientResponseError } from 'pocketbase';
import Constants from 'expo-constants';

// Get PocketBase URL from app.config.js
const pocketbaseUrl = Constants.expoConfig?.extra?.pocketbaseUrl || 'http://localhost:8090';
console.log('Connecting to PocketBase at:', pocketbaseUrl);

const pb = new PocketBase(pocketbaseUrl);

export const loginUser = async (email: string, password: string) => {
  try {
    return await pb.collection('users').authWithPassword(email, password);
  } catch (error) {
    if (error instanceof ClientResponseError) {
      console.error('Login error details:', error.data, error.message);
      throw new Error(error.message || 'Authentication failed');
    }
    throw error;
  }
};

export const signupUser = async (username: string, email: string, password: string, passwordConfirm: string) => {
  try {
    // First create the user
    const data = {
      username,
      email,
      password,
      passwordConfirm,
      emailVisibility: true
    };

    await pb.collection('users').create(data);

    // Then login the user
    return await pb.collection('users').authWithPassword(email, password);
  } catch (error) {
    if (error instanceof ClientResponseError) {
      console.error('Signup error details:', error.data, error.message);
      throw new Error(error.message || 'Registration failed');
    }
    throw error;
  }
};

export const logoutUser = () => {
  pb.authStore.clear();
};

export const getItems = async () => {
  return await pb.collection('items').getFullList();
};

export const createItem = async (name: string, description: string) => {
  return await pb.collection('items').create({
    name,
    description,
    user: pb.authStore.model?.id
  });
};

export const deleteItem = async (id: string) => {
  return await pb.collection('items').delete(id);
};

export const addPrice = async (itemId: string, price: number) => {
  return await pb.collection('prices').create({
    item: itemId,
    price,
    user: pb.authStore.model?.id
  });
};

export const getItemPrices = async (itemId: string) => {
  return await pb.collection('prices').getFullList({
    filter: `item = "${itemId}"`,
    sort: '-created'
  });
};

export const isLoggedIn = () => {
  return pb.authStore.isValid;
};

export default pb;
