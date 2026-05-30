import { Tabs } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { OneSignal } from 'react-native-onesignal';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location'; 
// 🎯 THE FIX: Imported your unified badge provider and consumption hook!
import { BadgeProvider, useBadges } from '@/Contexts/BadgeContext';

const BASE_URL = "https://brand-gallery-backend.brand-gallery.workers.dev"; // Updated to your live production address

// 🎯 PART 1: THE CHILD LAYOUT CONTENT
function DriverLayoutContent() {
  const insets = useSafeAreaInsets();
  
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 🎯 THE FIX: Consume your real-time courier orders badge state counter parameter
  const { delivererOrdersBadge, clearDelivererOrders } = useBadges();

  // 1. ONE-TIME INITIALIZATION & PUSH PERMISSION SCHEMAS
  useEffect(() => {
    OneSignal.initialize("32271ebd-e2b6-4562-b765-dd50eb88b966"); 

    // 🎯 THE FIX: Force phone to prompt push permissions on load to generate tracking ID
    OneSignal.Notifications.requestPermission(true).then((granted) => {
      console.log("🔔 Driver Push Notification Authorization Verified:", granted);
    }).catch(err => console.warn("⚠️ Push permissions initialization stalled:", err));
  }, []);

  // 2. Core Authorization Lookup
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
            <View style={{ position: 'relative' }}>
              <Ionicons name={focused ? 'list-sharp' : 'list-outline'} size={21} color={color} />
              
              {/* 🎯 THE FIX: Renders a floating notification indicator badge pill over the TASKS tab icon */}
              {delivererOrdersBadge > 0 && (
                <View style={styles.tabBadgeIndicator}>
                  <Text style={styles.tabBadgeText}>{delivererOrdersBadge}</Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: () => clearDelivererOrders() // Reset badge to 0 automatically when driver opens task list
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

      <Tabs.Screen name="orders/[id]" options={{ href: null }} />
      <Tabs.Screen name="login" options={{ href: null }} />
    </Tabs>
  );
}

// 🎯 PART 2: THE ROOT PARENT CONTAINER WRAPPER
// Encapsulates the driver app context within the BadgeProvider, resolving your ReferenceError completely!
export default function RootLayout() {
  return (
    <BadgeProvider>
      <DriverLayoutContent />
    </BadgeProvider>
  );
}

const styles = StyleSheet.create({
  centerFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  globalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  brandCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerLogoImage: { width: 24, height: 24 },
  brandTitleText: { fontSize: 14, fontWeight: '900', color: '#000000', letterSpacing: 1, textTransform: 'uppercase' },
  fleetBadge: { backgroundColor: '#000000', paddingHorizontal: 6, paddingVertical: 3 },
  fleetBadgeText: { fontSize: 8, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
 exitActionBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
 tabBar: { backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#EFEFEF' },
 tabLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5, marginTop: -2 },tabItem: { paddingTop: 6 },loginContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 30 },loginBrandingHeader: { alignItems: 'center', marginBottom: 40, marginTop: 40 },loginCenterLogo: { width: 60, height: 60, marginBottom: 16 },loginBrandTitle: { fontSize: 24, fontWeight: '900', color: '#000000', letterSpacing: 2 },loginBrandSubtitle: { fontSize: 9, fontWeight: '800', color: '#999999', letterSpacing: 1.5, marginTop: 4 },loginFormBlock: { width: '100%' },inputWrapperField: { marginBottom: 25 },fieldInputLabel: { fontSize: 9, fontWeight: '900', color: '#000000', letterSpacing: 1, marginBottom: 8 },formInputField: { borderBottomWidth: 1, borderBottomColor: '#EFEFEF', paddingVertical: 10, fontSize: 14, color: '#000000', fontWeight: '600' },loginCommitButton: { backgroundColor: '#000000', paddingVertical: 16, alignItems: 'center', borderRadius: 2, marginTop: 15 },loginCommitButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
 pillstabBadgeIndicator: { position: 'absolute', top: -4, right: -8, backgroundColor: '#000000', minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },tabBadgeText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' }});