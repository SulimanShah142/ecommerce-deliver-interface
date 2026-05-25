import { Tabs } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { OneSignal } from 'react-native-onesignal';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location'; 

const BASE_URL = "http://192.168.1.4:3000"; // Replace with your running Cloudflare Hono connection address

export default function RootLayout() {
  const insets = useSafeAreaInsets();
  
  // Auth Guard Core State Hooks
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  
  // Custom Login Flow Forms State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. ONE-TIME INITIALIZATION PIPELINE
  useEffect(() => {
    // Replace with your actual OneSignal App ID string
    OneSignal.initialize("32271ebd-e2b6-4562-b765-dd50eb88b966"); 
  }, []);

  // 2. Core Authorization Lookup Mount Bootstrap Session Handshake
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const storedId = await SecureStore.getItemAsync('deliverer_id');
        if (storedId) {
          setDelivererId(storedId);
          OneSignal.login(storedId);
        }
      } catch (e) {
        console.error("⚠️ Failed to parse secure storage registry keys:", e);
      } finally {
        setIsAuthLoading(false);
      }
    };
    checkActiveSession();
  }, []);

  // 3. Stateless HTTP Login Submission Pipeline
  const handleDriverSignIn = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      return Alert.alert("Required Fields", "Please complete your login credentials.");
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/deliverer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.toLowerCase().trim(),
          password: passwordInput
        })
      });

      const data = await res.json();
      if (res.ok && data?.id) {
        await SecureStore.setItemAsync('deliverer_id', data.id.toString());
        setDelivererId(data.id.toString());
        OneSignal.login(data.id.toString());
        Alert.alert("Success", `Welcome back, ${data.name || 'Driver'}`);
      } else {
        Alert.alert("Authentication Failed", data?.error || "Invalid driver credentials provided.");
      }
    } catch (err) {
      Alert.alert("Network Error", "Could not reach dispatch servers. Check link settings.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to exit the active fleet framework?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await SecureStore.deleteItemAsync('deliverer_id');
          setDelivererId(null);
          setEmailInput('');
          setPasswordInput('');
          // Optional: Add OneSignal.logout() here if you want to stop tracking this driver
        }
      }
    ]);
  };

  // 4. UNIFIED FLAT TOP HEADER RENDERING CORE
  const renderGlobalHeader = () => (
    <View style={[styles.globalHeader, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandCluster}>
        <Image 
          source={require('@/assets/images/app-icon.jpeg')} 
          style={styles.headerLogoImage}
          resizeMode="contain"
        />
        <Text style={styles.brandTitleText}>Brand Gallery</Text>
        <View style={styles.fleetBadge}>
          <Text style={styles.fleetBadgeText}>FLEET</Text>
        </View>
      </View>

      {/* Dynamic Header Interaction Anchor (Exit trigger) */}
      <TouchableOpacity style={styles.exitActionBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#000000" />
      </TouchableOpacity>
    </View>
  );

  // 5. DYNAMIC SYSTEM TAB CLEARANCE MATRIX
  const tabBarStyleWithInsets = useMemo(() => {
    const baseHeight = 64; 
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
    return {
      ...styles.tabBar,
      height: baseHeight + bottomPadding,
      paddingBottom: bottomPadding,
    };
  }, [insets.bottom]);

  // Initializing Gate Guard
  if (isAuthLoading) {
    return (
      <View style={styles.centerFallback}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  // --- 6. RENDER INLINE EMBEDDED AUTH COMPONENT GATES IF UNVERIFIED ---
  if (!delivererId) {
    return (
      <View style={[styles.loginContainer, { paddingTop: insets.top + 40 }]}>
        <View style={styles.loginBrandingHeader}>
          <Image source={require('@/assets/images/app-icon.jpeg')} style={styles.loginCenterLogo} resizeMode="contain" />
          <Text style={styles.loginBrandTitle}>Brand Gallery</Text>
          <Text style={styles.loginBrandSubtitle}>FLEET OPERATIONS DISPATCH LOG</Text>
        </View>

        <View style={styles.loginFormBlock}>
          <View style={styles.inputWrapperField}>
            <Text style={styles.fieldInputLabel}>DISPATCH REGISTERED EMAIL</Text>
            <TextInput 
              style={styles.formInputField}
              placeholder="driver@brandgallery.com"
              placeholderTextColor="#BBBBBB"
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!submitting}
            />
          </View>

          <View style={styles.inputWrapperField}>
            <Text style={styles.fieldInputLabel}>SECURITY ACCESS PASS-KEY</Text>
            <TextInput 
              style={styles.formInputField}
              placeholder="••••••••"
              placeholderTextColor="#BBBBBB"
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              editable={!submitting}
            />
          </View>

          <TouchableOpacity 
            style={[styles.loginCommitButton, submitting && { opacity: 0.6 }]} 
            onPress={handleDriverSignIn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginCommitButtonText}>AUTHORIZE FLEET ACCESS</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- 7. UNLOCKED CORE PLATFORM TABS LAYOUT ROUTER TREE ---
  return (
    <Tabs
      screenOptions={{
        header: () => renderGlobalHeader(),
        tabBarHideOnKeyboard: true,
        tabBarStyle: tabBarStyleWithInsets,
        tabBarActiveTintColor: '#000000',
        tabBarInactiveTintColor: '#BBBBBB',
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'TASKS',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'list-sharp' : 'list-outline'} size={21} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarLabel: 'PROFILE',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person-sharp' : 'person-outline'} size={21} color={color} />
          ),
        }}
      />

      {/* CLEAN ROUTE GATES FOR SUB-PAGES HIDDEN FROM FOOTER BAR */}
      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centerFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },

  // Unified Top Branding Header
  globalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogoImage: { width: 24, height: 24 },
  brandTitleText: { fontSize: 14, fontWeight: '900', color: '#000000', letterSpacing: 1.5, textTransform: 'uppercase' },
  fleetBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 3, borderWidth: 0.5, borderColor: '#EAEAEA' },
  fleetBadgeText: { fontSize: 8, fontWeight: '900', color: '#666', letterSpacing: 0.5 },
  exitActionBtn: { padding: 4 },

  // Safe Elevated Bottom Tab Bar Architecture
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 8,
    elevation: 20, 
    shadowColor: '#000000', 
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabItem: { height: 48, justifyContent: 'center', alignAncors: 'center', alignItems: 'center' },
  tabLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },

  // 🎯 NEW STYLES: Embedded Authorize Screen Block Look
  loginContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 30 },
  loginBrandingHeader: { alignItems: 'center', marginVertical: 40 },
  loginCenterLogo: { width: 60, height: 60, marginBottom: 15 },
  loginBrandTitle: { fontSize: 20, fontWeight: '900', color: '#000000', letterSpacing: 2, textTransform: 'uppercase' },
  loginBrandSubtitle: { fontSize: 8, fontWeight: '800', color: '#999999', letterSpacing: 1, marginTop: 4 },
  loginFormBlock: { marginTop: 10 },
  inputWrapperField: { marginBottom: 24 },
  fieldInputLabel: { fontSize: 8, fontWeight: '900', color: '#888888', letterSpacing: 1, marginBottom: 8 },
  formInputField: { borderBottomWidth: 1, borderBottomColor: '#EFEFEF', paddingBy: 10, paddingVertical: 10, fontSize: 14, color: '#000000', fontWeight: '700' },
  loginCommitButton: { backgroundColor: '#000000', paddingVertical: 18, alignItems: 'center', marginTop: 15, borderRadius: 2 },
  loginCommitButtonText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 1.5, fontSize: 11 }
});
