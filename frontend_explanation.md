# Frontend Application code

In this React Native app, the "Frontend" handles UI components, user interactions, routing, and presenting information to the user. It is built using React Native, Expo, and Expo Router.

Below is the code for the main entry point to the application (the Dashboard), representing how the UI is structured.

### 1. The Dashboard (app/index.tsx)
This file is the main screen the user sees when opening the app. It uses the `ThemeContext` for colors and `react-native-reanimated` for smooth entrance animations.

```tsx
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function Dashboard() {
    // 1. Hook to handle navigation between screens
    const router = useRouter();
    // 2. Hook to get the current app theme (Light / Dark mode)
    const { colors: theme } = useTheme();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            {/* Scrollable container with an animated fade-in-down entrance effect */}
            <Animated.ScrollView
                contentContainerStyle={styles.container}
                entering={FadeInDown.duration(500).springify()}
            >
                {/* Hero Section Container */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <LinearGradient
                        colors={['#1E88E5', '#1976D2']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.heroTitle}>Your Personal Health</Text>
                                <Text style={styles.heroTitleBold}>Assistant at Hand</Text>
                                <Text style={styles.heroSubtitle}>
                                    Track your medications, monitor vitals, and get instant answers from our AI medical assistant.
                                </Text>

                                {/* Button to navigate to the AI Chatbot screen */}
                                <TouchableOpacity
                                    style={[styles.heroButton, { backgroundColor: theme.background }]}
                                    onPress={() => router.push('/chatbot')}
                                >
                                    <Text style={styles.heroButtonText}>Ask Assistant</Text>
                                    <Ionicons name="arrow-forward" size={16} color={Colors.light.primary} style={{ marginLeft: 5 }} />
                                </TouchableOpacity>
                            </View>
                            
                            {/* Decorative Hero Section Icons */}
                            <View style={{ justifyContent: 'center', alignItems: 'center', paddingLeft: 10 }}>
                                <View style={{ position: 'relative' }}>
                                    <Ionicons name="medical" size={80} color="rgba(255,255,255,0.2)" />
                                    <Ionicons name="pulse" size={40} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', top: -10, right: -10 }} />
                                    <Ionicons name="heart" size={30} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', bottom: 0, left: -10 }} />
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Header for Quick Actions */}
                <Animated.View
                    style={styles.sectionHeaderRow}
                    entering={FadeInDown.delay(300).duration(500)}
                >
                    <View>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Health Summary</Text>
                        <Text style={[styles.sectionSubtitle, { color: theme.icon }]}>Keep track of your latest wellness data.</Text>
                    </View>
                    <View style={styles.headerActions}>
                        {/* Quick action to log a symptom */}
                        <TouchableOpacity style={[styles.outlineButton, { borderColor: theme.icon, backgroundColor: theme.background }]} onPress={() => router.push('/symptoms')}>
                            <Ionicons name="alert-circle-outline" size={20} color={theme.text} />
                            <Text style={[styles.outlineButtonText, { color: theme.text }]}>Log Symptom</Text>
                        </TouchableOpacity>
                        
                        {/* Quick action to record vitals */}
                        <TouchableOpacity style={styles.filledButton} onPress={() => router.push('/vitals')}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.filledButtonText}>Record Vitals</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Summary Widgets Row showing quick statistics at a glance */}
                <Animated.View
                    style={styles.statsContainer}
                    entering={FadeInDown.delay(500).duration(500)}
                >
                    {/* Active Meds Card */}
                    <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: '#42A5F5' }]}>
                        <Text style={[styles.statLabel, { color: theme.icon }]}>Active Meds</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        	{/* Hardcoded for demo/preview purposes here */}
                            <Text style={[styles.statValue, { color: theme.text }]}>0</Text>
                            <Ionicons name="medkit-outline" size={24} color="#42A5F5" />
                        </View>
                    </View>

                    {/* Vitals Recorded Card */}
                    <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: '#26A69A' }]}>
                        <Text style={[styles.statLabel, { color: theme.icon }]}>Vitals Recorded</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <Text style={[styles.statValue, { color: theme.text }]}>3</Text>
                            <Ionicons name="pulse" size={24} color="#26A69A" />
                        </View>
                    </View>

                    {/* Profile Status Card */}
                    <View style={[styles.statCard, { backgroundColor: theme.card, borderLeftColor: '#5C6BC0' }]}>
                        <Text style={[styles.statLabel, { color: theme.icon }]}>Profile Status</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <Text style={[styles.statValueText, { color: theme.text }]}>Incomplete</Text>
                            <Ionicons name="arrow-forward" size={18} color="#5C6BC0" />
                        </View>
                    </View>
                </Animated.View>

            </Animated.ScrollView>
        </SafeAreaView>
    );
}

// Stylesheet containing pure CSS values to layout the screen
const styles = StyleSheet.create({
    container: { padding: 20, paddingBottom: 40 },
    heroCard: {
        padding: 40, paddingVertical: 40, borderRadius: 24, marginBottom: 40, minHeight: 240, justifyContent: 'center',
        shadowColor: '#1E88E5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
    },
    heroContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    heroTitle: { fontSize: 32, color: '#fff', fontWeight: '800', letterSpacing: -0.5 },
    heroTitleBold: { fontSize: 32, color: '#fff', fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
    heroSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 16, lineHeight: 24, marginBottom: 32, maxWidth: '85%' },
    heroButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center' },
    heroButtonText: { color: Colors.light.primary, fontWeight: 'bold', fontSize: 15 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 22, fontWeight: 'bold' },
    sectionSubtitle: { fontSize: 14, marginTop: 4 },
    headerActions: { flexDirection: 'row', gap: 12 },
    outlineButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
    outlineButtonText: { marginLeft: 8, fontWeight: '600' },
    filledButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: Colors.light.primary },
    filledButtonText: { marginLeft: 8, color: '#fff', fontWeight: '600' },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
    statCard: {
        flex: 1, padding: 20, borderRadius: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, height: 120, justifyContent: 'space-between',
    },
    statLabel: { fontSize: 14, fontWeight: '500' },
    statValue: { fontSize: 32, fontWeight: 'bold' },
    statValueText: { fontSize: 20, fontWeight: 'bold' }
});
```
