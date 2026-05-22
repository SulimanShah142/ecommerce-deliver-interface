import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import UnifiedMap from '@/components/UnifiedMap';
import * as Location from 'expo-location'; // 🎯 CRITICAL FIX: Added missing import

const BASE_URL = "http://192.168.1.3:8787"; 
const API_KEY = "pk.ac03476010699238dcadcb4f0eb9a998";

export default function DelivererOrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true); // Default to loading state
  const [addressName, setAddressName] = useState("Resolving address...");
  const [myGPS, setMyGPS] = useState<[number, number] | null>(null);
  // 1. RE-READ AND PARALLEL DATA FETCH ENGINE
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [orderRes, settingsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/orders/${id}`),
        fetch(`${BASE_URL}/api/admin/settings`)
      ]);
      
      if (!orderRes.ok || !settingsRes.ok) throw new Error("Server metrics error");

      const orderData = await orderRes.json();
      const settingsData = await settingsRes.json();

      setOrder(orderData);
      setSettings(settingsData);
      
      if (orderData?.latitude && orderData?.longitude) {
        getAddressFromCoords(orderData.latitude, orderData.longitude);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      Alert.alert("Error", "Could not synchronize order records from cloud server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 2. FIXED ANTI-FLICKER ROUTINE: Forces loading reset whenever ID changes
  useEffect(() => {
    setLoading(true);
    setOrder(null); // Clear out previous cache instantly to stop layout bleed
    setMyGPS(null); // Reset location tracking cache explicitly
    setAddressName("Resolving address...");
    fetchData();
  }, [id, fetchData]);

  // 3. FIXED REVERSE GEOCODING API URL
  const getAddressFromCoords = async (lat: string, lon: string) => {
    try {
      const res = await fetch(`https://locationiq.com{API_KEY}&lat=${lat}&lon=${lon}&format=json`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAddressName(data.display_name || "Street Address Not Found");
    } catch (e) {
      setAddressName("Address unavailable offline");
    }
  };
  // 4. SECURE GPS HEARTBEAT POLLING & CRASH-PROOF SEEDING
  useEffect(() => {
    let gpsInterval: NodeJS.Timeout;

    const startGpsPush = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Blocked", "GPS tracking must be active to navigate fleet runs.");
          return;
        }

        // 🎯 THE RESILIENCE FIX: Wrap hardware reading inside a try/catch box with safe default coordinates
        let initialCoords: [number, number] = [34.5330, 69.1660]; // Central Warehouse Default Fallback

        try {
          // Check if location services are enabled on the phone before querying hardware
          const providerStatus = await Location.getProviderStatusAsync();
          
          if (providerStatus.locationServicesEnabled) {
            // First attempt: Grab fast-cached location registry data
            const lastKnown = await Location.getLastKnownPositionAsync({});
            if (lastKnown) {
              initialCoords = [lastKnown.coords.latitude, lastKnown.coords.longitude];
            } else {
              // Second attempt: Request a fresh, balanced lock from hardware sensors
              const initLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              initialCoords = [initLoc.coords.latitude, initLoc.coords.longitude];
            }
          } else {
            console.log("⚠️ Hardware GPS Toggle is OFF. Seeding warehouse fallbacks.");
          }
        } catch (locationHardwareError) {
          console.log("⚠️ Location hardware unreachable. Defaulting to warehouse pin anchors.");
          
          // Try to look up custom warehouse points from settings if available
          if (settings?.warehouseLat && settings?.warehouseLng) {
            initialCoords = [parseFloat(settings.warehouseLat), parseFloat(settings.warehouseLng)];
          }
        }

        // Seed the map instantly so it doesn't crash or stay empty
        setMyGPS(initialCoords);

        // Setup the background interval tracking handle safely
        if (order?.status === 'picked_up') {
          gpsInterval = setInterval(async () => {
            try {
              const providerCheck = await Location.getProviderStatusAsync();
              if (!providerCheck.locationServicesEnabled) return; // Skip loop silently if toggle is off

              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              const currentCoords: [number, number] = [loc.coords.latitude, loc.coords.longitude];
              
              setMyGPS(currentCoords);

              // Sends individual explicit coordinate entries to prevent database column corruption
              await fetch(`${BASE_URL}/api/orders/${id}/update-gps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  lat: currentCoords[0].toString(), 
                  lng: currentCoords[1].toString()  
                })
              });
              console.log(`🛰️ Dispatching location heartbeat update for Order: ${id}`);
            } catch (e) {
              console.log("GPS Broadcast skip iteration pass...", e);
            }
          }, 12000);
        }

      } catch (err) {
        console.error("Critical GPS framework processing error:", err);
      }
    };

    if (order) {
      startGpsPush();
    }

    return () => {
      if (gpsInterval) clearInterval(gpsInterval);
    };
  }, [order?.status, id, settings]);
 // Listens closely to status shifts to mount interval loop on the fly

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
        Alert.alert("Success", `Status updated to: ${newStatus.replace('_', ' ').toUpperCase()}`);
      }
    } catch (e) { 
        Alert.alert("Error", "Update failed."); 
    } finally {
        setLoading(false);
    }
  };

  // Safe Loading Component Guard View
  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={styles.loaderText}>LOADING DESIRED MANIFEST ROUTE...</Text>
      </View>
    );
  }

  const warehouseLocation: [number, number] = [
    parseFloat(settings?.warehouseLat || settings?.warehouse_lat) || 34.5330,
    parseFloat(settings?.warehouseLng || settings?.warehouse_lng) || 69.1660
  ];

  const destinationCoords: [number, number] = [
    parseFloat(order.latitude) || 34.5553, 
    parseFloat(order.longitude) || 69.2075
  ];

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        <UnifiedMap 
          role="ADMIN" 
          warehouseCoords={warehouseLocation}
          destinationCoords={destinationCoords}
          driverCoords={myGPS} 
        />

        <TouchableOpacity onPress={() => router.back()} style={styles.backFloat}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.detailsSheet} showsVerticalScrollIndicator={false}>
        <View style={styles.mainInfo}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>RECIPIENT CUSTOMER</Text>
              <Text style={styles.customerName}>{order.customerName?.toUpperCase()}</Text>
            </View>
            <View style={styles.statusTag}>
              <Text style={styles.statusTagText}>{order.status?.toUpperCase()}</Text>
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
              <Text style={styles.addressText}>{order.address?.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* ITEMS SECTION */}
        <View style={styles.itemSection}>
          <Text style={styles.sectionTitle}>CARGO ITEMS ({order.items?.length || 0})</Text>
          {order.items?.map((item: any, index: number) => (
            <View key={`item-${item.id || index}`} style={styles.itemRow}>
              <Image source={{ uri: item.imageUrl || item.productImage }} style={styles.itemThumb} />
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemName}>{item.name?.toUpperCase() || item.productName?.toUpperCase()}</Text>
                <Text style={styles.itemMeta}>QTY: {item.quantity} | {item.selectedSize || 'N/A'}</Text>
              </View>
              <Text style={styles.itemPrice}>AFN {(Number(item.price) || 0).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* FINANCIAL SUMMARY CARD */}
        <View style={styles.financialSection}>
          <Text style={styles.sectionTitle}>COLLECTION STATEMENT</Text>
          <View style={styles.billingRow}>
            <Text style={styles.billLabel}>Cargo Subtotal</Text>
            <Text style={styles.billValue}>AFN {(Math.max(0, (Number(order.totalAmount) || 0) - (Number(order.shippingFee) || 0))).toLocaleString()}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={styles.billLabel}>Logistics Surcharge (Shipping)</Text>
            <Text style={[styles.billValue, Number(order.shippingFee) === 0 && { color: '#22C55E', fontWeight: '900' }]}>
              {Number(order.shippingFee) === 0 ? "FREE" : `AFN ${Number(order.shippingFee).toLocaleString()}`}
            </Text>
          </View>
          <View style={styles.totalRowSplit}>
            <Text style={styles.grandLabel}>CASH TO COLLECT ON DELIVERY</Text>
            <Text style={styles.grandValue}>AFN {Math.round(Number(order.totalAmount) || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* SYSTEM FLOW BUTTON TRIGGERS */}
        <View style={styles.actionContainer}>
           {order.status === 'confirmed' && (
             <TouchableOpacity style={styles.systemBtn} onPress={() => updateStatus('picked_up')}>
                <Text style={styles.systemBtnText}>PICK UP FROM WAREHOUSE</Text>
             </TouchableOpacity>
           )}
           {order.status === 'picked_up' && (
             <TouchableOpacity style={[styles.systemBtn, { backgroundColor: '#000000' }]} onPress={() => updateStatus('delivered')}>
                <Ionicons name="checkmark-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.systemBtnText}>CONFIRM DELIVERY</Text>
             </TouchableOpacity>
           )}
           {order.status === 'delivered' && (
              <View style={styles.successState}>
                <Ionicons name="shield-checkmark" size={22} color="#000000" />
                <Text style={styles.successText}>TASK COMPLETED SUCCESSFULLY</Text>
              </View>
           )}
        </View>
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loaderText: { fontSize: 9, fontWeight: '800', color: '#999', letterSpacing: 1.5, marginTop: 12 },
  mapWrapper: { height: 320, width: '100%', position: 'relative' },
  backFloat: { position: 'absolute', top: Platform.OS === 'ios' ? 55 : 40, left: 16, backgroundColor: '#FFF', padding: 8, borderRadius: 0, zIndex: 99, elevation: 4 },
  
  detailsSheet: { flex: 1, backgroundColor: '#FFF', marginTop: -10 },
  mainInfo: { padding: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  sectionTitle: { fontSize: 9, fontWeight: '900', color: '#BBBBBB', letterSpacing: 1.5, marginBottom: 12 },
  customerName: { fontSize: 20, fontWeight: '900', color: '#000', letterSpacing: -0.5 },
  statusTag: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderColor: '#000000' },
  statusTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  contactCard: { marginTop: 20, gap: 15 },
  contactAction: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', paddingBottom: 12 },
  contactValue: { fontSize: 14, fontWeight: '700', color: '#000' },
  addressBox: { gap: 6, marginTop: 5 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressLabel: { fontSize: 9, fontWeight: '800', color: '#666', flex: 1 },
  addressText: { fontSize: 13, color: '#333', lineHeight: 18, fontWeight: '600' },
  
  itemSection: { padding: 20, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#FAFAFA', paddingBottom: 12 },
  itemThumb: { width: 50, height: 65, backgroundColor: '#FAFAFA' },
  itemTextContainer: { flex: 1, marginLeft: 15 },
  itemName: { fontSize: 12, fontWeight: '800', color: '#000' },
  itemMeta: { fontSize: 10, color: '#999', marginTop: 4, fontWeight: '600' },
  itemPrice: { fontSize: 13, fontWeight: '900', color: '#000' },

  financialSection: { padding: 20, borderTopWidth: 1, borderTopColor: '#F5F5F5', backgroundColor: '#FAFAFA' },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  billLabel: { fontSize: 12, color: '#666', fontWeight: '500' },
  billValue: { fontSize: 12, color: '#000', fontWeight: '700' },
  totalRowSplit: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#EFEFEF', paddingTop: 12 },
  grandLabel: { fontSize: 9, fontWeight: '900', color: '#888888', letterSpacing: 1, marginBottom: 4 },
  grandValue: { fontSize: 22, fontWeight: '900', color: '#000000', letterSpacing: -0.5 },

  actionContainer: { padding: 20 },
  systemBtn: { backgroundColor: '#000000', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderRadius: 2 },
  systemBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  successState: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  successText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: '#000000' }
});
