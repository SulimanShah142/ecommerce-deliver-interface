import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, FlatList, Text, TouchableOpacity, StyleSheet, 
  RefreshControl, Platform, Alert, ActivityIndicator, TextInput, ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const API_URL = "http://192.168.1.3:8787";

export default function DelivererOrders() {
  const router = useRouter();

  // 1. TIMELINE & COURIER STATES DECLARATIONS
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  
  // 🎯 TIMELINE SCOPE STATES
  const [timeScope, setTimeScope] = useState<'today' | 'this_week' | 'this_month' | 'all' | 'custom'>('today');
  const [customYear, setCustomYear] = useState('');
  const [customMonth, setCustomMonth] = useState('');

  // 2. TIMELINE-AWARE REFRESH CORE DISPATCH FETCHER
  const fetchDriverManifest = useCallback(async () => {
    setLoading(true);
    try {
      const driverId = await SecureStore.getItemAsync('deliverer_id');
      if (!driverId) {
        setLoading(false);
        return;
      }

      // Build endpoint URL with matching scope metrics
      let targetUrl = `${API_URL}/api/deliverer/${driverId}/orders?timeline=${timeScope}`;
      if (timeScope === 'custom' && customYear) {
        targetUrl += `&year=${customYear.trim()}&month=${customMonth.trim()}`;
      }

      const res = await fetch(targetUrl);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.log("⚠️ Offline manifest read fallback active...", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeScope, customYear, customMonth]);

  // Trigger sync on boot and every time the courier taps a different timeline window
  useEffect(() => {
    fetchDriverManifest();
  }, [timeScope]);

  // 3. LIVE LOGISTICS STATUS UPDATES TRANSACTIONS FLOW
  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      setRefreshing(true);
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await fetchDriverManifest(); 
      } else {
        Alert.alert("Delivery Status Alert", "Could not synchronize state updates with edge nodes.");
        setRefreshing(false);
      }
    } catch (e) {
      Alert.alert("Connection Stalled", "Check your cellular parameters link.");
      setRefreshing(false);
    }
  };

  // 4. RUNTIME SEARCH ENGINE & CONCURRENT SECTION FILTERS
  const processedCourierOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const isDone = order.status === 'delivered' || order.status === 'rejected';
      const matchesTab = activeTab === 'COMPLETED' ? isDone : !isDone;

      const query = searchQuery.toLowerCase().trim();
      return matchesTab && (!query ||
        order.id?.toLowerCase().includes(query) ||
        order.customerName?.toLowerCase().includes(query) ||
        order.address?.toLowerCase().includes(query));
    });
  }, [orders, searchQuery, activeTab]);

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered': return { text: '#28A745' };
      case 'picked_up': return { text: '#5856D6' };
      case 'confirmed': return { text: '#FF9500' };
      default: return { text: '#8E8E93' };
    }
  };

  return (
    <View style={styles.container}>
      {/* SEARCH AND EXTENDED FILTER TRUNK HEADER */}
      <View style={styles.filterSection}>
        <View style={styles.searchBarRow}>
          <Ionicons name="search-outline" size={18} color="#999" />
          <TextInput 
            style={styles.searchInput}
            placeholder="SEARCH ORDER ID, CLIENT NAME, OR MAP DROPOFF..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        {/* 🎯 TIMELINE SCOPE TRIGGERS TRUNK ACCENT PANEL */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineTabGroup} contentContainerStyle={{ gap: 6 }}>
          {[
            { code: 'today', label: 'TODAY' },
            { code: 'this_week', label: 'LAST 7 DAYS' },
            { code: 'this_month', label: 'THIS MONTH' },
            { code: 'all', label: 'ALL LOGS' },
            { code: 'custom', label: 'CUSTOM SEARCH' }
          ].map((scope) => (
            <TouchableOpacity 
              key={scope.code}
              style={[styles.timeTab, timeScope === scope.code && styles.timeTabActive]}
              onPress={() => setTimeScope(scope.code as any)}
            >
              <Text style={[styles.timeTabText, timeScope === scope.code && styles.timeTabTextActive]}>{scope.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 🎯 CUSTOM DATA FILTER INPUT FIELDS ROW */}
        {timeScope === 'custom' && (
          <View style={styles.customDateInputRow}>
            <TextInput 
              style={styles.dateField} 
              placeholder="YEAR (2026)" 
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={4}
              value={customYear}
              onChangeText={setCustomYear}
            />
            <TextInput 
              style={styles.dateField} 
              placeholder="MONTH (1-12)" 
              placeholderTextColor="#999"
              keyboardType="numeric"
              maxLength={2}
              value={customMonth}
              onChangeText={setCustomMonth}
            />
            <TouchableOpacity style={styles.dateSubmitBtn} onPress={fetchDriverManifest}>
              <Ionicons name="funnel" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.courierTabGroup}>
          <TouchableOpacity style={[styles.courierTab, activeTab === 'ACTIVE' && styles.courierTabActive]} onPress={() => setActiveTab('ACTIVE')}>
            <Text style={[styles.courierTabText, activeTab === 'ACTIVE' && styles.courierTabTextActive]}>ACTIVE RUNS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.courierTab, activeTab === 'COMPLETED' && styles.courierTabActive]} onPress={() => setActiveTab('COMPLETED')}>
            <Text style={[styles.courierTabText, activeTab === 'COMPLETED' && styles.courierTabTextActive]}>HISTORY ARCHIVES</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* FREIGHT TASKS SCROLL DISPATCH FEEDS */}
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>
      ) : (
        <FlatList
          data={processedCourierOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDriverManifest(); }} tintColor="#000" />}
          renderItem={({ item }) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <View style={styles.taskCard}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => router.push(`orders/${item.id}`)} style={styles.cardTop}>
                  <View style={styles.idRow}>
                    <Text style={styles.orderId}>№ {item.id.slice(0, 8).toUpperCase()}</Text>
                    <View style={[styles.statusPoint, { backgroundColor: typeof statusStyle === 'object' ? statusStyle.text : statusStyle }]} />
                    <Text style={[styles.statusLabel, { color: typeof statusStyle === 'object' ? statusStyle.text : statusStyle }]}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.customerName}>{item.customerName?.toUpperCase() || 'GUEST CUSTOMER'}</Text>
                  <View style={styles.locationBox}>
                    <Ionicons name="map-sharp" size={14} color="#000" />
                    <Text style={styles.addressText} numberOfLines={2}>{item.address?.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>

                {(item.status === 'confirmed' || item.status === 'picked_up') && (
                  <View style={styles.actionArea}>
                    <TouchableOpacity style={[styles.mainActionBtn, item.status === 'picked_up' && styles.arrivedBtn]} onPress={() => updateStatus(item.id, item.status === 'confirmed' ? 'picked_up' : 'delivered')}>
                      <Ionicons name={item.status === 'confirmed' ? "cube" : "checkmark-circle"} size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.mainActionText}>{item.status === 'confirmed' ? 'MARK AS PICKED UP' : 'CONFIRM DELIVERY'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cube-outline" size={50} color="#EEE" /><Text style={styles.emptyText}>NO MANIFEST LOG ROWS FOUND FOR CHOSEN TIMELINE.</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  
  filterSection: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 12 },
  searchBarRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#EFEFEF', paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 6, gap: 10 },
  searchInput: { flex: 1, fontSize: 13, color: '#000000', fontWeight: '600', letterSpacing: 0.2 },
  
  timelineTabGroup: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#FAFAFA', paddingBottom: 4 },
  timeTab: { backgroundColor: '#F5F5F5', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 0.5, borderColor: '#EAEAEA' },
  timeTabActive: { backgroundColor: '#000000', borderColor: '#000000' },
  timeTabText: { fontSize: 8, fontWeight: '900', color: '#666', letterSpacing: 0.5 },
  timeTabTextActive: { color: '#FFFFFF' },
  
  customDateInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FAFAFA', padding: 10, borderWidth: 0.5, borderColor: '#EFEFEF' },
  dateField: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EFEFEF', paddingHorizontal: 12, paddingVertical: 8, fontSize: 11, fontWeight: '700', color: '#000' },
  dateSubmitBtn: { backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 10 },

  courierTabGroup: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginTop: 4 },
  courierTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  courierTabActive: { borderBottomColor: '#000000' },
  courierTabText: { fontSize: 10, fontWeight: '800', color: '#999', letterSpacing: 1 },
  courierTabTextActive: { color: '#000', fontWeight: '900' },

  listContent: { padding: 16, paddingBottom: 100 },
  taskCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EFEFEF', padding: 20, marginBottom: 15 },
  cardTop: { gap: 4 },
  idRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5', paddingBottom: 10, marginBottom: 10 },
  orderId: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 0.5, marginRight: 8 },
  statusPoint: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  customerName: { fontSize: 14, fontWeight: '800', color: '#222', textTransform: 'uppercase', marginTop: 4 },
  locationBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 10 },
  addressText: { fontSize: 12, color: '#555', fontWeight: '500', flex: 1, lineHeight: 16 },

  actionArea: { marginTop: 15, borderTopWidth: 0.5, borderTopColor: '#F5F5F5', paddingTop: 12 },
  mainActionBtn: { backgroundColor: '#000000', paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  arrivedBtn: { backgroundColor: '#22C55E' },
  mainActionText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  empty: { alignItems: 'center', marginTop: 120, gap: 12 },
  emptyText: { fontSize: 10, fontWeight: '900', color: '#BBB', letterSpacing: 1, textAlign: 'center' }
});
