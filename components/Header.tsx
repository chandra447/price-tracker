import React, { ReactNode } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Constants from 'expo-constants';

// Fix the TypeScript error by properly typing children
interface HeaderProps {
    children?: ReactNode;
}

const Header = ({ children }: HeaderProps) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Price Tracker</Text>
            <View style={styles.searchContainer}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingTop: Constants.statusBarHeight + 10,
        paddingBottom: 10,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
        zIndex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 15,  // Add space between title and search
    },
    searchContainer: {
        width: '100%',
    }
});

export default Header; 