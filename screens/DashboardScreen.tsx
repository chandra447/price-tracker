import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Text, TextInput } from 'react-native';
import Constants from 'expo-constants';
import Header from '../components/Header';

const DashboardScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <View style={styles.container}>
            <Header>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search items"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </Header>

            <FlatList
                data={[]}
                renderItem={({ item }) => null}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f5',
    },
    header: {
        paddingTop: Constants.statusBarHeight + 10,
        paddingHorizontal: 15,
        paddingBottom: 10,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    searchContainer: {
        marginBottom: 15,
        marginTop: 5,
    },
    searchInput: {
        backgroundColor: '#f0f0f5',
        borderRadius: 20,
        padding: 10,
        paddingLeft: 40,
        height: 45,
    },
    listContent: {
        padding: 15,
        paddingTop: 5,
    },
});

export default DashboardScreen; 