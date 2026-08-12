// bottom tabs layout navigation setup

import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'WORKOUT',
          tabBarLabel: 'Workout',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏋️</Text>,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'HISTORY',
          tabBarLabel: 'History',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📜</Text>,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'PROGRESS',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📈</Text>,
        }}
      />
      <Tabs.Screen
        name="templates"
        options={{
          title: 'TEMPLATES',
          tabBarLabel: 'Templates',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
