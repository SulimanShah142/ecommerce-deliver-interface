import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Image
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import UnifiedMap from "@/components/UnifiedMap";
import * as Location from "expo-location";
import LocationPermissionModal from "@/components/LoxationPermissionModal";

// 🎯 HIGH-SPEED PRODUCTION BINDINGS
const BASE_URL = "https://brand-gallery-backend.brand-gallery.workers.dev";
const LOCATION_IQ_TOKEN = "pk.ac03476010699238dcadcb4f0eb9a998";

export default function DelivererOrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addressName, setAddressName] = useState("Resolving address...");
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [myGPS, setMyGPS] = useState<[number, number] | null>(null);
const [showLocationPermissionModal, setShowLocationPermissionModal] =
  useState(false);
const [gpsServicesDisabled, setGpsServicesDisabled] =
  useState(false);
const [locationBootLoading, setLocationBootLoading] =
  useState(false);

const permissionFlowStarted = useRef(false);
  const isRTL = false;
  const locale = "en";

  // 1. REVERSE GEOCODING WITH EXPLICIT PATH STRUCTURE
  const getAddressFromCoords = async (lat: string, lon: string) => {
    try {
      console.log(`📡 Querying LocationIQ reverse geocoding for: ${lat}, ${lon}`);
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${LOCATION_IQ_TOKEN}&lat=${lat}&lon=${lon}&format=json`
      );
      
      if (!res.ok) throw new Error("LocationIQ Server Rejection");
      const data = await res.json();
      setAddressName(data?.display_name || "Street Address Not Found");
    } catch (e) {
      console.log("❌ Reverse geocoding failed:", e);
      setAddressName("Address unavailable offline");
    }
  };


  const handleAllowLocation = async () => {
  if (locationBootLoading) return;

  setLocationBootLoading(true);

  try {
    console.log("📍 Starting GPS flow...");

    let permission = await Location.getForegroundPermissionsAsync();

    if (!permission.granted) {
      permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Permission Required", "Location access is needed.");
        return;
      }
    }

    const currentPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (currentPosition?.coords) {
      setMyGPS([
        currentPosition.coords.latitude,
        currentPosition.coords.longitude,
      ]);
    }

    setGpsServicesDisabled(false);

    // ✅ CLOSE MODAL ONLY AFTER SUCCESS
    setShowLocationPermissionModal(false);

  } catch (err) {
    console.log("GPS error:", err);

    Alert.alert("GPS Error", "Please enable location services.");
  } finally {
    setLocationBootLoading(false);
  }
};
  // 2. PARALLEL RESOURCE DATA FETCH ENGINE
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const [orderRes, settingsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/orders/${id}`),
        fetch(`${BASE_URL}/api/admin/settings`),
      ]);

      if (!orderRes.ok || !settingsRes.ok) {
        throw new Error("Server metrics pool error");
      }

      const orderData = await orderRes.json();
      const settingsData = await settingsRes.json();

      setOrder(orderData);
      setSettings(settingsData);

      if (orderData?.latitude && orderData?.longitude) {
        // Run reverse geocoding safely after data returns
        getAddressFromCoords(orderData.latitude, orderData.longitude);
      }
    } catch (err) {
      console.error("❌ Fetch Data Error:", err);
      Alert.alert("Error", "Could not synchronize order records from cloud server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // 3. EFFECT A: MOUNT SEEDING INITIALIZATION
  useEffect(() => {
    setLoading(true);
    setOrder(null);
    setAddressName("Resolving address...");
    fetchData();
  }, [id, fetchData]);

  // 🎯 4. EFFECT B: THE SERIAL HARDWARE PROMPT INITIALIZER
  // Guarantees the location prompt displays first, completely clear of network context bottlenecks!
 // 🎯 4. EFFECT B: THE SERIAL HARDWARE PROMPT INITIALIZER
  // 🎯 THE COMPLIANT NATIVE GPS TELEMETRY & HARDWARE PERMISSION SYNC PIPELINE
  useEffect(() => {
    let gpsInterval: ReturnType<typeof setInterval>;

    const executeHardwarePermissionFlow = async () => {
      try {
        console.log("🛰️ Step 1: Hardware telemetry initialization handshake triggered");

        // Check if device hardware foreground permission layers are already provisioned
        const existingPermission = await Location.getForegroundPermissionsAsync();
        console.log("📍 Existing System Permission State:", existingPermission.status);

        // 🎯 THE LOOKUP CHECK: If permission has not been approved yet, fire custom branded alert modal overlay
        if (!existingPermission.granted) {
          console.log("📍 Hardware tracking permission missing -> deploying modal context");
          setShowLocationPermissionModal(true);
          return;
        }

        // Permission already approved natively -> step forward to initialize live telemetry request tracks
        await initializeGpsTracking();

      } catch (err: any) {
        console.error("❌ Critical layout hardware prompt lifecycle exception crash:", err.message || err);
      }
    };

    const initializeGpsTracking = async () => {
      try {
        console.log("✅ Device permission confirmed -> verifying hardware providers chips status");

        const providerStatus = await Location.getProviderStatusAsync();
        console.log("🛰️ Chips Hardware Provider Status:", providerStatus);

        // If the smartphone device has its manual toggle switch turned off, fire configuration warning modal overlay
        if (!providerStatus.locationServicesEnabled) {
          console.log("📍 System GPS switches turned off -> rendering branded warning modal overlay");
          setGpsServicesDisabled(true);
          setShowLocationPermissionModal(true);
          return;
        }

        // Pre-fill last known coordinate parameters instantly to bypass network connection gaps on mount
        let currentLock = await Location.getLastKnownPositionAsync({});
        if (!currentLock) {
          currentLock = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }

        if (currentLock?.coords) {
          const mountCoordsArray: [number, number] = [
            currentLock.coords.latitude,
            currentLock.coords.longitude,
          ];
          console.log("✅ Mount baseline coordinates locked cleanly:", mountCoordsArray);
          setMyGPS(mountCoordsArray);
        }

        // 🎯 THE RECONCILED RUNNING BOUNDARIES GATES:
        // Automatically turns on telemetry distribution streams for BOTH 'confirmed' and 'picked_up' milestones!
        // This ensures tracking markers show up on maps long before warehouse cargo collection occurs.
        const isLiveTrackingActive = order?.status === "picked_up" || order?.status === "confirmed";

        if (isLiveTrackingActive) {
          console.log(`🛵 [HEARTBEAT LOOP ACTIVE] Spinning up streaming synchronizer for state: ${order.status.toUpperCase()}`);

          const syncGpsHeartbeatNode = async () => {
            try {
              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });

              const trackedPos: [number, number] = [
                loc.coords.latitude,
                loc.coords.longitude,
              ];

              // Update client component view states layouts instantly
              setMyGPS(trackedPos);

              // Transport verified coordinate strings over the wire to your Hono backend route endpoint
              await fetch(`${BASE_URL}/api/orders/${id}/update-gps`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Accept": "application/json"
                },
                body: JSON.stringify({
                  lat: trackedPos[0].toFixed(6),
                  lng: trackedPos[1].toFixed(6),
                }),
              });

              console.log(`🛰️ GPS telemetry heartbeat synced successfully for Order ID: ${id}`);
            } catch (loopErr: any) {
              console.log("⚠️ Tracking loop packet iteration pass skipped:", loopErr.message || loopErr);
            }
          };

          // Execute once immediately on status transition change to refresh edge server cache maps anchors
          await syncGpsHeartbeatNode();

          // Configure standard clean 12-second streaming loops intervals updates
          gpsInterval = setInterval(syncGpsHeartbeatNode, 12000);
        }

      } catch (gpsErr: any) {
        console.log("❌ GPS bootstrap initialization tracking routine failed:", gpsErr.message || gpsErr);
      }
    };

    // Only initiate permission checks flows if a valid database record row is loaded
    if (order?.status) {
      executeHardwarePermissionFlow();
    }

    return () => {
      if (gpsInterval) {
        console.log("🟡 Disposing driver background tracking interval layer block for order ID:", id);
        clearInterval(gpsInterval);
      }
    };
    
    // 🎯 RECONCILED FIXED DEPENDENCIES MATRIX FIX:
    // Stripped out the mutable raw order object block entirely to eliminate infinite loop re-renders!
  }, [order?.status, id]);


   const updateStatus = async (newStatus: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        // 🎯 SUCCESS SYNC FIX: Re-fetch entire baseline dataset to update states cleanly
        await fetchData();
        Alert.alert("Success", `Status updated to: ${newStatus.replace("_", " ").toUpperCase()}`);
      } else {
        throw new Error("Status update failed");
      }
    } catch (e: any) {
      console.log("Update status error exception:", e.message);
      Alert.alert("Error", "Update failed.");
    } finally {
      setLoading(false);
    }
  };


  const toLocalNumbers = (num: string | number) => {
    const str = Math.round(Number(num || 0)).toLocaleString();
    if (locale === "en") return str;
    const easternDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
    return str.replace(/[0-9]/g, (w) => easternDigits[parseInt(w)]);
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
    parseFloat(settings?.warehouseLat || settings?.warehouse_lat) || 34.533,
    parseFloat(settings?.warehouseLng || settings?.warehouse_lng) || 69.166,
  ];

  const destinationCoords: [number, number] = [
    parseFloat(order.latitude) || 34.5553,
    parseFloat(order.longitude) || 69.2075,
  ];

    // --- Inside app/deliverer/orders/[id].tsx configuration parameters area ---
  
  // 🎯 THE SUBTOTAL AUTOMATION FIX: Sum items dynamically from the delivery array to replace subtotal zero
   // --- Inside app/deliverer/orders/[id].tsx right above your return block ---
  
  const baseSubtotal = Array.isArray(order?.items)
    ? order.items.reduce((sum: number, it: any) => sum + (parseFloat(it.price || '0') * (Number(it.quantity) || 1)), 0)
    : parseFloat(order?.subtotal || order?.subtotalAmount || "0");

  // 🎯 THE ABSOLUTE RESOLUTION: Extract the fresh root shippingFee column cleanly!
  const parsedShippingFreight = parseFloat(order?.shippingFee || '0');

  const markdownDiscount = parseFloat(order?.discount || order?.discountAmount || "0");
  const totalInvoiceCollectBalance = parseFloat(order?.totalAmount || order?.total_amount || "0");
  return (
    <View style={styles.container}>
      {mapFullscreen && (
        <View style={styles.fullscreenOverlay}>
          <UnifiedMap
            role="DELIVER"
            warehouseCoords={warehouseLocation}
            destinationCoords={destinationCoords}
            driverCoords={myGPS}
            isFullscreen={true}
            setIsFullscreen={setMapFullscreen}
          />
        </View>
      )}
      <View style={styles.mapWrapper}>
        <UnifiedMap
          role="DELIVER"
          warehouseCoords={warehouseLocation}
          destinationCoords={destinationCoords}
          driverCoords={myGPS}
          isFullscreen={mapFullscreen}
          setIsFullscreen={setMapFullscreen}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backFloat, { top: insets.top + 10 }]}
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.detailsSheet}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainInfo}>
          <View style={[styles.headerRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
              <Text style={styles.sectionTitle}>RECIPIENT CUSTOMER</Text>
              
              {/* 🎯 THE NAME SYNCHRONIZATION: 
                  Renders the exact client name input by the buyer during checkout! */}
              <Text style={styles.customerName}>
                {order.customerName ? order.customerName.toUpperCase() : "GUEST CUSTOMER"}
              </Text>
            </View>

            <View style={styles.statusTag}>
              <Text style={styles.statusTagText}>
                {order.status?.replace("_", " ")?.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.contactCard}>
            <Text style={styles.sectionTitle}>Customer Manifest</Text>

            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>NAME:</Text>{' '}
              { (order?.customerName || order?.name || '').toUpperCase() }
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>PHONE:</Text>{' '}
              { order?.phoneNumber || order?.phone || 'N/A' }
            </Text>

            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>ADDRESS:</Text>{' '}
              { order?.address ? order.address.toUpperCase() : addressName }
            </Text>
          </View>

          {/* ======================================================
              🎯 CARGO ITEMS MANIFEST ARRAY LIST SECTION
              ====================================================== */}
          <View style={[styles.financialManifestCard, { marginTop: 0, marginBottom: 16 }]}>
            <Text style={[styles.manifestSectionTitle, isRTL && { textAlign: "right" }]}>
              ASSIGNED CARGO ITEMS ({order.items?.length || 0})
            </Text>

            {order.items?.map((item: any, idx: number) => {
              const parsedUnitPrice = parseFloat(item.price || item.unitPrice || '0');
              const itemQuantity = Number(item.quantity) || 1;
              const rowItemTotalAmount = parsedUnitPrice * itemQuantity;

              return (
                <View 
                  key={`driver-item-row-${item.id || idx}`} 
                  style={[
                    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
                    isRTL && { flexDirection: 'row-reverse' }
                  ]}
                >
                  <Image
                    source={{ uri: item.productImage || item.imageUrl }} 
                    style={{ width: 40, height: 52, backgroundColor: '#FAFAFA', borderWidth: 0.5, borderColor: '#EAEAEA', borderRadius: 2 }} 
                  />
                  
                  <View style={[{ flex: 1, paddingHorizontal: 12 }, isRTL ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#111111' }} numberOfLines={1}>
                      {(item.productName || item.name || '').toUpperCase()}
                    </Text>
                    
                    <Text style={{ fontSize: 10, color: '#666666', fontWeight: '600', marginTop: 2 }}>
                      QTY: {itemQuantity}  |  
                      SIZE: <Text style={{ color: '#000000', fontWeight: '800' }}>{(item.selectedSize || item.size || 'STANDARD').toUpperCase()}</Text>  |  
                      COLOR: <Text style={{ color: '#000000', fontWeight: '800' }}>{(item.selectedColor || item.color || 'N/A').toUpperCase()}</Text>
                    </Text>
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#000000' }}>
                    AFN {Math.round(rowItemTotalAmount).toLocaleString()}
                  </Text>
                </View>
              );
            })}

            {/* ======================================================
                🎯 ACCOUNTING BILLING BREAKDOWN TRAY SECTION
                ====================================================== */}
            <View style={{ marginTop: 16 }}>
              <View style={[styles.invoiceRowLine, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={styles.invoiceLabel}>Items Subtotal</Text>
                <Text style={styles.invoiceValue}>AFN {toLocalNumbers(baseSubtotal)}</Text>
              </View>

              {markdownDiscount > 0 && (
                <View style={[styles.invoiceRowLine, isRTL && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.invoiceLabel, { color: "#FF3B30" }]}>Promotional Discount</Text>
                  <Text style={[styles.invoiceValue, { color: "#FF3B30" }]}>- AFN {toLocalNumbers(markdownDiscount)}</Text>
                </View>
              )}

              <View style={[styles.invoiceRowLine, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={styles.invoiceLabel}>Logistics Shipping Freight</Text>
                <Text style={[styles.invoiceValue, parsedShippingFreight === 0 && { color: "#22C55E", fontWeight: "900" }]}>
                  {parsedShippingFreight === 0 ? "FREE SHIPPING" : `AFN ${toLocalNumbers(parsedShippingFreight)}`}
                </Text>
              </View>

              <View style={styles.dividerHairlineLine} />

              <View style={[styles.invoiceRowLine, isRTL && { flexDirection: "row-reverse" }, { marginBottom: 0 }]}>
                <Text style={styles.grandTotalLabel}>TOTAL PAYABLE CASH COLLECT</Text>
                <Text style={styles.grandTotalValue}>AFN {toLocalNumbers(totalInvoiceCollectBalance)}</Text>
              </View>
            </View>
          </View>

          {/* LIVE WORKFLOW STATUS TRANSITION ACTION LAYERS BUTTONS */}
          {order.status === "confirmed" && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => updateStatus("picked_up")}
            >
              <Ionicons name="cube-sharp" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>PICK UP CARGO FROM WAREHOUSE</Text>
            </TouchableOpacity>
          )}

          {order.status === "picked_up" && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: "#22C55E" }]}
              onPress={() => updateStatus("delivered")}
            >
              <Ionicons name="checkmark-circle-sharp" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>CONFIRM SECURE DELIVERY</Text>
            </TouchableOpacity>
          )}
         <LocationPermissionModal
  visible={showLocationPermissionModal}
  loading={locationBootLoading}
  title={
    gpsServicesDisabled
      ? "Turn On Device Location"
      : "Enable Live GPS Tracking"
  }
  subtitle={
    gpsServicesDisabled
      ? "Enable GPS for navigation."
      : "We use location for delivery tracking."
  }
  onCancel={() => {
    if (locationBootLoading) return;
    setShowLocationPermissionModal(false);
  }}
  onAllow={handleAllowLocation}
/>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
  },

  loaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#777',
    letterSpacing: 1.5,
    marginTop: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // =========================
  // MAP SECTION
  // =========================
  mapWrapper: {
    width: '100%',
    height: 360,
    position: 'relative',
    backgroundColor: '#F5F5F5',
  },

  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: '#FFFFFF',
  },

  backFloat: {
    position: 'absolute',
    left: 16,
    top: 16,

    width: 42,
    height: 42,
    borderRadius: 12,

    backgroundColor: 'rgba(255,255,255,0.95)',

    justifyContent: 'center',
    alignItems: 'center',

    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  // =========================
  // SHEET CONTAINER
  // =========================
  detailsSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',

    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,

    marginTop: -20,
  },

  mainInfo: {
    padding: 20,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',

    marginBottom: 20,
  },

  // =========================
  // CUSTOMER HEADER
  // =========================
  sectionTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: '#999',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  customerName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    letterSpacing: -0.4,
  },

  statusTag: {
    backgroundColor: '#000',

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 6,
  },

  statusTagText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // =========================
  // CONTACT CARD
  // =========================
  contactCard: {
    borderWidth: 1,
    borderColor: '#EFEFEF',

    padding: 16,
    borderRadius: 16,

    backgroundColor: '#FAFAFA',

    marginBottom: 20,
  },

  contactAction: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingBottom: 12,
    marginBottom: 12,

    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },

  contactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  // =========================
  // ADDRESS BLOCK
  // =========================
  addressBox: {
    width: '100%',
  },

  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  addressTitleText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#666',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  addressBodyParagraph: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    fontWeight: '500',
  },

  // =========================
  // FINANCIAL MANIFEST
  // =========================
  financialManifestCard: {
    backgroundColor: '#FFF',

    borderWidth: 1,
    borderColor: '#EFEFEF',

    padding: 16,
    borderRadius: 16,

    marginBottom: 20,
  },

  manifestSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  invoiceRowLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingVertical: 6,
  },

  invoiceLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },

  invoiceValue: {
    fontSize: 12,
    color: '#000',
    fontWeight: '800',
  },

  dividerHairlineLine: {
    height: 1,
    backgroundColor: '#EFEFEF',
    marginVertical: 10,
  },

  grandTotalLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },

  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
  },

  // =========================
  // PRIMARY ACTION
  // =========================
  primaryActionBtn: {
    backgroundColor: '#000',

    paddingVertical: 16,

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    borderRadius: 14,

    marginTop: 10,

    width: '100%',

    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },

  primaryActionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // =========================
  // ERROR STATE
  // =========================
  errorText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#BBB',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // ================ Additional styles copied from admin for parity ================
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F2F2F2'
  },
  headerInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inlineBackBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 12, fontWeight: '900', color: '#000' },
  meta: { fontSize: 11, color: '#777' },
  detailText: { fontSize: 13, color: '#333', marginBottom: 6 },
  detailLabel: { fontWeight: '900', color: '#666', fontSize: 11 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  thumb: { width: 40, height: 52, backgroundColor: '#FAFAFA', borderWidth: 0.5, borderColor: '#EAEAEA', borderRadius: 2 },
  itemName: { fontSize: 12, fontWeight: '900', color: '#111' },
  itemMeta: { fontSize: 10, color: '#666', marginTop: 4 },
  attributeValueHighlight: { fontWeight: '800', color: '#000' },
  price: { fontSize: 12, fontWeight: '900', color: '#000' },
  actionRow: { marginTop: 12 },
  confirmBtn: { backgroundColor: '#000', paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  confirmBtnText: { color: '#FFF', fontWeight: '900', marginLeft: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  totalLabel: { fontSize: 12, color: '#666', fontWeight: '700' },
  totalValue: { fontSize: 16, color: '#000', fontWeight: '900' },
  recapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  recapLabel: { fontSize: 12, color: '#666', fontWeight: '700' },
  recapVal: { fontSize: 12, color: '#000', fontWeight: '900' },
});