import React from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import HomeScreen from './src/screens/HomeScreen';
import LogScreen from './src/screens/LogScreen';
import CourseScreen from './src/screens/CourseScreen';
import CourseDetailScreen from './src/screens/CourseDetailScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RunningScreen from './src/screens/RunningScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import WritePostScreen from './src/screens/WritePostScreen';
import PostDetailScreen from './src/screens/PostDetailScreen';
import UserSearchScreen from './src/screens/UserSearchScreen';
import RunDetailScreen from './src/screens/RunDetailScreen';
import ChallengeScreen from './src/screens/ChallengeScreen';
import ChallengeDetailScreen from './src/screens/ChallengeDetailScreen';
import GroupHomeScreen from './src/screens/GroupHomeScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Running: undefined;
  WritePost: undefined;
  PostDetail: { postId: string };
  CourseDetail: { courseId: string };
  UserSearch: undefined;
  RunDetail: { run: any };
  Challenge: undefined;
  ChallengeDetail: { challengeId: string };
  GroupHome: { groupId: string };
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

type TabParamList = {
  홈: undefined;
  기록: undefined;
  코스: undefined;
  커뮤니티: undefined;
  프로필: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<string, string> = {
  홈: '🏠', 기록: '📋', 코스: '🗺️', 커뮤니티: '👥', 프로필: '👤',
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>
            {TAB_ICONS[route.name] ?? '•'}
          </Text>
        ),
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: { height: 60, paddingBottom: 8, paddingTop: 4, backgroundColor: '#FFFFFF', borderTopColor: '#EFEFEF' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="기록" component={LogScreen} />
      <Tab.Screen name="코스" component={CourseScreen} />
      <Tab.Screen name="커뮤니티" component={CommunityScreen} />
      <Tab.Screen name="프로필" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!user) return <AuthNavigator />;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen name="Running" component={RunningScreen} options={{ presentation: 'fullScreenModal' }} />
      <RootStack.Screen name="WritePost" component={WritePostScreen} options={{ presentation: 'modal' }} />
      <RootStack.Screen name="PostDetail" component={PostDetailScreen} />
      <RootStack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <RootStack.Screen name="UserSearch" component={UserSearchScreen} />
      <RootStack.Screen name="RunDetail" component={RunDetailScreen} />
      <RootStack.Screen name="Challenge" component={ChallengeScreen} />
      <RootStack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} />
      <RootStack.Screen name="GroupHome" component={GroupHomeScreen} />
    </RootStack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
