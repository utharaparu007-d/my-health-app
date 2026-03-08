import { Colors } from '@/constants/Colors';
import { useHealthData } from '@/context/HealthDataContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function LoginScreen() {
    const { colors: theme } = useTheme();
    const router = useRouter();
    const { login } = useHealthData(); // We will implement this next

    const [name, setName] = useState('demo@gmail.com');
    const [password, setPassword] = useState('enter');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Real-time validation
    const isValidEmail = name.trim().toLowerCase().endsWith('@gmail.com');
    const isFormValid = isValidEmail && password.trim().length > 0;

    const handleLogin = async () => {
        if (!isFormValid) {
            setError('Please enter a valid Gmail address (e.g. name@gmail.com).');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Fake a short network delay for better UX
            await new Promise(resolve => setTimeout(resolve, 800));

            // Log the user in with their chosen name
            await login(name.trim());

            // Navigate into the main layout
            router.replace('/');
        } catch (err) {
            setError('Failed to log in. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.content}>
                    {/* Header Graphics */}
                    <Animated.View
                        entering={FadeInDown.duration(600).springify()}
                        style={styles.headerContainer}
                    >
                        <LinearGradient
                            colors={['#1E88E5', '#1976D2']}
                            style={styles.iconContainer}
                        >
                            <Ionicons name="medical" size={48} color="white" />
                        </LinearGradient>
                        <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
                        <Text style={[styles.subtitle, { color: theme.icon }]}>
                            Log in to access your personal health assistant
                        </Text>
                    </Animated.View>

                    {/* Form Fields */}
                    <Animated.View
                        entering={FadeInUp.delay(200).duration(600).springify()}
                        style={styles.formContainer}
                    >
                        {!!error && (
                            <View style={styles.errorContainer}>
                                <Ionicons name="alert-circle" size={20} color={Colors.light.danger} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Gmail</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Ionicons name="mail-outline" size={20} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Enter your Gmail"
                                    placeholderTextColor={theme.icon}
                                    value={name}
                                    onChangeText={(t) => { setName(t); setError(''); }}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                />
                            </View>
                            {name.length > 0 && !isValidEmail && (
                                <Text style={{ color: Colors.light.danger, fontSize: 12, marginTop: 4 }}>
                                    Must be a valid @gmail.com address
                                </Text>
                            )}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={theme.icon} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: theme.text }]}
                                    placeholder="Enter your password"
                                    placeholderTextColor={theme.icon}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setError(''); }}
                                    secureTextEntry
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.loginButton,
                                { backgroundColor: theme.primary },
                                (!isFormValid || isLoading) && { opacity: 0.7 }
                            ]}
                            onPress={handleLogin}
                            disabled={!isFormValid || isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.loginButtonText}>Enter</Text>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#1E88E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFEbee',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    errorText: {
        color: '#D32F2F',
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 52,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    loginButton: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
