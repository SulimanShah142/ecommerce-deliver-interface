import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Alert, Image } from 'react-native';
import { useRouter, useSegments, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OneSignal } from 'react-native-onesignal';
import { BadgeProvider, useBadges } from '@/Contexts/BadgeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

const COURIER_APP_ID = "32271ebd-e2b6-4562-b765-dd50eb88b966"; 
const BASE_URL = "https://brand-gallery-backend.brand-gallery.workers.dev"; 

// 🎯 CREATE TYPE-SAFE DRIVER SESSION DATA CONTEXT
type DriverAuthContextType = {
  delivererId: string | null;
  driverName: string;
  setDelivererId: (id: string | null) => void;
  syncSessionState: () => Promise<void>;
};

const DriverAuthContext = createContext<DriverAuthContextType | null>(null);

export function useDriverAuth() {
  const ctx = useContext(DriverAuthContext);
  if (!ctx) {
    throw new Error("useDriverAuth must be used inside a valid <DriverAuthContext.Provider> wrapper block.");
  }
  return ctx;
}

export default function DriverLayout() {
  const [nativeBridgeReady, setNativeBridgeReady] = useState(false);
  const [delivererId, setDelivererId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("DRIVER");

  useEffect(() => {
    async function initializeNativeContext() {
      try {
        await SplashScreen.hideAsync().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 150));
        setNativeBridgeReady(true);
      } catch {
        setNativeBridgeReady(true);
      }
    }
    initializeNativeContext();
  }, []);

  if (!nativeBridgeReady) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="small" color="#000000" />
      </View>
    );
  }

  return (
    <BadgeProvider>
      {/* 🎯 FIXED: Wraps layout context cleanly inside the active state context provider tags */}
      <DriverAuthContext.Provider value={{
        delivererId,
        driverName,
        setDelivererId,
        syncSessionState: async () => {
          const activeDiskId = await SecureStore.getItemAsync('deliverer_id');
          const activeDiskName = await SecureStore.getItemAsync('deliverer_name');
          setDelivererId(activeDiskId ? String(activeDiskId).trim() : null);
          if (activeDiskName) setDriverName(String(activeDiskName).trim());
        }
      }}>
        <DriverLayoutContent />
      </DriverAuthContext.Provider>
    </BadgeProvider>
  );
}

function DriverLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  
  const { delivererOrdersBadge } = useBadges();
  const { delivererId, setDelivererId, driverName, setDriverName } = useDriverAuth();

  const [appIsReady, setAppIsReady] = useState(false);
  const [isBootComplete, setIsBootComplete] = useState(false);

  const joinedPathSegmentString = segments.join('/');
  const isAuthViewActive = joinedPathSegmentString.includes('(auth)') || joinedPathSegmentString.includes('login');

  // Determine current active section for tab highlighted styling cues
  const currentActiveTabRoute = segments[segments.length - 1] || '';
  const isOrdersTabActive = currentActiveTabRoute === '' || currentActiveTabRoute === 'index';
  const isProfileTabActive = currentActiveTabRoute === 'profile';

  const isRTL = false; 

  const bindOneSignalDriverToken = async (driverId: string) => {
    try {
      const cleanDriverUuid = String(driverId).trim();
      if (!cleanDriverUuid) return;

      console.log(`📡 [ONESIGNAL FLEET] Binding hardware push tokens to Driver Alias: ${cleanDriverUuid}`);
      OneSignal.login(cleanDriverUuid);
      OneSignal.User.addAlias("deliverer_id", cleanDriverUuid);
      OneSignal.User.addTag("role", "DELIVERER");
      OneSignal.User.addTag("driver_id", cleanDriverUuid);
    } catch (err: any) {
      console.warn("⚠️ OneSignal device identity binding deferred:", err.message || err);
    }
  };

  // Cold Boot Logistics System Synchronizer
  useEffect(() => {
    let mounted = true;

    async function prepareFleetSystem() {
      try {
        console.log("⚙️ Booting fleet logistics infrastructure systems...");
        OneSignal.initialize(COURIER_APP_ID);
        await OneSignal.Notifications.requestPermission(true).catch(() => false);

        const storedId = await SecureStore.getItemAsync('deliverer_id');
        const storedName = await SecureStore.getItemAsync('deliverer_name');
        
        if (storedName && mounted) setDriverName(storedName);

        if (storedId) {
          const cleanStoredId = String(storedId).trim();
          
          const validationCheckResponse = await fetch(`${BASE_URL}/api/deliverer/verify-account/${cleanStoredId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }).catch(() => null);

          if (validationCheckResponse && validationCheckResponse.ok) {
            if (mounted) {
              setDelivererId(cleanStoredId);
              await bindOneSignalDriverToken(cleanStoredId);
            }
          } else {
            if (mounted) {
              setDelivererId(cleanStoredId);
              await bindOneSignalDriverToken(cleanStoredId);
            }
          }
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e: any) {
        console.warn("⚠️ Fleet session bootstrap validation skipped:", e.message);
      } finally {
        if (!mounted) return;
        setIsBootComplete(true);
        setTimeout(() => { if (mounted) setAppIsReady(true); }, 100);
      }
    }

    prepareFleetSystem();
    return () => { mounted = false; };
  }, []);

  // 🎯 ACTIVE SECURITY GATING WATCHER
  useEffect(() => {
    if (!appIsReady || !isBootComplete) return;

    const enforceSecurityPlacementGating = async () => {
      const activeDiskId = await SecureStore.getItemAsync('deliverer_id');
      const cleanToken = activeDiskId ? String(activeDiskId).trim() : null;
      const hasTokenMemoryActive = !!cleanToken;

      if (!hasTokenMemoryActive && !isAuthViewActive) {
        router.replace('/login');
      } 
      else if (hasTokenMemoryActive && isAuthViewActive) {
        router.replace('/');
      }
    };

    enforceSecurityPlacementGating();
  }, [joinedPathSegmentString, appIsReady, isBootComplete, delivererId]);

  if (!appIsReady || !isBootComplete) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('@/assets/images/splash-image.jpg')} 
          style={styles.splashImage}
          resizeMode="contain"
        />
        <View style={styles.splashFooter}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.splashSubtitle}>INITIALIZING CORE DATA SYSTEMS...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerRootViewWrapper}>
      
      {/* 🎯 TOP: RESTORED BRAND GALLERY GLOBAL HEADER BAR */}
      {!isAuthViewActive && (
        <View style={[
          styles.globalHeader, 
          { paddingTop: insets.top + 10, paddingBottom: 14 }
        ]}>
          <View style={styles.brandCluster}>
            <Image 
              source={require('@/assets/images/app-icon.jpeg')} 
              style={styles.headerLogoImage} 
              resizeMode="contain" 
            />
            <Text style={styles.brandTitleText}> Brand Gallery</Text>
          </View>
          
          <View style={styles.headerInfoCluster}>
            <Text style={styles.headerLogisticsRoleLabel}>FLEET OPERATOR:</Text>
            <Text style={styles.headerLogisticsDriverName}>{(driverName || 'COURIER').toUpperCase()}</Text>
          </View>
        </View>
      )}

      {/* CENTER SLOTS CANVAS BODY WRAPPER */}
      <View style={styles.mainSlotCanvasWrapper}>
        <Slot />
      </View>

      {/* 🎯 BOTTOM: RE-DESIGNED MINIMALIST NAVIGATION TAB BAR */}
      {!isAuthViewActive && (
        <View style={[styles.bottomTabBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          
          {/* ORDERS MANIFEST TAB LINK */}
          <TouchableOpacity 
            onPress={() => router.push('/')} 
            style={styles.tabBarItemButton}
            activeOpacity={0.75}
          >
            <View style={styles.iconBadgeWrapperCell}>
              <Ionicons 
                name={isOrdersTabActive ? "clipboard" : "clipboard-outline"} 
                size={22} 
                color={isOrdersTabActive ? "#000000" : "#8E8E93"} 
              />
              {delivererOrdersBadge > 0 && (
                <View style={styles.tabBadgeBubble}>
                  <Text style={styles.tabBadgeText}>
                    {delivererOrdersBadge > 99 ? '99+' : delivererOrdersBadge}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabBarLabelText, isOrdersTabActive && styles.tabBarLabelTextActive]}>
              ORDERS
            </Text>
          </TouchableOpacity>

          {/* PROFILE ARCHITECTURE TAB LINK */}
          <TouchableOpacity 
            onPress={() => router.push('/profile')} 
            style={styles.tabBarItemButton}
            activeOpacity={0.75}
          >
            <Ionicons 
              name={isProfileTabActive ? "person" : "person-outline"} 
              size={22} 
              color={isProfileTabActive ? "#000000" : "#8E8E93"} 
            />
            <Text style={[styles.tabBarLabelText, isProfileTabActive && styles.tabBarLabelTextActive]}>
              PROFILE
            </Text>
          </TouchableOpacity>

        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  outerRootViewWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mainSlotCanvasWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashImage: { 
    width: '70%', 
    height: '35%' 
  },
  splashFooter: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 12,
  },
  splashSubtitle: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#666666', 
    letterSpacing: 1.5, 
    textTransform: 'uppercase', 
    marginTop: 14 
  },

  // BRAND GALLERY FIXED HEADER DESIGN SYSTEM Style
  globalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F6F6F6',
  },
  brandCluster: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  brandTitleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  headerInfoCluster: {
    alignItems: 'flex-end',
  },
  headerLogisticsRoleLabel: {
    fontSize: 7,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  headerLogisticsDriverName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    marginTop: 1,
  },

  // EDITORIAL FLUID BOTTOM TAB NAVIGATION CORES
  bottomTabBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  tabBarItemButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  iconBadgeWrapperCell: {
    position: 'relative',
    paddingHorizontal: 6,
  },
  tabBarLabelText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  tabBarLabelTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  tabBadgeBubble: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#000000',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    textAlign: 'center',}});