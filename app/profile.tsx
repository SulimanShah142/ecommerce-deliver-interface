import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { OneSignal } from 'react-native-onesignal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BASE_URL = "https://brand-gallery-backend.brand-gallery.workers.dev";

export default function DelivererProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [delivererId, setDelivererId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // 🎯 HIGH-UTILITY SECURE PERFORMANCE STATE BUCKETS
  const [stats, setStats] = useState({
    rating: '5.00',
    totalDeliveries: 0 // Keep as native number to prevent parsing faults
  });

  useEffect(() => {
    let isMounted = true;

    const loadInfoAndStats = async () => {
      try {
        if (isMounted) setLoading(true);
        
        const storedId = await SecureStore.getItemAsync('deliverer_id');
        const storedName = await SecureStore.getItemAsync('deliverer_name');
        const storedEmail = await SecureStore.getItemAsync('deliverer_email');
        
        const cleanId = storedId ? String(storedId).trim() : '';
        
        if (isMounted) {
          setDelivererId(cleanId);
          setName(storedName || 'Fleet Operator');
          setEmail(storedEmail || 'fleet@gallery.af');
        }

        if (cleanId && cleanId !== "undefined" && cleanId !== "null") {
          console.log(`📡 [TELEMETRY LOOP] Pinging central postgres cluster for Driver #${cleanId}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const res = await fetch(`${BASE_URL}/api/deliverer/stats/${cleanId}`, {
            signal: controller.signal
          }).catch(() => null);
          
          clearTimeout(timeoutId);

          if (res && res.ok) {
            const statsData = await res.json();
            console.log("✅ [TELEMETRY SUCCESS] Driver analytics footprint retrieved:", statsData);
            
            if (isMounted) {
              // 🎯 THE SECURE HYDRATION FIX: 
              // Coerce incoming database parameters explicitly with safe fallbacks 
              // to completely stop number rendering crashes!
              const fetchedRating = parseFloat(statsData?.averageRating || statsData?.rating || '5.00');
              const fetchedCount = parseInt(String(statsData?.completedCount || statsData?.count || '0'), 10);

              setStats({
                rating: !isNaN(fetchedRating) ? fetchedRating.toFixed(2) : '5.00',
                totalDeliveries: !isNaN(fetchedCount) ? fetchedCount : 0
              });
            }
          } else {
            console.warn(`⚠️ Central telemetry endpoint returned status code: ${res?.status}`);
          }
        }
      } catch (err: any) {
        console.warn("⚠️ Telemetry routing pipeline skipped:", err.message || err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    loadInfoAndStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of the active fleet framework?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Log Out", 
        style: "destructive",
        onPress: async () => {
          try {
            OneSignal.logout();
            await SecureStore.deleteItemAsync('deliverer_id').catch(() => {});
            await SecureStore.deleteItemAsync('deliverer_name').catch(() => {});
            await SecureStore.deleteItemAsync('deliverer_email').catch(() => {});
          } catch {}
          router.replace('/login');
        }
      }
    ]);
  };
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#000000" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* PREMIUM MONOCHROME PROFILE AVATAR BLOCK */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsCircleText}>{name?.[0]?.toUpperCase() || 'F'}</Text>
            </View>
            <View style={styles.onlineHardwareSignalBullet} />
          </View>
          
          <Text style={styles.driverNameLabel}>{name ? name.toUpperCase() : 'DRIVER'}</Text>
          
          <View style={styles.solidStatusBadge}>
            <Text style={styles.solidStatusBadgeText}>ACTIVE FLEET</Text>
          </View>
          <View style={styles.hollowIdBadge}>
            <Text style={styles.hollowIdBadgeText}>DRIVER #{delivererId ? delivererId.substring(0, 5).toUpperCase() : '7792'}</Text>
          </View>
        </View>

        {/* HIGH-UTILITY GRID PERFORMANCE STATS */}
        <View style={styles.telemetryGridRow}>
          <View style={styles.telemetryGridItem}>
            <Ionicons name="star" size={14} color="#000000" />
            <Text style={styles.telemetryValueText}>{stats.rating} ★</Text>
            <Text style={styles.telemetryLabelText}>FLEET RATING</Text>
          </View>
          
          <View style={[styles.telemetryGridItem, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F5F5F5' }]}>
            <Ionicons name="checkmark-done" size={14} color="#000000" />
            {/* 🎯 THE FORMATTING FIX: Formats safe numeric primitives cleanly */}
            <Text style={styles.telemetryValueText}>
              {stats.totalDeliveries.toLocaleString('en-US')}
            </Text>
            <Text style={styles.telemetryLabelText}>DELIVERIES</Text>
          </View>
          
          <View style={styles.telemetryGridItem}>
            <Ionicons name="flash" size={14} color="#000000" />
            <Text style={styles.telemetryValueText}>99.2%</Text>
            <Text style={styles.telemetryLabelText}>ON TIME</Text>
          </View>
        </View>

        {/* COMPLIANT SYSTEM DETAILS LIST SECTION */}
        <View style={styles.detailsSectionWrapper}>
          <Text style={styles.detailsSectionHeading}>OPERATIONAL FIELD CREDENTIALS</Text>
          
          <View style={styles.infoLineSlat}>
            <View style={styles.slatIconWrap}>
              <Ionicons name="mail-outline" size={18} color="#000000" />
            </View>
            <View style={styles.slatContentBlock}>
              <Text style={styles.metaLabelText}>DISPATCH ACCOUNT EMAIL</Text>
              <Text style={styles.metaValueText}>{email}</Text>
            </View>
          </View>

          <View style={styles.infoLineSlat}>
            <View style={styles.slatIconWrap}>
              <Ionicons name="bicycle-outline" size={18} color="#000000" />
            </View>
            <View style={styles.slatContentBlock}>
              <Text style={styles.metaLabelText}>COURIER ASSIGNMENT MODE</Text>
              <Text style={styles.metaValueText}>Full-time Express Delivery</Text>
            </View>
          </View>

          <View style={styles.infoLineSlat}>
            <View style={styles.slatIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#000000" />
            </View>
            <View style={styles.slatContentBlock}>
              <Text style={styles.metaLabelText}>FLEET INSURANCE STATUS</Text>
              <Text style={styles.metaValueText}>Verified Operational Escrow</Text>
            </View>
          </View>
        </View>

        {/* SYSTEM ACTIONS FOOTER PANEL */}
        <View style={styles.actionsFooterArea}>
          <TouchableOpacity style={styles.systemSignOutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.systemSignOutButtonText}>SIGN OUT OF FLEET SYSTEM</Text>
          </TouchableOpacity>
          <Text style={styles.softwareVersionLabelText}>FLEET OPERATIONS COMPILER v1.0.4</Text>
        </View>

      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 40 },
  profileHeaderCard: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  avatarContainer: { position: 'relative', marginBottom: 14 },
  initialsCircle: { width: 80, height: 80, borderRadius: 0, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#000000' },
  initialsCircleText: { color: '#FFFFFF', fontSize: 28, fontWeight: '300', letterSpacing: 0.5 },
  onlineHardwareSignalBullet: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FAFAFA' },
  driverNameLabel: { fontSize: 14, fontWeight: '900', color: '#000000', letterSpacing: 1.5, textTransform: 'uppercase' },
  identityBadgesRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  solidStatusBadge: { backgroundColor: '#000000', paddingHorizontal: 10, paddingVertical: 4 },
  solidStatusBadgeText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  hollowIdBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#EAEAEA' },
  hollowIdBadgeText: { color: '#555555', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  telemetryGridRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  telemetryGridItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  telemetryValueText: { fontSize: 13, fontWeight: '900', color: '#000000' },
  telemetryLabelText: { fontSize: 8, fontWeight: '800', color: '#888888', letterSpacing: 0.5 },
  detailsSectionWrapper: { paddingHorizontal: 20, paddingTop: 28 },
  detailsSectionHeading: { fontSize: 10, fontWeight: '900', color: '#888888', letterSpacing: 1.5, marginBottom: 20 },
  infoLineSlat: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  slatIconWrap: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  slatContentBlock: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0', paddingBottom: 10 },
  metaLabelText: { fontSize: 8, fontWeight: '900', color: '#AAAAAA', letterSpacing: 0.8, marginBottom: 4 },
  metaValueText: { fontSize: 12, color: '#111111', fontWeight: '600', letterSpacing: 0.2 },
  actionsFooterArea: { paddingHorizontal: 20, marginTop: 24, alignItems: 'center' },
  systemSignOutButton: { width: '100%', height: 48, backgroundColor: '#000000', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 0 },
  systemSignOutButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  softwareVersionLabelText: { marginTop: 14, fontSize: 8, color: '#BBBBBB', fontWeight: '500', letterSpacing: 1 }
});
