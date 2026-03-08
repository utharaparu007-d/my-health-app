import { useTheme } from '@/context/ThemeContext';
import { initWebAudio, playTestSound } from '@/services/NotificationService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function AudioPermissionModal() {
    const { colors: theme } = useTheme();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            if (Platform.OS === 'web') {
                const hasGivenPermission = await AsyncStorage.getItem('audioPermissionGranted');
                if (!hasGivenPermission) {
                    setIsVisible(true);
                }
            }
        };
        checkPermission();
    }, []);

    const handleEnableAudio = async () => {
        // Initialize the audio context globally
        initWebAudio();
        // Play a tiny silent sound to ensure context is unlocked immediately without waiting
        playTestSound(true);

        // Save permission so we don't ask again
        await AsyncStorage.setItem('audioPermissionGranted', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <Modal transparent visible={isVisible} animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="notifications" size={48} color={theme.primary} />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Enable Alarms</Text>
                    <Text style={[styles.description, { color: theme.icon }]}>
                        To ensure your medication reminders ring out loud, please enable audio permissions for this application.
                    </Text>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: theme.primary }]}
                        onPress={handleEnableAudio}
                    >
                        <Text style={styles.buttonText}>Enable Audio</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        elevation: 10,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(30, 136, 229, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    button: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
});
