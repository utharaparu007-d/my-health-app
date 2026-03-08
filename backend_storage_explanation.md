# Backend Storage & Settings Application Code

In this standalone mobile app, there is no remote cloud server. Instead, it uses local storage on the user's device. Below is the full code for the "Backend" logic, which utilizes SQLite to hold and maintain user information.

### 1. The Local Database Service (services/DatabaseService.ts)
This file performs Local SQL database interactions (`create tables`, `insert`, `update`, `delete` queries). It acts as the back-end API locally.

```typescript
import { Medication, Symptom, UserProfile, Vital } from '@/context/HealthDataContext';
import * as SQLite from 'expo-sqlite';

// Memory pointer to the SQLite Connection
let db: SQLite.SQLiteDatabase | null = null;

// Helper to open the db securely
const getDB = async () => {
    if (!db) {
        db = await SQLite.openDatabaseAsync('health.db');
    }
    return db;
};

export const DatabaseService = {
    /**
     * Initialize all tables required for the app.
     * Starts automatically when the app launches to ensure tables exist before reading.
     */
    async initDB() {
        try {
            const database = await getDB();
            // A long SQL string creating all local SQL device storage tables
            await database.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS medications (
          id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, dosage TEXT NOT NULL,
          frequency TEXT NOT NULL, time TEXT NOT NULL, supply TEXT NOT NULL,
          instructions TEXT NOT NULL, icon TEXT NOT NULL, notificationId TEXT
        );

        CREATE TABLE IF NOT EXISTS symptoms (
          id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, severity TEXT NOT NULL,
          date TEXT NOT NULL, icon TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vitals (
          id TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, value TEXT NOT NULL,
          date TEXT NOT NULL, icon TEXT NOT NULL, color TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS profile (
          id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
          age TEXT NOT NULL, gender TEXT NOT NULL, bloodType TEXT NOT NULL,
          height TEXT NOT NULL, weight TEXT NOT NULL, medicalConditions TEXT NOT NULL,
          allergies TEXT NOT NULL, emergencyContact TEXT NOT NULL
        );
      `);

            // Migration mapping for new Profile columns
            try {
                await database.execAsync('ALTER TABLE profile ADD COLUMN height TEXT DEFAULT ""');
                await database.execAsync('ALTER TABLE profile ADD COLUMN weight TEXT DEFAULT ""');
                await database.execAsync('ALTER TABLE profile ADD COLUMN medicalConditions TEXT DEFAULT ""');
                await database.execAsync('ALTER TABLE profile ADD COLUMN allergies TEXT DEFAULT ""');
            } catch (e) {
                // Ignore, columns already exist
            }

            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Error initializing database:', error);
        }
    },

    // --- Medications Storage CRUD Methods ---

    // Reads all medication rows
    async getMedications(): Promise<Medication[]> {
        try {
            const database = await getDB();
            const allRows = await database.getAllAsync('SELECT * FROM medications');
            return allRows as Medication[];
        } catch (error) {
            return [];
        }
    },

    // Creates a new medication row
    async insertMedication(med: Medication) {
        try {
            const database = await getDB();
            await database.runAsync(
                'INSERT INTO medications (id, name, dosage, frequency, time, supply, instructions, icon, notificationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [med.id, med.name, med.dosage, med.frequency, med.time, med.supply, med.instructions, med.icon, med.notificationId || null]
            );
        } catch (error) {
            console.error('Error inserting medication:', error);
        }
    },

    // Updates an existing medication (partially fields update)
    async updateMedication(id: string, updates: Partial<Medication>) {
        try {
            // Build dynamic UPDATE query based on passed fields
            const fields = Object.keys(updates);
            if (fields.length === 0) return;

            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const values = fields.map(field => (updates as any)[field]);

            const database = await getDB();
            await database.runAsync(
                `UPDATE medications SET ${setClause} WHERE id = ?`,
                [...values, id]
            );
        } catch (error) {
            console.error('Error updating medication:', error);
        }
    },

    // Deletes the row directly 
    async deleteMedication(id: string) {
        try {
            const database = await getDB();
            await database.runAsync('DELETE FROM medications WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting medication:', error);
        }
    },

    // --- Symptoms Storage CRUD Methods ---

    async getSymptoms(): Promise<Symptom[]> {
        try {
            const database = await getDB();
            const allRows = await database.getAllAsync('SELECT * FROM symptoms ORDER BY date DESC');
            return allRows as Symptom[];
        } catch (error) {
            return [];
        }
    },

    async insertSymptom(sym: Symptom) {
        try {
            const database = await getDB();
            await database.runAsync(
                'INSERT INTO symptoms (id, type, severity, date, icon) VALUES (?, ?, ?, ?, ?)',
                [sym.id, sym.type, sym.severity, sym.date, sym.icon]
            );
        } catch (error) {
            console.error('Error inserting symptom:', error);
        }
    },

    // --- Vitals Storage Crud Methods ---

    async getVitals(): Promise<Vital[]> {
        try {
            const database = await getDB();
            const allRows = await database.getAllAsync('SELECT * FROM vitals ORDER BY date DESC');
            return allRows as Vital[];
        } catch (error) {
            return [];
        }
    },

    async insertVital(vit: Vital) {
        try {
            const database = await getDB();
            await database.runAsync(
                'INSERT INTO vitals (id, type, value, date, icon, color) VALUES (?, ?, ?, ?, ?, ?)',
                [vit.id, vit.type, vit.value, vit.date, vit.icon, vit.color]
            );
        } catch (error) {
            console.error('Error inserting vital:', error);
        }
    },

    async updateVital(id: string, updates: Partial<Vital>) {
        try {
            const fields = Object.keys(updates);
            if (fields.length === 0) return;

            const setClause = fields.map(field => `${field} = ?`).join(', ');
            const values = fields.map(field => (updates as any)[field]);

            const database = await getDB();
            await database.runAsync(
                `UPDATE vitals SET ${setClause} WHERE id = ?`,
                [...values, id]
            );
        } catch (error) {
            console.error('Error updating vital:', error);
        }
    },

    async deleteVital(id: string) {
        try {
            const database = await getDB();
            await database.runAsync('DELETE FROM vitals WHERE id = ?', [id]);
        } catch (error) {
            console.error('Error deleting vital:', error);
        }
    },

    // --- Profile CRUD Storage Methods ---

    async getProfile(): Promise<UserProfile | null> {
        try {
            const database = await getDB();
            const row = await database.getFirstAsync('SELECT * FROM profile LIMIT 1');
            return row ? (row as UserProfile) : null;
        } catch (error) {
            return null;
        }
    },

    async saveProfile(profile: UserProfile) {
        try {
            const database = await getDB();
            // Since we only ever have 1 profile per device logged in, we wipe and rewrite it
            await database.runAsync('DELETE FROM profile');
            await database.runAsync(
                'INSERT INTO profile (id, name, email, age, gender, bloodType, height, weight, medicalConditions, allergies, emergencyContact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [profile.id, profile.name, profile.email, profile.age, profile.gender, profile.bloodType, profile.height, profile.weight, profile.medicalConditions, profile.allergies, profile.emergencyContact]
            );
        } catch (error) {
            console.error('Error saving profile:', error);
        }
    }
};
```
