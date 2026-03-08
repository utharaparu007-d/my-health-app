import { AlarmModal } from '@/components/AlarmModal';
import { AudioPermissionModal } from '@/components/AudioPermissionModal';
import { HealthDataProvider, useHealthData } from '@/context/HealthDataContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { initWebAudio } from '@/services/NotificationService';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import React, { useEffect } from 'react';

import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Drawer } from 'expo-router/drawer';
import { Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from './login';

function CustomDrawerContent(props: any) {
  const { colors: theme, theme: currentThemeMode } = useTheme();
  // Extract the hook outside of the inline function so React can track it properly
  const { profile, logout } = useHealthData();

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
        {/* Header */}
        <View style={{ padding: 20, paddingBottom: 10 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.primary }}>
            HealthAssistant
          </Text>
        </View>

        {/* Menu Items */}
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer - User Profile */}
      <TouchableOpacity
        style={{
          padding: 20,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12
        }}
        onPress={logout}
      >
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.primary + '20',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>
            {/* Grab first letter of their name */}
            {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
            {profile?.name || 'Demo User'}
          </Text>
          <Text style={{ fontSize: 12, color: theme.icon }}>Tap to Logout</Text>
        </View>
        <Ionicons name="log-out-outline" size={20} color={theme.icon} />
      </TouchableOpacity>
    </View>
  );
}

function DrawerLayout() {
  const { colors: theme, theme: currentThemeMode } = useTheme();
  const { isAuthenticated } = useHealthData();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AudioPermissionModal />
      <AlarmModal />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.background },
          drawerActiveTintColor: theme.primary,
          drawerActiveBackgroundColor: currentThemeMode === 'dark' ? '#1E88E520' : '#E3F2FD',
          drawerInactiveTintColor: theme.icon,
          drawerItemStyle: { borderRadius: 12, paddingHorizontal: 16 },
          drawerLabelStyle: { marginLeft: -10 },
          drawerStyle: {
            backgroundColor: theme.background,
            width: 280,
            borderRightWidth: 0,
          },
          headerShadowVisible: false,
          drawerType: isLargeScreen ? 'permanent' : 'front',
          headerShown: false,
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            title: 'Health Assistant',
            drawerIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="medications"
          options={{
            drawerLabel: 'Medications',
            title: 'Medications',
            drawerIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="symptoms"
          options={{
            drawerLabel: 'Symptoms',
            title: 'Symptoms',
            drawerIcon: ({ color }) => <Ionicons name="pulse-outline" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="vitals"
          options={{
            drawerLabel: 'Vitals',
            title: 'Vitals',
            drawerIcon: ({ color }) => <Ionicons name="heart-outline" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="chatbot"
          options={{
            drawerLabel: 'AI Assistant',
            title: 'AI Assistant',
            drawerIcon: ({ color }) => <Ionicons name="chatbubble-ellipses-outline" size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="profile"
          options={{
            drawerLabel: 'Profile',
            title: 'Profile',
            drawerIcon: ({ color }) => <Ionicons name="person-outline" size={22} color={color} />,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  // We need to use a child component to access the context we just provided
  return (
    <ThemeProvider>
      <HealthDataProvider>
        <RootLayoutInner />
      </HealthDataProvider>
    </ThemeProvider>
  );
}

function RootLayoutInner() {
  const { theme } = useTheme();
  const { triggerAlarm, medications } = useHealthData();

  useEffect(() => {
    // Attempt to unlock AudioContext on first web load
    initWebAudio();

    // Listen for incoming notifications while the app is open
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      // Extract medication info from the notification (we passed title as "Time for [Name]")
      // A more robust way would be to pass the ID in the notification data, but for now we match by title
      const title = notification.request.content.title;
      if (title && title.startsWith("Time for ")) {
        const medName = title.replace("Time for ", "");
        const med = medications.find(m => m.name === medName);
        if (med) {
          triggerAlarm(med.id);
        }
      } else if (title === "🔔 Test Alarm") {
        // For the test alarm, we'll just trigger the first medication as a demo if one exists
        if (medications.length > 0) {
          triggerAlarm(medications[0].id);
        }
      }
    });

    return () => subscription.remove();
  }, [medications, triggerAlarm]);

  return (
    <View style={{ flex: 1, backgroundColor: theme === 'dark' ? '#121212' : '#F5F7FA' }}>
      <DrawerLayout />
    </View>
  );
}
