import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Failed to get push token for push notification!');
            return;
        }
        // token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
        // alert('Must use physical device for Push Notifications');
    }

    return token;
}

export async function scheduleMedicationReminder(title: string, body: string, hours: number, minutes: number) {
    try {
        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                hour: hours,
                minute: minutes,
                repeats: true,
            },
        });
        return id;
    } catch (error) {
        console.error("Error scheduling notification:", error);
        return null;
    }
}

export async function cancelMedicationReminder(notificationId: string) {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
        console.error("Error canceling notification:", error);
    }
}

let cachedAudioCtx: any = null;

export function initWebAudio() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext && !cachedAudioCtx) {
            cachedAudioCtx = new AudioContext();

            // Attach a global listener to unlock audio on the very first interaction
            const unlock = () => {
                if (cachedAudioCtx && cachedAudioCtx.state === 'suspended') {
                    cachedAudioCtx.resume();
                }
                document.removeEventListener('click', unlock);
                document.removeEventListener('touchstart', unlock);
                document.removeEventListener('keydown', unlock);
            };

            document.addEventListener('click', unlock);
            document.addEventListener('touchstart', unlock);
            document.addEventListener('keydown', unlock);
        }
    }
}

export async function playTestSound(silent: boolean = false) {
    if (Platform.OS === 'web') {
        // Web: Use Web Audio API for a reliable alarm ringtone
        try {
            if (!cachedAudioCtx) {
                initWebAudio();
            }

            if (cachedAudioCtx && cachedAudioCtx.state === 'suspended') {
                await cachedAudioCtx.resume();
            }

            // Create oscillator for an urgent digital alarm sound
            const oscillator = cachedAudioCtx.createOscillator();
            const gainNode = cachedAudioCtx.createGain();

            oscillator.type = 'square'; // Square wave for a harsh/digital sound
            oscillator.frequency.setValueAtTime(800, cachedAudioCtx.currentTime); // High pitch

            oscillator.connect(gainNode);
            gainNode.connect(cachedAudioCtx.destination);

            const now = cachedAudioCtx.currentTime;

            if (silent) {
                gainNode.gain.setValueAtTime(0, now);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                return;
            }

            // Fast beeping pattern: beep-beep-beep-pause (digital alarm style)
            const pattern = [];
            // Create 4 bursts of 3 short beeps
            for (let burst = 0; burst < 4; burst++) {
                const burstStart = burst * 1.5; // Starts every 1.5 seconds
                for (let beep = 0; beep < 3; beep++) {
                    const start = burstStart + (beep * 0.2);
                    pattern.push({ on: start, off: start + 0.1 });
                }
            }

            // Start at 0 volume
            gainNode.gain.setValueAtTime(0, now);

            // Schedule the envelopes for each beep
            pattern.forEach(p => {
                gainNode.gain.setValueAtTime(0, now + p.on);
                gainNode.gain.linearRampToValueAtTime(0.3, now + p.on + 0.01);
                gainNode.gain.linearRampToValueAtTime(0.3, now + p.off - 0.01);
                gainNode.gain.linearRampToValueAtTime(0, now + p.off);
            });

            oscillator.start(now);
            oscillator.stop(now + 6.0); // Stop after all bursts are done

            console.log("🔔 Alarm Trace: Playing urgent alarm on web.");
        } catch (error) {
            console.error("Web Audio Error:", error);
        }
    } else {
        // Native: Use Expo Notifications
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "🔔 Test Alarm",
                body: "This is what your medication reminder sounds like.",
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // Immediate
        });
    }
}
