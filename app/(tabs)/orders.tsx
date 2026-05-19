import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity, StyleSheet, RefreshControl, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = "http://192.168.1.3:8787"; // Double check this IP!

export default function DelivererOrders() {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();

  // 1. UPDATED FETCH: Now accepts a date parameter
  // Inside DelivererOrders component


const [loading, setLoading] = useState(false); // New state for date-switch loading


const fetchMyOrders = useCallback(async (selectedDate: Date = date) => {
    // If it's a pull-to-refresh, refreshing is true. 
    // If it's a date change, loading is true.
    try {
      const driverId = await SecureStore.getItemAsync('deliverer_id');
      if (!driverId) return;

      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`${API_URL}/api/deliverer/${driverId}/orders?date=${dateStr}`);
      
      const data = await res.json();
      setOrders(data || []);
    } catch (e) { 
      console.error(e); 
    } finally {
      setRefreshing(false);
      setLoading(false); // Hide the date-switch loader
    }
}, [date]);

const onDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
      setLoading(true); // Show loader immediately on date change
      fetchMyOrders(selectedDate);
    }
};

  const updateStatus = async (orderId: string, newStatus: string) => {
  try {
    const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      // Refresh the list immediately to show updated status
      fetchMyOrders(date); 
    } else {
      Alert.alert("Error", "Could not update status.");
    }
  } catch (e) {
    Alert.alert("Connection Error", "Check your internet.");
  }
};

  // 2. FIXED: Define the onChange handler for the picker

  useEffect(() => { fetchMyOrders(); }, [fetchMyOrders]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'delivered': return { bg: '#d4edda', text: '#28a745' };
      case 'picked_up': return { bg: '#cfe2ff', text: '#0d6efd' };
      case 'confirmed': return { bg: '#fff3cd', text: '#856404' };
      default: return { bg: '#e2e3e5', text: '#41464b' };
    }
  };

return (
    <View style={styles.container}>
    {/* 1. HEADER */}
    <View style={styles.dateHeader}>
      <View>
        <Text style={styles.dateSub}>LOGISTICS OPERATOR</Text>
        <Text style={styles.dateTitle}>My Schedule</Text>
      </View>
      <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar" size={22} color="#000" />
      </TouchableOpacity>
    </View>

    {/* 2. DATE INFO BAR (Visible Feedback) */}
    <View style={styles.infoBar}>
      <View style={styles.infoBarLeft}>
        <Ionicons name="stopwatch-outline" size={16} color="#666" />
        <Text style={styles.infoBarText}>
          LISTING: <Text style={styles.activeDateText}>{date.toDateString().toUpperCase()}</Text>
        </Text>
      </View>
      {loading && <ActivityIndicator size="small" color="#000" />}
    </View>

    {showPicker && (
      <DateTimePicker
        value={date}
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        onChange={onDateChange}
      />
    )}

    {/* 3. TASK LIST OR LOADER */}
    {loading && orders.length === 0 ? (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loaderText}>UPDATING TASKS...</Text>
      </View>
    ) : (
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchMyOrders(date)} tintColor="#000" />
        }
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);

          return (
            <View style={styles.taskCard}>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={() => router.push(`/orders/${item.id}`)}
                style={styles.cardTop}
              >
                <View style={styles.idRow}>
                  <Text style={styles.orderId}>№ {item.id.slice(0, 8).toUpperCase()}</Text>
                  <View style={[styles.statusPoint, { backgroundColor: statusStyle.text }]} />
                  <Text style={[styles.statusLabel, { color: statusStyle.text }]}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>


                <Text style={styles.customerName}>{item.customerName.toUpperCase()}</Text>
                
                <View style={styles.locationBox}>
                  <Ionicons name="map-sharp" size={16} color="#FA6338" />
                  <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
                </View>
              </TouchableOpacity>

              {/* ACTION AREA */}
              {(item.status === 'confirmed' || item.status === 'picked_up') && (
                <View style={styles.actionArea}>
                  <TouchableOpacity 
                    style={[styles.mainActionBtn, item.status === 'picked_up' && styles.arrivedBtn]} 
                    onPress={() => updateStatus(item.id, item.status === 'confirmed' ? 'picked_up' : 'delivered')}
                  >
                    <Ionicons name={item.status === 'confirmed' ? "cube" : "checkmark-circle"} size={18} color="#fff" />
                    <Text style={styles.mainActionText}>
                      {item.status === 'confirmed' ? 'MARK AS PICKED UP' : 'MARK AS DELIVERED'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={60} color="#EEE" />
            <Text style={styles.emptyText}>No deliveries for this date.</Text>
          </View>
        }
      />
    )}
  </View>
);

}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F6F6' },
    infoBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#FFF', 
    paddingVertical: 12, 
    paddingHorizontal: 20,
    borderBottomWidth: 1, 
    borderColor: '#EEE'
  },
  infoBarLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  infoBarText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: '#999', 
    marginLeft: 8,
    letterSpacing: 0.5
  },
  activeDateText: { 
    color: '#000', 
    fontWeight: '900' 
  },
  statusPoint: { 
    width: 6, 
    height: 6, 
    borderRadius: 3, 
    marginRight: 6 
  },
  // If your code uses 'center' as a style variable:
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  empty: { 
    alignItems: 'center', 
    marginTop: 80 
  },

  dateHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20, 
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  dateSub: { color: '#999', fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  dateTitle: { color: '#000', fontSize: 20, fontWeight: '900', marginTop: 4 },
  calendarBtn: { padding: 8, borderWeight: 1, borderColor: '#EEE' },

  listContent: { padding: 15, paddingBottom: 100 },
  taskCard: { 
    backgroundColor: '#FFF', 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#E0E0E0' 
  },
  cardTop: { padding: 16 },
  idRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderId: { fontSize: 11, fontWeight: '700', color: '#666', letterSpacing: 1 },
  statusLabel: { fontSize: 10, fontWeight: '900' },
  
  customerName: { fontSize: 15, fontWeight: '800', color: '#000', marginBottom: 8 },
  locationBox: { 
    flexDirection: 'row', 
    backgroundColor: '#F9F9F9', 
    padding: 12, 
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 15
  },
  addressText: { color: '#444', fontSize: 12, lineHeight: 18, flex: 1, fontWeight: '500' },
  
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timeText: { fontSize: 10, color: '#999', fontWeight: '700' },
  viewMapText: { fontSize: 10, fontWeight: '900', color: '#000' },

  actionArea: { padding: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  mainActionBtn: { 
    backgroundColor: '#000', 
    paddingVertical: 14, 
    alignItems: 'center' 
  },
  mainActionText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  // Inside your existing styles...

  dateInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFF', 
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateInfoText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#999',
    letterSpacing: 1,
  },
  dateBold: {
    color: '#000',
    fontWeight: '900',
  },
  resetLink: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#BBB',
    marginTop: 15,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

});
