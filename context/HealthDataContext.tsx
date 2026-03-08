import { DatabaseService } from '@/services/DatabaseService';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Medication = {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    time: string;
    supply: string; // e.g. "34 days"
    instructions: string; // e.g. "before food"
    icon: string;
    notificationId?: string; // To cancel reminders
};

export type Symptom = {
    id: string;
    type: string;
    severity: string;
    date: string;
    icon: string;
};

export type Vital = {
    id: string;
    type: string;
    value: string;
    date: string;
    icon: string;
    color: string;
};

export type UserProfile = {
    id: string; // usually just "user_profile"
    name: string;
    email: string;
    age: string;
    gender: string;
    bloodType: string;
    height: string;
    weight: string;
    medicalConditions: string;
    allergies: string;
    emergencyContact: string;
    address: string;
};

export type NotificationItem = {
    id: string;
    title: string;
    message: string;
    date: string;
    type: 'reminder' | 'update';
    read?: boolean;
};

type HealthDataContextType = {
    // Data arrays
    medications: Medication[];
    symptoms: Symptom[];
    vitals: Vital[];
    profile: UserProfile | null;
    notifications: NotificationItem[];
    messages: any[];

    // Auth
    isAuthenticated: boolean;
    login: (name: string) => Promise<void>;
    logout: () => Promise<void>;

    // Medications
    addMedication: (med: Medication) => Promise<void>;
    deleteMedication: (id: string) => Promise<void>;
    updateMedication: (id: string, med: Partial<Medication>) => Promise<void>;
    takeDose: (id: string) => void;

    // Symptoms
    addSymptom: (sym: Symptom) => Promise<void>;
    updateSymptom: (id: string, sym: Partial<Symptom>) => Promise<void>;
    deleteSymptom: (id: string) => Promise<void>;

    // Vitals
    addVital: (vit: Vital) => Promise<void>;
    updateVital: (id: string, vit: Partial<Vital>) => Promise<void>;
    deleteVital: (id: string) => Promise<void>;

    // Profile
    updateProfile: (profile: UserProfile) => Promise<void>;

    // Alarm state
    activeAlarm: Medication | null;
    triggerAlarm: (medId: string) => void;
    stopAlarm: () => void;

    // Notifications
    addNotification: (title: string, message: string, type: 'reminder' | 'update') => Promise<void>;

    // Chatbot
    addMessage: (msg: any) => Promise<void>;
    clearMessages: () => Promise<void>;
};

const HealthDataContext = createContext<HealthDataContextType | undefined>(undefined);

