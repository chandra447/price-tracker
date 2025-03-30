import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/auth';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';

type AccountScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function AccountScreen() {
    const { user, signOut } = useAuth();
    const navigation = useNavigation<AccountScreenNavigationProp>();
    
    const handleSignOut = async () => {
        await signOut();
        // Navigate to Login screen after signing out
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };
    
    return (
        <AppLayout title="Account Settings">
            <ScrollView style={styles.scrollView}>
                <Card style={styles.card}>
                    <Card.Content>
                        <Text variant="titleMedium">User Information</Text>
                        <Divider style={styles.divider} />
                        <Text variant="bodyMedium">Email: {user?.email}</Text>
                    </Card.Content>
                </Card>
                
                <Card style={styles.card}>
                    <Card.Content>
                        <Button 
                            mode="contained" 
                            onPress={handleSignOut}
                            style={styles.signOutButton}
                        >
                            Sign Out
                        </Button>
                    </Card.Content>
                </Card>
            </ScrollView>
        </AppLayout>
    );
}

const styles = StyleSheet.create({
    scrollView: {
        flex: 1,
        padding: 16,
    },
    card: {
        marginBottom: 16,
        elevation: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    divider: {
        marginVertical: 12,
    },
    signOutButton: {
        marginTop: 8,
        backgroundColor: '#f44336',
    },
});