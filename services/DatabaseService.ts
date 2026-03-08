import { Medication, NotificationItem, Symptom, UserProfile, Vital } from '@/context/HealthDataContext';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// We'll store the async connection here
let db: SQLite.SQLiteDatabase | null = null;

const getDB = async () => {
    if (!isWeb && !db) {
        db = await SQLite.openDatabaseAsync('health.db');
    }
    return db;
};

// Generic web helpers for persistent array data
const getWebData = <T,>(key: string): T[] => {
    if (typeof window === 'undefined') return [];
    try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch {
        return [];
    }
};

const saveWebData = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Local storage error', e);
    }
};

export const DatabaseService = {
    /**
     * Initialize all tables required for the app.
     * Call this when the app starts.
     */
    async initDB() {
        if (isWeb) {
            console.log('Web environment detected: Using LocalStorage for persistence.');
            return;
        }
        try {
            const database = await getDB();
            if (!database) return;
            await database.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS medications (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          dosage TEXT NOT NULL,
          frequency TEXT NOT NULL,
          time TEXT NOT NULL,
          supply TEXT NOT NULL,
          instructions TEXT NOT NULL,
          icon TEXT NOT NULL,
          notificationId TEXT
        );

        CREATE TABLE IF NOT EXISTS symptoms (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          severity TEXT NOT NULL,
          date TEXT NOT NULL,
          icon TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vitals (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL,
          value TEXT NOT NULL,
          date TEXT NOT NULL,
          icon TEXT NOT NULL,
          color TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profile (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          age TEXT NOT NULL,
          gender TEXT NOT NULL,
          bloodType TEXT NOT NULL,
          height TEXT NOT NULL,
          weight TEXT NOT NULL,
          medicalConditions TEXT NOT NULL,
          allergies TEXT NOT NULL,
          emergencyContact TEXT NOT NULL,
          address TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          date TEXT NOT NULL,
          type TEXT NOT NULL,
          read BOOLEAN DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY NOT NULL,
          text TEXT NOT NULL,
          sender TEXT NOT NULL,
          timestamp TEXT NOT NULL
        );
      `);

            // Migration mapping for new Profile columns
            try {
                await database.execAsync('ALTER TABLE profile ADD COLUMN height TEXT DEFAULT ""');
                await database.execAsync('ALTER TABLE profile ADD COLUMN weight TEXT DEFAULT ""');
                await database.execAsync('ALTER TABLE profile ADD COLUMN medicalConditions TEXT DEFAULT ""');
                await database.execAsync('ALTER TABLE profile ADD COLUMN allergies TEXT DEFAULT ""');
                await database.execAsync('ALTER TABLE profile ADD COLUMN address TEXT DEFAULT ""');
            } catch (e) {
                // Ignore, columns likely already exist
            }

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    },

    // --- Medications ---

    async getMedications(): Promise<Medication[]> {
        if (isWeb) return getWebData<Medication>('medications');
        try {
            const database = await getDB();
            const allRows = await database?.getAllAsync('SELECT * FROM medications');
            return (allRows as Medication[]) || [];
        } catch (error) {
            console.error('Error fetching medications:', error);
            return [];
        }
    },

    async insertMedication(med: Medication) {
        if (isWeb) {
            const meds = getWebData<Medication>('medications');
            meds.push(med);
            saveWebData('medications', meds);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync(
                'INSERT INTO medications (id, name, dosage, frequency, time, supply, instructions, icon, notificationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [med.id, med.name, med.dosage, med.frequency, med.time, med.supply, med.instructions, med.icon, med.notificationId || null]
            );
        } catch (error) {
            console.error('Error inserting medication:', error);
        }
    },

    async updateMedication(id: string, updates: Partial<Medication>) {
        if (isWeb) {
            const meds = getWebData<Medication>('medications');
            const idx = meds.findIndex(m => m.id === id);
            if (idx > -1) {
                meds[idx] = { ...meds[idx], ...updates };
                saveWebData('medications', meds);
            }
            return;
        }
        try {
            const fields = Object.keys(updates);
            if (fields.length === 0) return;

            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const values = fields.map(field => (updates as any)[field]);

            const database = await getDB();
            await database?.runAsync(
                `UPDATE medications SET ${setClause} WHERE id = ?`,
                [...values, id]
            );
        } catch (error) {
            console.error('Error updating medication:', error);
        }
    },

    async deleteMedication(id: string) {
        if (isWeb) {
            let meds = getWebData<Medication>('medications');
            meds = meds.filter(m => m.id !== id);
            saveWebData('medications', meds);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync('DELETE FROM medications WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting medication:', error);
        }
    },

    // --- Symptoms ---

    async getSymptoms(): Promise<Symptom[]> {
        if (isWeb) return getWebData<Symptom>('symptoms').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        try {
            const database = await getDB();
            const allRows = await database?.getAllAsync('SELECT * FROM symptoms ORDER BY date DESC');
            return (allRows as Symptom[]) || [];
        } catch (error) {
            console.error('Error fetching symptoms:', error);
            return [];
        }
    },

    async insertSymptom(sym: Symptom) {
        if (isWeb) {
            const syms = getWebData<Symptom>('symptoms');
            syms.unshift(sym); // Sort correctly by insertion order equivalent to sort above
            saveWebData('symptoms', syms);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync(
                'INSERT INTO symptoms (id, type, severity, date, icon) VALUES (?, ?, ?, ?, ?)',
                [sym.id, sym.type, sym.severity, sym.date, sym.icon]
            );
        } catch (error) {
            console.error('Error inserting symptom:', error);
        }
    },

    async updateSymptom(id: string, updates: Partial<Symptom>) {
        if (isWeb) {
            const syms = getWebData<Symptom>('symptoms');
            const idx = syms.findIndex(s => s.id === id);
            if (idx > -1) {
                syms[idx] = { ...syms[idx], ...updates };
                saveWebData('symptoms', syms);
            }
            return;
        }
        try {
            const fields = Object.keys(updates);
            if (fields.length === 0) return;

            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const values = fields.map(field => (updates as any)[field]);

            const database = await getDB();
            await database?.runAsync(
                `UPDATE symptoms SET ${setClause} WHERE id = ?`,
                [...values, id]
            );
        } catch (error) {
            console.error('Error updating symptom:', error);
        }
    },

    async deleteSymptom(id: string) {
        if (isWeb) {
            let syms = getWebData<Symptom>('symptoms');
            syms = syms.filter(s => s.id !== id);
            saveWebData('symptoms', syms);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync('DELETE FROM symptoms WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting symptom:', error);
        }
    },

    // --- Vitals ---

    async getVitals(): Promise<Vital[]> {
        if (isWeb) return getWebData<Vital>('vitals').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        try {
            const database = await getDB();
            const allRows = await database?.getAllAsync('SELECT * FROM vitals ORDER BY date DESC');
            return (allRows as Vital[]) || [];
        } catch (error) {
            console.error('Error fetching vitals:', error);
            return [];
        }
    },

    async insertVital(vit: Vital) {
        if (isWeb) {
            const vits = getWebData<Vital>('vitals');
            vits.unshift(vit);
            saveWebData('vitals', vits);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync(
                'INSERT INTO vitals (id, type, value, date, icon, color) VALUES (?, ?, ?, ?, ?, ?)',
                [vit.id, vit.type, vit.value, vit.date, vit.icon, vit.color]
            );
        } catch (error) {
            console.error('Error inserting vital:', error);
        }
    },

    async updateVital(id: string, updates: Partial<Vital>) {
        if (isWeb) {
            const vits = getWebData<Vital>('vitals');
            const idx = vits.findIndex(v => v.id === id);
            if (idx > -1) {
                vits[idx] = { ...vits[idx], ...updates };
                saveWebData('vitals', vits);
            }
            return;
        }
        try {
            const fields = Object.keys(updates);
            if (fields.length === 0) return;

            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const values = fields.map(field => (updates as any)[field]);

            const database = await getDB();
            await database?.runAsync(
                `UPDATE vitals SET ${setClause} WHERE id = ?`,
                [...values, id]
            );
        } catch (error) {
            console.error('Error updating vital:', error);
        }
    },

    async deleteVital(id: string) {
        if (isWeb) {
            let vits = getWebData<Vital>('vitals');
            vits = vits.filter(v => v.id !== id);
            saveWebData('vitals', vits);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync('DELETE FROM vitals WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting vital:', error);
        }
    },

    // --- Profile ---

    async getProfile(): Promise<UserProfile | null> {
        if (isWeb) {
            if (typeof window === 'undefined') return null;
            try {
                const item = window.localStorage.getItem('profile');
                return item ? JSON.parse(item) : null;
            } catch {
                return null;
            }
        }
        try {
            const database = await getDB();
            const row = await database?.getFirstAsync('SELECT * FROM profile LIMIT 1');
            return row ? (row as UserProfile) : null;
        } catch (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
    },

    async saveProfile(profile: UserProfile) {
        if (isWeb) {
            if (typeof window !== 'undefined') {
                try {
                    window.localStorage.setItem('profile', JSON.stringify(profile));
                } catch (e) {
                    console.error('Local storage error', e);
                }
            }
            return;
        }
        try {
            const database = await getDB();
            // Since we only ever have 1 profile, we can UPSERT or just DELETE and INSERT
            await database?.runAsync('DELETE FROM profile');
            await database?.runAsync(
                'INSERT INTO profile (id, name, email, age, gender, bloodType, height, weight, medicalConditions, allergies, emergencyContact, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [profile.id, profile.name, profile.email, profile.age, profile.gender, profile.bloodType, profile.height, profile.weight, profile.medicalConditions, profile.allergies, profile.emergencyContact, profile.address]
            );
        } catch (error) {
            console.error('Error saving profile:', error);
        }
    },

    // --- Notifications ---

    async getNotifications(): Promise<NotificationItem[]> {
        if (isWeb) return getWebData<NotificationItem>('notifications').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        try {
            const database = await getDB();
            const allRows = await database?.getAllAsync('SELECT * FROM notifications ORDER BY date DESC');
            return (allRows as NotificationItem[]) || [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    },

    async insertNotification(notif: NotificationItem) {
        if (isWeb) {
            const notifs = getWebData<NotificationItem>('notifications');
            notifs.unshift(notif);
            saveWebData('notifications', notifs);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync(
                'INSERT INTO notifications (id, title, message, date, type, read) VALUES (?, ?, ?, ?, ?, ?)',
                [notif.id, notif.title, notif.message, notif.date, notif.type, notif.read ? 1 : 0]
            );
        } catch (error) {
            console.error('Error inserting notification:', error);
        }
    },

    // --- Chatbot Messages ---

    async getMessages(): Promise<any[]> {
        if (isWeb) return getWebData<any>('messages').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        try {
            const database = await getDB();
            const allRows = await database?.getAllAsync('SELECT * FROM messages ORDER BY timestamp ASC');
            return (allRows as any[]) || [];
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    },

    async insertMessage(msg: any) {
        if (isWeb) {
            const messages = getWebData<any>('messages');
            messages.push(msg);
            saveWebData('messages', messages);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync(
                'INSERT INTO messages (id, text, sender, timestamp) VALUES (?, ?, ?, ?)',
                [msg.id, msg.text, msg.sender, typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString()]
            );
        } catch (error) {
            console.error('Error inserting message:', error);
        }
    },

    async clearMessages() {
        if (isWeb) {
            saveWebData('messages', []);
            return;
        }
        try {
            const database = await getDB();
            await database?.runAsync('DELETE FROM messages');
        } catch (error) {
            console.error('Error clearing messages:', error);
        }
    }
};