export function HealthDataProvider({ children }: { children: React.ReactNode }) {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [symptoms, setSymptoms] = useState<Symptom[]>([]);
    const [vitals, setVitals] = useState<Vital[]>([]);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

    const loadData = async () => {
        await DatabaseService.initDB();

        const loadedMeds = await DatabaseService.getMedications();
        const loadedSymptoms = await DatabaseService.getSymptoms();
        const loadedVitals = await DatabaseService.getVitals();
        const loadedProfile = await DatabaseService.getProfile();
        const loadedNotifications = await DatabaseService.getNotifications();
        const loadedMessages = await DatabaseService.getMessages();

        setMedications(loadedMeds);
        setSymptoms(loadedSymptoms);
        setVitals(loadedVitals);
        setProfile(loadedProfile);
        setNotifications(loadedNotifications);
        setMessages(loadedMessages);

        // If a profile exists with a name, auto-authenticate the user on app boot
        if (loadedProfile?.name) {
            setIsAuthenticated(true);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const addNotification = async (title: string, message: string, type: 'reminder' | 'update') => {
        const notif: NotificationItem = {
            id: Date.now().toString() + Math.random().toString(36).substring(7),
            title,
            message,
            date: new Date().toISOString(),
            type,
            read: false
        };
        await DatabaseService.insertNotification(notif);
        setNotifications(prev => [notif, ...prev]);
    };

    const addMedication = async (med: Medication) => {
        await DatabaseService.insertMedication(med);
        setMedications(prev => [...prev, med]);
    };

    const deleteMedication = async (id: string) => {
        await DatabaseService.deleteMedication(id);
        setMedications(prev => prev.filter(m => m.id !== id));
        // Note: Notification cancellation should be handled in the component before calling this
    };

    const updateMedication = async (id: string, updatedMed: Partial<Medication>) => {
        await DatabaseService.updateMedication(id, updatedMed);
        setMedications(prev => prev.map(med => med.id === id ? { ...med, ...updatedMed } : med));
    };

    const takeDose = (id: string) => {
        // Logic to decrement supply could go here
        console.log(`Taken dose for ${id}`);
    };

    const addSymptom = async (sym: Symptom) => {
        await DatabaseService.insertSymptom(sym);
        setSymptoms(prev => [sym, ...prev]);
    };

    const updateSymptom = async (id: string, updatedSym: Partial<Symptom>) => {
        await DatabaseService.updateSymptom(id, updatedSym);
        setSymptoms(prev => prev.map(sym => sym.id === id ? { ...sym, ...updatedSym } : sym));
    };

    const deleteSymptom = async (id: string) => {
        await DatabaseService.deleteSymptom(id);
        setSymptoms(prev => prev.filter(s => s.id !== id));
    };

    const addVital = async (vit: Vital) => {
        await DatabaseService.insertVital(vit);
        setVitals(prev => [vit, ...prev]);
    };

    const updateVital = async (id: string, updatedVit: Partial<Vital>) => {
        await DatabaseService.updateVital(id, updatedVit);
        setVitals(prev => prev.map(vital => vital.id === id ? { ...vital, ...updatedVit } : vital));
    };

    const deleteVital = async (id: string) => {
        await DatabaseService.deleteVital(id);
        setVitals(prev => prev.filter(v => v.id !== id));
    };

    const [activeAlarm, setActiveAlarm] = useState<Medication | null>(null);

    const triggerAlarm = (medId: string) => {
        const med = medications.find(m => m.id === medId);
        if (med) {
            setActiveAlarm(med);
            addNotification(`Time for ${med.name}`, `It's time to take ${med.dosage} (${med.instructions})`, 'reminder');
        }
    };

    const stopAlarm = () => {
        setActiveAlarm(null);
    };

    // Keep track of the last time we triggered to avoid double-ringing in the same minute
    const lastTriggered = React.useRef<Record<string, string>>({});

    // Web Fallback: Check time every 10 seconds
    React.useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const todayStr = now.toDateString();

            // Check if any medication matches this time
            if (!activeAlarm) {
                const medToTake = medications.find(m => {
                    try {
                        const timeStr = m.time.trim().toLowerCase();
                        const timeParts = timeStr.match(/(\d+):?(\d*)\s*(am|pm)?/);
                        if (timeParts) {
                            let h = parseInt(timeParts[1], 10);
                            const mins = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
                            const period = timeParts[3];

                            if (period === 'pm' && h < 12) h += 12;
                            if (period === 'am' && h === 12) h = 0;

                            // If we already triggered this med today, skip it
                            if (lastTriggered.current[m.id] === todayStr) {
                                return false;
                            }

                            return h === currentHours && mins === currentMinutes;
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                    return false;
                });

                if (medToTake) {
                    lastTriggered.current[medToTake.id] = todayStr;
                    triggerAlarm(medToTake.id);
                }
            }
        }, 10000); // Check every 10 seconds for tighter precision

        return () => clearInterval(interval);
    }, [medications, activeAlarm]);

    const updateProfile = async (newProfile: UserProfile) => {
        await DatabaseService.saveProfile(newProfile);
        setProfile(newProfile);
        addNotification("Profile Updated", "Your profile information has been securely updated.", "update");
    };

    const addMessage = async (msg: any) => {
        await DatabaseService.insertMessage(msg);
        setMessages(prev => [...prev, msg]);
    };

    const clearMessages = async () => {
        await DatabaseService.clearMessages();
        setMessages([]);
    };

    const login = async (name: string) => {
        // Find or create profile with this name
        let currentProfile = profile;
        if (!currentProfile) {
            currentProfile = {
                id: 'user_profile',
                name: name,
                email: '', age: '', gender: '', bloodType: '', height: '', weight: '',
                medicalConditions: 'None', allergies: 'None', emergencyContact: '', address: ''
            };
            await updateProfile(currentProfile);
        } else if (currentProfile.name !== name) {
            currentProfile = { ...currentProfile, name };
            await updateProfile(currentProfile);
        }

        // Force a fresh pull of all user-specific data
        await loadData();
        setIsAuthenticated(true);
    };

    const logout = async () => {
        setIsAuthenticated(false);
        // Wipe local memory state temporarily until next login
        setProfile(null);
        setMedications([]);
        setVitals([]);
        setSymptoms([]);
        setMessages([]);
        setNotifications([]);
    };

    return (
        <HealthDataContext.Provider value={{
            medications, symptoms, vitals, profile, notifications, messages,
            isAuthenticated, login, logout,
            addMedication, deleteMedication, updateMedication, takeDose,
            addSymptom, updateSymptom, deleteSymptom, addVital, updateVital, deleteVital, updateProfile,
            activeAlarm, triggerAlarm, stopAlarm, addNotification,
            addMessage, clearMessages
        }}>
            {children}
        </HealthDataContext.Provider>
    );
}

export function useHealthData() {
    const context = useContext(HealthDataContext);
    if (context === undefined) {
        throw new Error('useHealthData must be used within a HealthDataProvider');
    }
    return context;
}
