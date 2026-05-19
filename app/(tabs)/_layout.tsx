import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { OneSignal } from 'react-native-onesignal';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';

export default function TabLayout() {
  useEffect(() => {
    const refreshNotificationBinding = async () => {
      const delivererId = await SecureStore.getItemAsync('deliverer_id');
      if (delivererId) {
        // Ensure OneSignal is always synced with the stored ID
        OneSignal.login(delivererId);
      }
    };
    refreshNotificationBinding();
  }, []);

 return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { 
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: { 
          fontWeight: '900', 
          fontSize: 13, 
          letterSpacing: 2,
          color: '#000'
        },
        headerTitleAlign: 'center',
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#BBB',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'FLEET TASKS',
          tabBarLabel: 'TASKS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list-sharp' : 'list-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'DRIVER PROFILE',
          tabBarLabel: 'PROFILE',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-sharp' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    // Tall height to clear system nav bars
    height: Platform.OS === 'ios' ? 90 : 75,
    paddingTop: 10,
    // extra bottom padding for the Android navigation pill/buttons
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
  },
});


