import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, View, Text, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../config';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { useWS } from '../context/WebSocketContext';
import { getUnreadCount } from '../api/notifications';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { LikesScreen } from '../screens/LikesScreen';
import { MessagesScreen } from '../screens/MessagesScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
};

type MessagesStackParamList = {
  MessagesList: undefined;
  Chat: { matchId: string; name: string; otherPartyId: string; avatarUrl?: string };
};

type MainTabParamList = {
  Discover: undefined;
  Likes: undefined;
  MessagesTab: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MessagesStackNav = createNativeStackNavigator<MessagesStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MessagesStackScreen() {
  return (
    <MessagesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStackNav.Screen name="MessagesList" component={MessagesScreen} />
      <MessagesStackNav.Screen name="Chat" component={ChatScreen} />
    </MessagesStackNav.Navigator>
  );
}

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -10,
    backgroundColor: '#f87171', minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  text: { fontSize: 10, fontWeight: '700', color: '#fff' },
});

function MainTabs() {
  const { unreadNotifications, setUnreadNotifications } = useWS();

  useEffect(() => {
    getUnreadCount().then((n) => setUnreadNotifications(n)).catch(() => {});
  }, [setUnreadNotifications]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#060611',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          paddingTop: 6,
          height: 88,
        },
        tabBarActiveTintColor: '#fbbf24',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse';
          let filledName: keyof typeof Ionicons.glyphMap = 'ellipse';
          if (route.name === 'Discover') { iconName = 'compass-outline'; filledName = 'compass'; }
          if (route.name === 'Likes') { iconName = 'heart-outline'; filledName = 'heart'; }
          if (route.name === 'MessagesTab') { iconName = 'chatbubbles-outline'; filledName = 'chatbubbles'; }
          if (route.name === 'Notifications') { iconName = 'notifications-outline'; filledName = 'notifications'; }
          if (route.name === 'Profile') { iconName = 'person-outline'; filledName = 'person'; }

          return (
            <View>
              <Ionicons name={focused ? filledName : iconName} size={size} color={color} />
              {route.name === 'Notifications' && <NotificationBadge count={unreadNotifications} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Discover" component={DiscoverScreen} />
      <Tab.Screen name="Likes" component={LikesScreen} />
      <Tab.Screen name="MessagesTab" component={MessagesStackScreen} options={{ tabBarLabel: 'Messages' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function MainWithOnboarding() {
  const { user, forceShowOnboarding, setForceShowOnboarding } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    if (forceShowOnboarding) {
      setShowOnboarding(true);
      return;
    }
    if (!user.profile_id) {
      setShowOnboarding(true);
      return;
    }
    const key = `${STORAGE_KEYS.ONBOARDING_DONE_PREFIX}${user.id}`;
    SecureStore.getItemAsync(key).then((done) => {
      setShowOnboarding(done === 'true' ? false : true);
    });
  }, [user, forceShowOnboarding]);

  const handleOnboardingComplete = () => {
    if (user?.id) {
      SecureStore.setItemAsync(`${STORAGE_KEYS.ONBOARDING_DONE_PREFIX}${user.id}`, 'true');
    }
    setForceShowOnboarding(false);
    setShowOnboarding(false);
  };

  if (showOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060611', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }
  if (showOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }
  return <MainTabs />;
}

export function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060611', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#fbbf24" />
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <MainWithOnboarding />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="SignUp" component={SignUpScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
