import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import UnifiedMap from '../../../components/UnifiedMap';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location'; // Required for GPS

export default function DelivererOrderDetail() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addressName, setAddressName] = useState("Resolving address...");
  const [myGPS, setMyGPS] = useState<[number, number] | null>(null);
  const router = useRouter();

  const API_KEY = "pk.ac03476010699238dcadcb4f0eb9a998";
  const BASE_URL = "http://192.168.1.3:8787"; 

  // 1. GPS HEARTBEAT LOGIC
  useEffect(() => {
    let gpsInterval: NodeJS.Timeout;

    const startGpsPush = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      gpsInterval = setInterval(async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const coords: [number, number] = [loc.coords.latitude, loc.coords.longitude];
          setMyGPS(coords);

          // Update DB with current driver position
          await fetch(`${BASE_URL}/api/orders/${id}/update-gps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: coords[0], lng: coords[1] })
          });
        } catch (e) {
          console.log("GPS Pulse Failed", e);
        }
      }, 15000); // 15 Second Heartbeat
    };

    if (order?.status === 'picked_up') {
      startGpsPush();
    }

    return () => clearInterval(gpsInterval);
  }, [order?.status, id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      const [orderRes, settingsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/orders/${id}`),
        fetch(`${BASE_URL}/api/admin/settings`)
      ]);
      const orderData = await orderRes.json();
      const settingsData = await settingsRes.json();

      setOrder(orderData);
      setSettings(settingsData);
      
      if (orderData?.latitude && orderData?.longitude) {
        getAddressFromCoords(orderData.latitude, orderData.longitude);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const getAddressFromCoords = async (lat: string, lon: string) => {
    try {
      // FIXED TEMPLATE LITERAL
      const res = await fetch(`https://locationiq.com{API_KEY}&lat=${lat}&lon=${lon}&format=json`);
      const data = await res.json();
      setAddressName(data.display_name || "Street Address Not Found");
    } catch (e) {
      setAddressName("Address unavailable");
    }
  };

  const updateStatus = async (newStatus: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await fetchData();
        Alert.alert("Success", `Status: ${newStatus.replace('_', ' ').toUpperCase()}`);
      }
    } catch (e) { 
        Alert.alert("Error", "Update failed."); 
    } finally {
        setLoading(false);
    }
  };

  if (loading && !order) return <View style={styles.center}><ActivityIndicator size="large" color="#0A1128" /></View>;
  if (!order) return <View style={styles.center}><Text>Order not found</Text></View>;

  const warehouseLocation: [number, number] = settings?.warehouseLat 
    ? [parseFloat(settings.warehouseLat), parseFloat(settings.warehouseLng)] 
    : [34.5330, 69.1660];

  const destinationCoords: [number, number] = [
    parseFloat(order.latitude) || 34.5330, 
    parseFloat(order.longitude) || 69.1660
  ];

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        <UnifiedMap 
          role="DELIVER" 
          warehouseCoords={warehouseLocation}
          destinationCoords={destinationCoords}
          driverCoords={myGPS} // Pass live phone GPS here
        />
        <TouchableOpacity onPress={() => router.back()} style={styles.backFloat}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.detailsSheet} showsVerticalScrollIndicator={false}>
        <View style={styles.mainInfo}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sectionTitle}>RECIPIENT</Text>
              <Text style={styles.customerName}>{order.customerName.toUpperCase()}</Text>
            </View>
            <View style={[styles.statusTag, { borderColor: '#000' }]}>
              <Text style={styles.statusTagText}>{order.status.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.contactCard}>
            <TouchableOpacity 
              style={styles.contactAction} 
              onPress={() => Linking.openURL(`tel:${order.phoneNumber}`)}
            >
              <Ionicons name="call" size={18} color="#000" />
              <Text style={styles.contactValue}>{order.phoneNumber}</Text>
            </TouchableOpacity>
            
            <View style={styles.addressBox}>
              <View style={styles.addressHeader}>
                <Ionicons name="location-sharp" size={16} color="#000" />
                <Text style={styles.addressLabel} numberOfLines={1}>{addressName.toUpperCase()}</Text>
              </View>
              <Text style={styles.addressText}>{order.address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.itemSection}>
          <Text style={styles.sectionTitle}>CARGO ITEMS ({order.items?.length || 0})</Text>
          {order.items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Image source={{ uri: item.imageUrl || item.productImage }} style={styles.itemThumb} />
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{item.name?.toUpperCase() || item.productName?.toUpperCase()}</Text>
                <Text style={styles.itemMeta}>QTY: {item.quantity} | {item.selectedSize || 'N/A'}</Text>
              </View>
              <Text style={styles.itemPrice}>AFN {item.price}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionContainer}>
           {order.status === 'confirmed' && (
             <TouchableOpacity style={styles.systemBtn} onPress={() => updateStatus('picked_up')}>
                <Text style={styles.systemBtnText}>PICK UP FROM WAREHOUSE</Text>
             </TouchableOpacity>
           )}
           {order.status === 'picked_up' && (
             <TouchableOpacity style={[styles.systemBtn, {backgroundColor: '#000'}]} onPress={() => updateStatus('delivered')}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{marginRight: 8}} />
                <Text style={styles.systemBtnText}>CONFIRM DELIVERY</Text>
             </TouchableOpacity>
           )}
           {order.status === 'delivered' && (
              <View style={styles.successState}>
                <Ionicons name="shield-checkmark" size={24} color="#000" />
                <Text style={styles.successText}>TASK COMPLETED</Text>
              </View>
           )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ... styles remain the same
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  mapWrapper: { height: 320, backgroundColor: '#F0F0F0' },
  backFloat: { position: 'absolute', top: 50, left: 16, backgroundColor: '#FFF', padding: 8, elevation: 5 },
  
  detailsSheet: { 
    flex: 1, 
    backgroundColor: '#FFF', 
    marginTop: -30, 
    borderTopLeftRadius: 0, // Sharp edges for Fleet app
    paddingHorizontal: 20 
  },
  mainInfo: { paddingTop: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: '#AAA', letterSpacing: 1.5, marginBottom: 8 },
  customerName: { fontSize: 20, fontWeight: '900', color: '#000' },
  
  statusTag: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4 },
  statusTagText: { fontSize: 9, fontWeight: '900', color: '#000', letterSpacing: 1 },

  contactCard: { backgroundColor: '#F9F9F9', padding: 16, marginBottom: 25 },
  contactAction: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
  contactValue: { fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  
  addressBox: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 15 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  addressLabel: { fontSize: 11, fontWeight: '900' },
  addressText: { fontSize: 13, color: '#666', lineHeight: 18 },

  itemSection: { marginTop: 10 },
  itemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', alignItems: 'center' },
  itemThumb: { width: 50, height: 65, backgroundColor: '#F9F9F9' },
  itemText: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 11, fontWeight: '700', color: '#000' },
  itemMeta: { fontSize: 10, color: '#999', marginTop: 3 },
  itemPrice: { fontSize: 12, fontWeight: '800' },

  actionContainer: { marginTop: 30 },
  systemBtn: { backgroundColor: '#000', height: 60, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  systemBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 2, fontSize: 13 },
  
  successState: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWeight: 2, borderColor: '#000' },
  successText: { marginLeft: 12, fontWeight: '900', fontSize: 14, letterSpacing: 2 }
});
