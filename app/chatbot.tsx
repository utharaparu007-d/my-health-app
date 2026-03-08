import { Colors } from '@/constants/Colors';
import { useHealthData } from '@/context/HealthDataContext';
import { useTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import diseaseData from '../assets/data/DiseaseAndSymptoms.json';

type Message = {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
};

export default function ChatbotScreen() {
    const { colors: theme } = useTheme();
    const { medications, vitals, symptoms, profile, messages, addMessage, clearMessages } = useHealthData();

    // Track recent AI responses to prevent repetition
    const recentResponses = useRef<string[]>([]);

    const getPersonalizedGreeting = () => {
        const hour = new Date().getHours();
        // Use the full profile name instead of just the first word
        const name = profile?.name ? `, ${profile.name.trim()}` : '';

        if (hour < 12) return `Good morning${name}! ☀️ How are you feeling today?`;
        if (hour < 17) return `Good afternoon${name}! 🌤️ What can I help you with?`;
        return `Good evening${name}! 🌙 How has your day been healthwise?`;
    };

    useEffect(() => {
        // Only override the greeting if no messages have been sent yet, 
        // to prevent wiping chat history on active hot-reloads
        if (messages.length === 0) {
            addMessage({
                id: '1',
                text: getPersonalizedGreeting(),
                sender: 'ai',
                timestamp: new Date(),
            });
        }
    }, [profile?.name, messages.length]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Deduplicate: avoid sending a response too similar to recent ones
    const deduplicateResponse = (response: string): string => {
        const isRepeat = recentResponses.current.some(prev => {
            const overlap = prev.slice(0, 60);
            return response.startsWith(overlap);
        });

        if (isRepeat) {
            return response + "\n\n_(Is there anything else I can help you with? Feel free to ask something new!)_";
        }

        // Keep last 5 responses in memory
        recentResponses.current = [...recentResponses.current.slice(-4), response];
        return response;
    };

    const sendMessage = () => {
        if (inputText.trim() === '') return;

        const userMessage: Message = {
            id: Date.now().toString(),
            text: inputText,
            sender: 'user',
            timestamp: new Date(),
        };

        addMessage(userMessage);
        setInputText('');
        setIsTyping(true);

        setTimeout(async () => {
            const responseText = await generateResponse(userMessage.text);
            const finalText = deduplicateResponse(responseText);
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: finalText,
                sender: 'ai',
                timestamp: new Date(),
            };
            setIsTyping(false);
            addMessage(aiMessage);
        }, 600);
    };

    const fetchWikipediaSummary = async (query: string): Promise<string | null> => {
        try {
            const cleanQuery = query
                .replace(/what is|what are|who is|who are|tell me about|can you search|search for|explain/gi, '')
                .replace(/[?.,!]/g, '')
                .trim();

            if (!cleanQuery) return null;

            const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(cleanQuery)}&limit=1&namespace=0&format=json&origin=*`;
            const searchResponse = await fetch(searchUrl);
            const searchData = await searchResponse.json();
            const bestTitle = searchData[1][0];

            if (!bestTitle) return null;

            const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`;
            const summaryResponse = await fetch(summaryUrl);
            if (!summaryResponse.ok) return null;

            const data = await summaryResponse.json();
            if (data.type === 'standard' && data.extract) {
                return `**${data.title}**\n${data.extract}\n\n🔗 Read more: ${data.content_urls.desktop.page}`;
            } else if (data.type === 'disambiguation') {
                return `The term "${bestTitle}" refers to multiple things. Could you be more specific?`;
            }
            return null;
        } catch (error) {
            console.error("Wiki Error:", error);
            return null;
        }
    };

    // Build a rich, structured system prompt that forces the model to use personal data
    const buildSystemContext = () => {
        const userNameStr = profile?.name?.trim();
        const userName = userNameStr ? userNameStr.charAt(0).toUpperCase() + userNameStr.slice(1) : 'the user';
        const hasConditions = profile?.medicalConditions && profile.medicalConditions.toLowerCase() !== 'none';
        const hasAllergies = profile?.allergies && profile.allergies.toLowerCase() !== 'none';
        const hasMeds = medications.length > 0;
        const hasVitals = vitals.length > 0;
        const hasSymptoms = symptoms.length > 0;

        let context = `You are a warm, empathetic, and highly personalized AI health assistant speaking directly to ${userName}. 

Your MOST IMPORTANT rule: ALWAYS reference the user's actual health data in your responses. Never give generic advice when you have their real data. Address them by their first name occasionally to keep it personal.

=== ${userName.toUpperCase()}'S HEALTH PROFILE ===
`;
        if (profile) {
            context += `Name: ${profile.name || 'Not set'} | Age: ${profile.age || 'Not set'} | Gender: ${profile.gender || 'Not set'}
Blood Type: ${profile.bloodType || 'Unknown'} | Height: ${profile.height || 'Unknown'} | Weight: ${profile.weight || 'Unknown'}
Medical Conditions: ${profile.medicalConditions || 'None listed'}
Allergies: ${profile.allergies || 'None listed'}\n`;
        }

        context += `\n=== ACTIVE MEDICATIONS (${medications.length} total) ===\n`;
        if (hasMeds) {
            medications.forEach((m, i) => {
                context += `${i + 1}. ${m.name} — ${m.dosage}, ${m.frequency}. Notes: ${m.instructions}\n`;
            });
        } else {
            context += `No medications on record.\n`;
        }

        context += `\n=== RECENT SYMPTOMS (last 3) ===\n`;
        if (hasSymptoms) {
            symptoms.slice(0, 3).forEach((s, i) => {
                context += `${i + 1}. ${s.type} | Severity: ${s.severity} | Date: ${s.date}\n`;
            });
        } else {
            context += `No symptoms logged yet.\n`;
        }

        context += `\n=== RECENT VITALS (last 3) ===\n`;
        if (hasVitals) {
            vitals.slice(0, 3).forEach((v, i) => {
                context += `${i + 1}. ${v.type}: ${v.value} | Date: ${v.date}\n`;
            });
        } else {
            context += `No vitals logged yet.\n`;
        }

        context += `
=== BEHAVIORAL INSTRUCTIONS ===
1. PERSONALIZATION (CRITICAL): If the user asks about symptoms, medications, vitals, or general health — ALWAYS cross-reference their logged data above. Say things like "Given that you're taking ${hasMeds ? medications[0].name : '[medication]'}..." or "Looking at your recent ${hasVitals ? vitals[0].type : 'vitals'}...".

2. ALLERGY SAFETY (CRITICAL): If the user asks about something they are allergic to (check allergies above), immediately and clearly warn them.${hasAllergies ? ` ${userName} is allergic to: ${profile?.allergies}.` : ''}

3. CONDITION AWARENESS: ${hasConditions ? `${userName} has ${profile?.medicalConditions}. Always factor this into your advice.` : 'No conditions on record, give general healthy advice.'}

4. CONVERSATION STYLE:
   - Be warm and conversational, not clinical or robotic
   - Use the user's name (${userName}) occasionally but not every message
   - Keep responses concise (under 80 words) for mobile readability
   - Ask one follow-up question when appropriate to learn more about how they feel
   - Show you remember context from earlier in the conversation
   - Use empathetic phrases like "That sounds tough," or "I'm glad you're tracking that"

5. AVOID: Generic copy-paste medical disclaimers on every message. Only add "consult a doctor" when genuinely needed for serious symptoms or drug interactions.

6. DATA GAPS: If the user asks about data they haven't logged (e.g., no vitals), gently encourage them to log it: "I don't see any ${hasVitals ? '' : 'vitals'} logged yet — tracking that would help me give you better advice!"

=== MEDICAL REFERENCE HANDBOOK (DISEASES & SYMPTOMS) ===
Please use the following dictionary to detect possibilities. If a user describes symptoms that match heavily with one of these diseases, suggest it as a possibility and recommend the accompanying precautions. Do not blindly diagnose; phrase it as "Your symptoms align with [disease]. You might want to [precaution]."

${JSON.stringify(diseaseData)}
`;

        return context;
    };

    const fetchGroqResponse = async (systemPrompt: string, userQuery: string, conversationHistory: Message[]): Promise<string | null> => {
        const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
        if (!apiKey || apiKey === 'your_api_key_here') {
            console.log("No Groq API key found.");
            return null;
        }

        try {
            // Build multi-turn conversation so Groq remembers context
            let history = conversationHistory.slice(-6).map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }));

            const url = `https://api.groq.com/openai/v1/chat/completions`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...history,
                        { role: 'user', content: userQuery }
                    ],
                    temperature: 0.75,
                    max_tokens: 2000,
                    top_p: 0.9,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Groq API Error:", response.status, errorData);
                return null;
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || null;
        } catch (error) {
            console.error('Groq Fetch Error:', error);
            return null;
        }
    };

    const generateResponse = async (query: string): Promise<string> => {
        const lowerQuery = query.toLowerCase();
        const userName = profile?.name?.split(' ')[0] || '';

        // --- STEP 1: Try Groq with full conversation history and rich context ---
        try {
            const mlContext = buildSystemContext();
            const mlResponse = await fetchGroqResponse(mlContext, query, messages);
            if (mlResponse) {
                return mlResponse;
            } else {
                return "TEST_ERROR: Received a null or undefined response from Groq API!";
            }
        } catch (e: any) {
            return "TEST_ERROR: Network or Parsing Exception inside fetchGroqResponse: " + e.message;
        }

    };

    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages, isTyping]);

    const renderItem = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isUser ? styles.userBubble : [styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }]
            ]}>
                <Text style={[
                    styles.messageText,
                    isUser ? styles.userText : [styles.aiText, { color: theme.text }]
                ]}>
                    {item.text}
                </Text>
                <Text style={[
                    styles.timestamp,
                    isUser ? styles.userTimestamp : [styles.aiTimestamp, { color: theme.icon }]
                ]}>
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    const renderTypingIndicator = () => {
        if (!isTyping) return null;
        return (
            <View style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.aiText, { color: theme.icon, fontStyle: 'italic' }]}>Typing...</Text>
            </View>
        );
    };

    const confirmClearChat = () => {
        if (messages.length <= 1) return;
        // In a real app we'd use Alert.alert here, but since Expo Web doesn't 
        // strictly support native Alerts out-of-the-box smoothly without an adapter, 
        // we'll just clear it directly for now.
        clearMessages();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>AI Assistant</Text>
                <TouchableOpacity onPress={confirmClearChat} style={styles.clearButton} disabled={messages.length <= 1}>
                    <Ionicons name="trash-outline" size={20} color={messages.length <= 1 ? theme.border : theme.icon} />
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={100}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    style={styles.list}
                    ListFooterComponent={renderTypingIndicator}
                />

                <View style={[styles.inputContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
                        placeholder="Ask me about your health..."
                        placeholderTextColor={theme.icon}
                        value={inputText}
                        onChangeText={setInputText}
                        onSubmitEditing={sendMessage}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: inputText.trim() ? theme.primary : theme.border }]}
                        onPress={sendMessage}
                        disabled={!inputText.trim()}
                    >
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    clearButton: {
        padding: 4,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: Colors.light.primary,
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    aiText: {
        // dynamic color
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
    },
    userTimestamp: {
        color: 'rgba(255,255,255,0.7)',
        alignSelf: 'flex-end',
    },
    aiTimestamp: {
        alignSelf: 'flex-start',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingBottom: Platform.OS === 'ios' ? 0 : 10,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 15,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
});