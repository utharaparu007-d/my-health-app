
import { Medication, useHealthData } from '@/context/HealthDataContext';
import { useTheme } from '@/context/ThemeContext';
import { cancelMedicationReminder, registerForPushNotificationsAsync, scheduleMedicationReminder } from '@/services/NotificationService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MedicationsScreen() {
    const { colors: theme } = useTheme();
    const { medications, addMedication, deleteMedication, updateMedication, takeDose, triggerAlarm } = useHealthData();

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMedId, setEditingMedId] = useState<string | null>(null);

    const [newName, setNewName] = useState('');
    const [newDosage, setNewDosage] = useState('');
    const [newFrequency, setNewFrequency] = useState('');
    const [newSupply, setNewSupply] = useState('');
    const [newInstructions, setNewInstructions] = useState('');
    const [newTime, setNewTime] = useState('');

    useEffect(() => {
        registerForPushNotificationsAsync();
    }, []);

    const openAddModal = () => {
        setEditingMedId(null);
        resetForm();
        setModalVisible(true);
    };

    const openEditModal = (med: Medication) => {
        setEditingMedId(med.id);
        setNewName(med.name);
        setNewDosage(med.dosage);
        setNewFrequency(med.frequency);
        setNewSupply(med.supply);
        setNewInstructions(med.instructions);
        setNewTime(med.time);
        setModalVisible(true);
    };

    const handleSaveMedication = async () => {
        if (!newName || !newDosage || !newTime) {
            Alert.alert("Missing Info", "Please fill in at least Name, Dosage, and Time");
            return;
        }

        // 1. Handle Notification
        // Parse time: handle "14:00" or "2:00 PM"
        let hours = 0;
        let minutes = 0;
        let isValidTime = false;

        try {
            const timeStr = newTime.trim().toLowerCase();
            const timeParts = timeStr.match(/(\d+):?(\d*)\s*(am|pm)?/);

            if (timeParts) {
                let h = parseInt(timeParts[1], 10);
                const m = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
                const period = timeParts[3];

                if (period === 'pm' && h < 12) h += 12;
                if (period === 'am' && h === 12) h = 0;

                if (!isNaN(h) && !isNaN(m) && h >= 0 && h < 24 && m >= 0 && m < 60) {
                    hours = h;
                    minutes = m;
                    isValidTime = true;
                }
            }
        } catch (e) {
            console.error("Error parsing time", e);
        }

        let notificationId;

        // If editing, cancel old notification first
        if (editingMedId) {
            const oldMed = medications.find(m => m.id === editingMedId);
            if (oldMed?.notificationId) {
                await cancelMedicationReminder(oldMed.notificationId);
            }
        }

        // Schedule new one
        if (isValidTime) {
            notificationId = await scheduleMedicationReminder(
                `Time for ${newName}`,
                `Take ${newDosage} - ${newInstructions} `,
                hours,
                minutes
            );
        } else {
            console.warn("Invalid time format, alarm not set.");
            Alert.alert("Invalid Time", "Could not understand the time format. Alarm was not set. Try '14:00' or '2:00 PM'.");
        }

        if (editingMedId) {
            // UPDATE
            updateMedication(editingMedId, {
                name: newName,
                dosage: newDosage,
                frequency: newFrequency || 'Daily',
                time: newTime,
                supply: newSupply || '30 days',
                instructions: newInstructions || 'Follow label',
                notificationId: notificationId || undefined
            });
            Alert.alert("Updated", `Medication details updated.`);
        } else {
            // CREATE
            const newMed: Medication = {
                id: Date.now().toString(),
                name: newName,
                dosage: newDosage,
                frequency: newFrequency || 'Daily',
                time: newTime,
                supply: newSupply || '30 days',
                instructions: newInstructions || 'Follow label',
                icon: 'medkit',
                notificationId: notificationId || undefined
            };
            addMedication(newMed);
            Alert.alert("Added", `Reminder set for ${newTime}`);
        }

        setModalVisible(false);
        resetForm();
    };

    const handleDelete = async (id: string, notifId?: string) => {
        if (notifId) {
            await cancelMedicationReminder(notifId);
        }
        deleteMedication(id);
    };

    const resetForm = () => {
        setNewName('');
        setNewDosage('');
        setNewFrequency('');
        setNewSupply('');
        setNewInstructions('');
        setNewTime('');
    };

    const renderItem = ({ item }: { item: Medication }) => (
        <View style={[styles.card, { backgroundColor: theme.card }]}>
            {/* Header: Icon + Name + Freq + Actions */}
            <View style={styles.cardHeader}>
                <View style={styles.iconRow}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.background }]}>
                        <Ionicons name="medical" size={24} color={theme.primary} />
                    </View>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.medName, { color: theme.text, fontSize: 20 }]}>{item.name}</Text>
                        <View style={styles.freqRow}>
                            <Ionicons name="time-outline" size={16} color={theme.icon} />
                            <Text style={[styles.medFreq, { color: theme.icon, fontSize: 14 }]}> {item.frequency} ({item.time})</Text>
                        </View>
                    </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.actionIcon, { marginRight: 12 }]}>
                        <Ionicons name="pencil-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id, item.notificationId)} style={styles.actionIcon}>
                        <Ionicons name="trash-outline" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Grid: Dosage | Supply */}
            <View style={[styles.gridContainer, { backgroundColor: theme.background, paddingVertical: 16 }]}>
                <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.icon, fontSize: 13 }]}>DOSAGE</Text>
                    <Text style={[styles.gridValue, { color: theme.text, fontSize: 16, marginTop: 4 }]}>{item.dosage}</Text>
                </View>
                <View style={[styles.gridItem, { borderLeftWidth: 1, borderColor: theme.border, paddingLeft: 16 }]}>
                    <Text style={[styles.gridLabel, { color: theme.icon, fontSize: 13 }]}>REMAINING SUPPLY</Text>
                    <Text style={[styles.gridValue, { color: theme.text, fontSize: 16, marginTop: 4 }]}>{item.supply}</Text>
                </View>
            </View>

            {/* Instructions */}
            <View style={[styles.instructionBox, { backgroundColor: theme.primary + '15', padding: 16, borderRadius: 8, marginBottom: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="information-circle-outline" size={18} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontWeight: 'bold', marginLeft: 6 }}>Instructions</Text>
                </View>
                <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>{item.instructions}</Text>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                    takeDose(item.id);
                    Alert.alert("Dose Taken", `Logged dose for ${item.name}`);
                }}
            >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionButtonText}>Take Dose</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Medications</Text>
                    <TouchableOpacity onPress={() => {
                        if (medications.length > 0) {
                            triggerAlarm(medications[0].id);
                        } else {
                            Alert.alert('No Medications', 'Please add a medication first to test the alarm modal.');
                        }
                    }}>
                        <Text style={{ color: theme.primary, fontSize: 12, marginTop: 4 }}>🔔 Test Alarm</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: theme.primary }]}
                    onPress={openAddModal}
                >
                    <Text style={styles.addButtonText}>+ Add Medication</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={medications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={{ textAlign: 'center', marginTop: 40, color: theme.icon }}>No medications added.</Text>
                }
            />

            {/* Modal (Add/Edit) */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            {editingMedId ? 'Edit Medication' : 'Add New Medication'}
                        </Text>

                        <ScrollView>
                            <Text style={[styles.label, { color: theme.text }]}>Name</Text>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                placeholder="e.g. Paracetamol"
                                placeholderTextColor={theme.icon}
                                value={newName}
                                onChangeText={setNewName}
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[styles.label, { color: theme.text }]}>Dosage</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                        placeholder="e.g. 500mg"
                                        placeholderTextColor={theme.icon}
                                        value={newDosage}
                                        onChangeText={setNewDosage}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: theme.text }]}>Time (24h)</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                        placeholder="e.g. 14:00"
                                        placeholderTextColor={theme.icon}
                                        value={newTime}
                                        onChangeText={setNewTime}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={[styles.label, { color: theme.text }]}>Frequency</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                        placeholder="e.g. Daily"
                                        placeholderTextColor={theme.icon}
                                        value={newFrequency}
                                        onChangeText={setNewFrequency}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: theme.text }]}>Supply</Text>
                                    <TextInput
                                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                        placeholder="e.g. 30 pills"
                                        placeholderTextColor={theme.icon}
                                        value={newSupply}
                                        onChangeText={setNewSupply}
                                    />
                                </View>
                            </View>

                            <Text style={[styles.label, { color: theme.text }]}>Instructions</Text>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                placeholder="e.g. Take with food"
                                placeholderTextColor={theme.icon}
                                value={newInstructions}
                                onChangeText={setNewInstructions}
                            />
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveMedication} style={[styles.saveButton, { backgroundColor: theme.primary }]}>
                                <Text style={styles.saveButtonText}>{editingMedId ? 'Update' : 'Save & Schedule'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { padding: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    addButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    listContent: { padding: 20 },

    // Card Styles
    card: { borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
    iconRow: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    titleContainer: {},
    medName: { fontSize: 18, fontWeight: 'bold' },
    freqRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    medFreq: { fontSize: 12 },
    actionIcon: { padding: 4 }, // Updated for pencil/trash icons

    gridContainer: { flexDirection: 'row', borderRadius: 8, padding: 12, marginBottom: 12 },
    gridItem: { flex: 1, alignItems: 'flex-start', paddingHorizontal: 8 },
    gridLabel: { fontSize: 10, fontWeight: 'bold', marginBottom: 4, opacity: 0.6 },
    gridValue: { fontSize: 16, fontWeight: '600' },

    instructionBox: { padding: 10, borderRadius: 6, marginBottom: 16 },
    instructionText: { fontSize: 13, color: '#5D4037', fontStyle: 'italic' },

    actionButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8 },
    actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 16, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    label: { fontSize: 14, marginBottom: 6, opacity: 0.8 },
    input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 16, fontSize: 16 },
    row: { flexDirection: 'row' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    cancelButton: { padding: 14, flex: 1, marginRight: 8, alignItems: 'center' },
    cancelButtonText: { color: '#FF6B6B', fontWeight: 'bold' },
    saveButton: { padding: 14, borderRadius: 8, flex: 1, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontWeight: 'bold' },
});
