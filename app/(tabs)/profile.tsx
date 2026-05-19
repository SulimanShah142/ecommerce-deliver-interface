import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { OneSignal } from 'react-native-onesignal';

export default function DelivererProfile() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInfo = async () => {
      const storedName = await SecureStore.getItemAsync('deliverer_name');
      const storedEmail = await SecureStore.getItemAsync('deliverer_email'); // If you saved it during login
      
      setName(storedName || 'Deliverer');
      setEmail(storedEmail || 'fleet@shein.af');
      setLoading(false);
    };
    loadInfo();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of the fleet system?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Log Out", 
        style: "destructive",
        onPress: async () => {
          // 1. Unlink OneSignal so they don't get notifications while logged out
          OneSignal.logout();
          
          // 2. Clear Storage
          await SecureStore.deleteItemAsync('deliverer_id');
          await SecureStore.deleteItemAsync('deliverer_name');
          
          // 3. Go to login
          router.replace('/login');
        }
      }
    ]);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

 return (
  <View style={styles.container}>
    {/* DASHBOARD HEADER */}
    <View style={styles.header}>
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name?.[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.statusIndicator} />
      </View>
      
      <Text style={styles.nameText}>{name.toUpperCase()}</Text>
      <View style={styles.badgeRow}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>ACTIVE FLEET</Text>
        </View>
        <View style={styles.idBadge}>
          <Text style={styles.idBadgeText}>DRIVER #7792</Text>
        </View>
      </View>
    </View>

    {/* PERFORMANCE / INFO SECTION */}
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>FLEET DETAILS</Text>
      
      <View style={styles.infoRow}>
        <View style={styles.iconBox}>
          <Ionicons name="mail" size={18} color="#000" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
          <Text style={styles.fieldValue}>{email}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.iconBox}>
          <Ionicons name="bicycle" size={18} color="#000" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.fieldLabel}>WORK MODE</Text>
          <Text style={styles.fieldValue}>Full-time Delivery</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.iconBox}>
          <Ionicons name="star" size={18} color="#000" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.fieldLabel}>RATING</Text>
          <Text style={styles.fieldValue}>4.98 ★</Text>
        </View>
      </View>
    </View>

    {/* SYSTEM FOOTER */}
    <View style={styles.footer}>
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>SIGN OUT OF SYSTEM</Text>
      </TouchableOpacity>
      <Text style={styles.version}>FLEET OPERATIONAL APP v1.0.4</Text>
    </View>
  </View>
);
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    alignItems: 'center', 
    paddingTop: 70, 
    paddingBottom: 35, 
    backgroundColor: '#FAFAFA', // Subtle contrast for the header area
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  avatarWrapper: { position: 'relative' },
  avatar: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: '#000', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  avatarText: { color: '#FFF', fontSize: 32, fontWeight: '300' },
  statusIndicator: { 
    position: 'absolute', 
    bottom: 18, 
    right: 5, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: '#4CAF50', 
    borderWidth: 2, 
    borderColor: '#FFF' 
  },
  nameText: { fontSize: 16, fontWeight: '800', color: '#000', letterSpacing: 1.5 },
  
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  statusBadge: { backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  idBadge: { backgroundColor: '#EEE', paddingHorizontal: 10, paddingVertical: 4 },
  idBadgeText: { color: '#666', fontSize: 9, fontWeight: '800' },
  
  section: { padding: 25 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: '#999', letterSpacing: 2, marginBottom: 25 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  iconBox: { width: 40, height: 40, justifyContent: 'center' },
  infoContent: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 10 },
  fieldLabel: { fontSize: 9, fontWeight: '800', color: '#BBB', marginBottom: 4, letterSpacing: 1 },
  fieldValue: { fontSize: 14, color: '#000', fontWeight: '600' },

  footer: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center' },
  logoutBtn: { 
    width: '80%',
    paddingVertical: 18, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#000' 
  },
  logoutText: { color: '#000', fontWeight: '900', fontSize: 11, letterSpacing: 2 },
  version: { marginTop: 20, fontSize: 9, color: '#BBB', letterSpacing: 1 }
});
