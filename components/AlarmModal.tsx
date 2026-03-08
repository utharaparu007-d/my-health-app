import { useHealthData } from '@/context/HealthDataContext';
import { useTheme } from '@/context/ThemeContext';
import { playTestSound } from '@/services/NotificationService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function AlarmModal() {
    const { activeAlarm, stopAlarm, takeDose } = useHealthData();
    const { colors: theme } = useTheme();
    const [audioInterval, setAudioInterval] = useState<number | null>(null);

    // Effect to handle ringing
    useEffect(() => {
        if (activeAlarm) {
            // Play initially
            playTestSound();

            // Set up interval to keep playing every 8 seconds (gives time for the 6s pattern to finish)
            const interval = window.setInterval(() => {
                playTestSound();
            }, 8000);

            setAudioInterval(interval as unknown as number);
        } else {
            // Stop alarm
            if (audioInterval) {
                clearInterval(audioInterval);
                setAudioInterval(null);
            }
        }

        return () => {
            if (audioInterval) clearInterval(audioInterval);
        };
    }, [activeAlarm]);

    if (!activeAlarm) return null;

    const handleTakeDose = () => {
        takeDose(activeAlarm.id);
        stopAlarm();
    };

    const handleSnooze = () => {
        // Just stop ringing for now, could implement complex snooze logic
        stopAlarm();
    };

    return (
        <Modal
            transparent
            visible={!!activeAlarm}
            animationType="slide"
        >
            <View style={styles.overlay}>
                <View style={[styles.modalBox, { backgroundColor: theme.card, borderColor: theme.border }]}>

                    <View style={styles.iconContainer}>
                        <Ionicons name="alarm" size={64} color="#EF5350" />
                    </View>

                    <Text style={[styles.title, { color: theme.text }]}>
                        Time for Medication!
                    </Text>

                    <View style={[styles.medInfo, { backgroundColor: theme.background }]}>
                        <Text style={[styles.medName, { color: theme.primary }]}>{activeAlarm.name}</Text>
                        <Text style={[styles.medDetails, { color: theme.text }]}>{activeAlarm.dosage}</Text>
                        <Text style={[styles.medInstructions, { color: theme.icon }]}>{activeAlarm.instructions}</Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.button, styles.snoozeButton, { borderColor: theme.border }]}
                            onPress={handleSnooze}
                        >
                            <Text style={[styles.buttonText, { color: theme.text }]}>Dismiss</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.takeButton]}
                            onPress={handleTakeDose}
                        >
                            <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                            <Text style={styles.takeButtonText}>Take Medicine</Text>
                        </TouchableOpacity>
                    </View>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalBox: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EF535020',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    medInfo: {
        width: '100%',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 32,
    },
    medName: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    medDetails: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    medInstructions: {
        fontSize: 16,
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    button: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    snoozeButton: {
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    takeButton: {
        backgroundColor: '#4CAF50',
    },
    buttonText: {
        fontSize: 18,
        fontWeight: '600',
    },
    takeButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    }
});
