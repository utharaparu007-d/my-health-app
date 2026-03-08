import { useHealthData, Vital } from '@/context/HealthDataContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const VITAL_TYPES = [
    { type: 'Heart Rate', icon: 'heart', color: '#EF5350', unit: 'bpm' },
    { type: 'Blood Pressure', icon: 'pulse', color: '#42A5F5', unit: 'mmHg' },
    { type: 'Weight', icon: 'body', color: '#FFA726', unit: 'kg' },
    { type: 'Temperature', icon: 'thermometer', color: '#AB47BC', unit: '°C' },
    { type: 'Blood Sugar', icon: 'water', color: '#EF5350', unit: 'mg/dL' },
    { type: 'Sleep', icon: 'moon', color: '#7E57C2', unit: 'hours' },
];

export default function VitalsScreen() {
    const { colors: theme } = useTheme();
    const { vitals, addVital, updateVital, deleteVital } = useHealthData();

    const [modalVisible, setModalVisible] = useState(false);
    const [editingVitalId, setEditingVitalId] = useState<string | null>(null);

    // Form state
    const [selectedTypeIndex, setSelectedTypeIndex] = useState(0);
    const [newValue, setNewValue] = useState('');

    const openAddModal = () => {
        setEditingVitalId(null);
        setSelectedTypeIndex(0);
        setNewValue('');
        setModalVisible(true);
    };

    const openEditModal = (vital: Vital) => {
        setEditingVitalId(vital.id);
        const typeIndex = VITAL_TYPES.findIndex(v => v.type === vital.type);
        if (typeIndex !== -1) setSelectedTypeIndex(typeIndex);

        // Extract just the number for the input, assume format is "120 bpm"
        const valOnly = vital.value.split(' ')[0];
        setNewValue(valOnly);

        setModalVisible(true);
    };

    const handleDelete = (id: string) => {
        deleteVital(id);
    };

    const handleSaveVital = async () => {
        if (newValue.trim() === '') return;

        const selected = VITAL_TYPES[selectedTypeIndex];
        const formattedValue = `${newValue.trim()} ${selected.unit}`;

        if (editingVitalId) {
            // Update
            await updateVital(editingVitalId, {
                type: selected.type,
                value: formattedValue,
                icon: selected.icon,
                color: selected.color
            });
        } else {
            // Create
            const now = new Date();
            const dateString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const newVit: Vital = {
                id: Date.now().toString(),
                type: selected.type,
                value: formattedValue,
                date: dateString,
                icon: selected.icon,
                color: selected.color
            };
            await addVital(newVit);
        }

        setModalVisible(false);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Vitals Dashboard</Text>
                <TouchableOpacity style={[styles.recordButton, { backgroundColor: theme.primary }]} onPress={openAddModal}>
                    <Text style={styles.recordButtonText}>+ Record</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={[styles.sectionTitle, { color: theme.icon }]}>Recent Readings</Text>

                {vitals.length === 0 ? (
                    <Text style={{ textAlign: 'center', marginTop: 40, color: theme.icon }}>No vitals recorded yet.</Text>
                ) : (
                    <View style={styles.grid}>
                        {vitals.map((vital) => (
                            <View
                                key={vital.id}
                                style={[styles.card, { backgroundColor: theme.card }]}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconContainer, { backgroundColor: vital.color + '20' }]}>
                                        <Ionicons name={vital.icon as any} size={28} color={vital.color} />
                                    </View>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity onPress={() => openEditModal(vital)} style={{ padding: 4 }}>
                                            <Ionicons name="pencil-outline" size={18} color={theme.primary} />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(vital.id)} style={{ padding: 4, marginLeft: 8 }}>
                                            <Ionicons name="trash-outline" size={18} color="#EF5350" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <Text style={[styles.vitalValue, { color: theme.text }]}>{vital.value}</Text>
                                <Text style={[styles.vitalType, { color: theme.icon }]}>{vital.type}</Text>
                                <Text style={[styles.vitalDate, { color: theme.icon }]}>{vital.date}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Add/Edit Vital Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>
                            {editingVitalId ? 'Edit Vital Sign' : 'Record Vital Sign'}
                        </Text>

                        <ScrollView>
                            <Text style={[styles.label, { color: theme.text }]}>Metric Type</Text>
                            <View style={styles.chipRow}>
                                {VITAL_TYPES.map((v, index) => (
                                    <TouchableOpacity
                                        key={v.type}
                                        style={[
                                            styles.chip,
                                            { borderColor: theme.border },
                                            selectedTypeIndex === index ? { backgroundColor: v.color + '20', borderColor: v.color } : null
                                        ]}
                                        onPress={() => setSelectedTypeIndex(index)}
                                    >
                                        <Ionicons
                                            name={v.icon as any}
                                            size={18}
                                            color={selectedTypeIndex === index ? v.color : theme.icon}
                                            style={{ marginRight: 6 }}
                                        />
                                        <Text style={[
                                            styles.chipText,
                                            { color: theme.text },
                                            selectedTypeIndex === index ? { color: v.color, fontWeight: 'bold' } : null
                                        ]}>{v.type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, { color: theme.text, marginTop: 24 }]}>Value ({VITAL_TYPES[selectedTypeIndex].unit})</Text>
                            <TextInput
                                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                                placeholder={`e.g. 120/80 or 75`}
                                placeholderTextColor={theme.icon}
                                value={newValue}
                                onChangeText={setNewValue}
                                keyboardType="numbers-and-punctuation"
                            />
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelButton}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleSaveVital} style={[styles.saveButton, { backgroundColor: theme.primary }]}>
                                <Text style={styles.saveButtonText}>{editingVitalId ? 'Update Record' : 'Save Record'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    recordButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    recordButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    card: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vitalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    vitalType: {
        fontSize: 14,
        marginBottom: 4,
        textAlign: 'center'
    },
    vitalDate: {
        fontSize: 12,
        textAlign: 'center'
    },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
    modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 12 },
    input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 18 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 14, fontWeight: '600' },
    modalButtons: { flexDirection: 'row', marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)' },
    cancelButton: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FF6B6B' },
    saveButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' }
});
