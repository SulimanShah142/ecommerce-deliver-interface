import React, { useState, useEffect , useMemo} from 'react';
import { View, Text, Image, TouchableOpacity, Alert, ActivityIndicator, Platform, TextInput, StyleSheet } from 'react-native';
import { useRouter,  Tabs } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

// 🎯 THE CRITICAL CORE IMPORT: Secure the native OneSignal hardware controller channel!
import { OneSignal } from 'react-native-onesignal';
import { useBadges, BadgeProvider } from '@/Contexts/BadgeContext';

const BASE_URL = "https://brand-gallery-backend.brand-gallery.workers.dev";
const COURIER_APP_ID = "32271ebd-e2b6-4562-b765-dd50eb88b966"; // Your precise Fleet App ID

function DriverLayoutContent() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [appIsReady, setAppIsReady] = useState(false);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { delivererOrdersBadge, clearDelivererOrders } = useBadges();
  const isRTL = false;
  const locale = "en";

  // 🎯 HIGH-UTILITY MODULAR ONESIGNAL DRIVER IDENTITY MAPPER
   // 🎯 HIGH-UTILITY MODULAR ONESIGNAL DRIVER IDENTITY MAPPER
  const bindOneSignalDriverToken = async (driverId: string) => {
    try {
      const cleanDriverUuid = String(driverId).trim();
      if (!cleanDriverUuid) return;

      console.log(`📡 [ONESIGNAL FLEET] Binding hardware push tokens to Driver Alias: ${cleanDriverUuid}`);
      
      // 1. Authenticate the primary External User ID
      OneSignal.login(cleanDriverUuid);
      
      // 2. 🎯 THE CRITICAL BACKEND MATRIX SYNC FIX:
      // Map the alias for consistent backend targeting.
      OneSignal.User.addAlias("deliverer_id", cleanDriverUuid);
      OneSignal.User.addTag("role", "DELIVERER");
      OneSignal.User.addTag("driver_id", cleanDriverUuid);
      
      console.log("✅ [ONESIGNAL FLEET] Hardware registration mapped onto device lanes successfully.");
    } catch (err: any) {
      console.warn("⚠️ OneSignal device identity binding deferred:", err.message || err);
    }
  };


  // 🎯 UNIFIED PARALLEL SECURED FLEET INITIALIZATION ENGINE
  useEffect(() => {
    async function prepareFleetSystem() {
      try {
        console.log("⚙️ Booting fleet logistics infrastructure systems...");

        // 1. Hard-initialize native OneSignal parameters right on instant boot pass
        OneSignal.initialize(COURIER_APP_ID);

        // 2. Request notification privileges explicitly to ensure driver tokens compile safely
        const pushGranted = await OneSignal.Notifications.requestPermission(true);
        console.log("🔔 Driver Push Notification Authorization Status:", pushGranted);

        // 3. Resolve historical device profile sessions registry parameters keys
        const storedId = await SecureStore.getItemAsync('deliverer_id');
        
        if (storedId) {
          const cleanStoredId = String(storedId).trim();
          console.log(`📡 [SECURITY SWEEP] Verifying fleet record existence for token ID: ${cleanStoredId}`);
          
          const validationCheckResponse = await fetch(`${BASE_URL}/api/deliverer/verify-account/${cleanStoredId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }).catch(() => null);

          if (validationCheckResponse && validationCheckResponse.ok) {
            const verificationPayloadData = await validationCheckResponse.json();
            
            const isSessionGenuinelyValid = verificationPayloadData && (
              verificationPayloadData.success === true ||
              verificationPayloadData.exists === true ||
              verificationPayloadData.active === true ||
              (verificationPayloadData.id && String(verificationPayloadData.id) === cleanStoredId)
            );

            if (isSessionGenuinelyValid) {
              setDelivererId(cleanStoredId);
              await bindOneSignalDriverToken(cleanStoredId);
              console.log(`✅ [SECURE ACCESS GRANTED] Deliverer #${cleanStoredId} session active.`);
            } else {
              throw new Error("ACCOUNT_PURGED_BY_ADMINISTRATOR");
            }
          } else if (validationCheckResponse && validationCheckResponse.status === 404) {
            throw new Error("ACCOUNT_PURGED_BY_ADMINISTRATOR");
          } else {
            // Offline Fallback Mode: If server validation is offline, preserve the cached session to ensure continuity!
            setDelivererId(cleanStoredId);
            await bindOneSignalDriverToken(cleanStoredId);
            console.log(`⚠️ [OFFLINE FALLBACK] Preserving cached driver session ${cleanStoredId} while edge network is unavailable.`);
          }
        }

        // 4. Force execution delay padding for clean hardware rendering lookups
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (e: any) {
        console.warn("⚠️ [SECURITY INTERCEPT] Fleet session verification dropped:", e.message);
        
        if (e.message === "ACCOUNT_PURGED_BY_ADMINISTRATOR") {
          console.log("🚨 [FORCED LOGOUT] Orphaned session trace caught. Flushing keys down to storage disk...");
          
          await SecureStore.deleteItemAsync('deliverer_id').catch(() => {});
          await SecureStore.deleteItemAsync('deliverer_name').catch(() => {});
          await SecureStore.deleteItemAsync('deliverer_email').catch(() => {});
          
          try {
            OneSignal.logout();
          } catch {}
          
          setDelivererId(null);
          setEmailInput('');
          setPasswordInput('');
          
          Alert.alert(
            "Access Revoked", 
            "Your courier dispatch profile session is no longer active on the central fleet servers. Please contact management."
          );
          router.replace('/login');
        }
      } finally {
        setAppIsReady(true);
        SplashScreen.hideAsync().catch(() => {});
      }
    }

    prepareFleetSystem();
  }, []);

  // Stateless HTTP Login Submission Pipeline
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
        const cleanDriverId = String(data.id).trim();
        await SecureStore.setItemAsync('deliverer_id', cleanDriverId);
        if (data.name) await SecureStore.setItemAsync('deliverer_name', String(data.name).trim());
        await SecureStore.setItemAsync('deliverer_email', emailInput.toLowerCase().trim());
        
        setDelivererId(cleanDriverId);
        await bindOneSignalDriverToken(cleanDriverId);
        
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
          try {
            OneSignal.logout();
          } catch {}
          await SecureStore.deleteItemAsync('deliverer_id').catch(() => {});
          await SecureStore.deleteItemAsync('deliverer_name').catch(() => {});
          await SecureStore.deleteItemAsync('deliverer_email').catch(() => {});
          
          setDelivererId(null);
          setEmailInput('');
          setPasswordInput('');
          router.replace('/login');
        }
      }
    ]);
  };


  // UNIFIED FLAT TOP HEADER RENDERING CORE
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

  // DYNAMIC SYSTEM TAB CLEARANCE MATRIX
  const tabBarStyleWithInsets = useMemo(() => {
    const baseHeight = 56; 
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;
    return {
      ...styles.tabBar,
      height: baseHeight + bottomPadding,
      paddingBottom: bottomPadding,
    };
  }, [insets.bottom]);

  // --- 3. PREMIUM RENDER-FALLBACK BRANDED INLINE SPLASH OVERLAY CELL ---
  if (!appIsReady) {
    return (
      <View style={styles.splashContainer}>
        <Image 
          source={require('@/assets/images/splash-image.jpg')} 
          style={styles.splashImage}
          resizeMode="contain"
        />
        <View style={styles.splashFooter}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.splashSubtitle}>INITIALIZING FLEET INFRASTRUCTURE SYSTEMS...</Text>
        </View>
      </View>
    );
  }

  // --- 4. RENDER INLINE EMBEDDED AUTH COMPONENT GATES IF UNVERIFIED ---
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
   splashContainer: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    splashImage: { width: '65%', height: '40%' },
    splashFooter: { position: 'absolute', bottom: 60, alignItems: 'center', gap: 12 },
    splashSubtitle: { fontSize: 10, fontWeight: '800', color: '#999999', letterSpacing: 2, marginTop: 5 },
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
  tabBadgeIndicator: { position: 'absolute', top: -4, right: -8, backgroundColor: '#000000', minWidth: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },tabBadgeText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' }});