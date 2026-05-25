import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import UnifiedMap from "@/components/UnifiedMap";
import * as Location from "expo-location";

const BASE_URL = "https://workers.dev";
const LOCATION_IQ_TOKEN = "pk.68df6d63d6b1d167fde9b6b77d6118d3";

export default function DelivererOrderDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addressName, setAddressName] = useState("Resolving address...");
  const [myGPS, setMyGPS] = useState<[number, number] | null>(null);

  const isRTL = false;
  const locale = "en";

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      const [orderRes, settingsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/orders/${id}`),
        fetch(`${BASE_URL}/api/admin/settings`),
      ]);

      if (!orderRes.ok || !settingsRes.ok) {
        throw new Error("Server metrics error");
      }

      const orderData = await orderRes.json();
      const settingsData = await settingsRes.json();

      setOrder(orderData);
      setSettings(settingsData);

      if (orderData?.latitude && orderData?.longitude) {
        getAddressFromCoords(orderData.latitude, orderData.longitude);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      Alert.alert(
        "Error",
        "Could not synchronize order records from cloud server.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setOrder(null);
    setMyGPS(null);
    setAddressName("Resolving address...");

    fetchData();
  }, [id, fetchData]);

  const getAddressFromCoords = async (lat: string, lon: string) => {
    try {
      const res = await fetch(
        `https://us1.locationiq.com/v1/reverse.php?key=${LOCATION_IQ_TOKEN}&lat=${lat}&lon=${lon}&format=json`,
      );

      if (!res.ok) {
        throw new Error("Reverse geocoding failed");
      }

      const data = await res.json();

      setAddressName(data?.display_name || "Street Address Not Found");
    } catch (e) {
      console.log("Reverse geocoding error:", e);
      setAddressName("Address unavailable offline");
    }
  };

  useEffect(() => {
    let gpsInterval: NodeJS.Timeout;

    const startGpsPush = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Permission Blocked",
            "GPS tracking must be active to navigate fleet runs.",
          );
          return;
        }

        let initialCoords: [number, number] = [34.533, 69.166];

        try {
          const providerStatus = await Location.getProviderStatusAsync();

          if (providerStatus.locationServicesEnabled) {
            const lastKnown = await Location.getLastKnownPositionAsync({});

            if (lastKnown) {
              initialCoords = [
                lastKnown.coords.latitude,
                lastKnown.coords.longitude,
              ];
            } else {
              const initLoc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });

              initialCoords = [
                initLoc.coords.latitude,
                initLoc.coords.longitude,
              ];
            }
          }
        } catch (locationHardwareError) {
          console.log(
            "Location provider fallback triggered:",
            locationHardwareError,
          );

          if (settings?.warehouseLat && settings?.warehouseLng) {
            initialCoords = [
              parseFloat(settings.warehouseLat),
              parseFloat(settings.warehouseLng),
            ];
          }
        }

        setMyGPS(initialCoords);

        if (order?.status === "picked_up") {
          gpsInterval = setInterval(async () => {
            try {
              const providerCheck = await Location.getProviderStatusAsync();

              if (!providerCheck.locationServicesEnabled) {
                return;
              }

              const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });

              const currentCoords: [number, number] = [
                loc.coords.latitude,
                loc.coords.longitude,
              ];

              setMyGPS(currentCoords);

              await fetch(`${BASE_URL}/api/orders/${id}/update-gps`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  lat: currentCoords[0].toString(),
                  lng: currentCoords[1].toString(),
                }),
              });

              console.log(
                `🛰️ Dispatching location heartbeat update for Order: ${id}`,
              );
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
      if (gpsInterval) {
        clearInterval(gpsInterval);
      }
    };
  }, [order?.status, id, settings]);

  const updateStatus = async (newStatus: string) => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/api/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (res.ok) {
        await fetchData();

        Alert.alert(
          "Success",
          `Status updated to: ${newStatus.replace("_", " ").toUpperCase()}`,
        );
      } else {
        throw new Error("Status update failed");
      }
    } catch (e) {
      console.log("Update status error:", e);

      Alert.alert("Error", "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  const toLocalNumbers = (num: string | number) => {
    const str = Math.round(Number(num || 0)).toLocaleString();

    if (locale === "en") {
      return str;
    }

    const easternDigits = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

    return str.replace(/[0-9]/g, (w) => {
      return easternDigits[parseInt(w)];
    });
  };

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

  const baseSubtotal = parseFloat(
    order?.subtotal || order?.subtotalAmount || "0",
  );

  const rawShippingValue =
    order?.shipping || order?.shippingAmount || order?.shippingFee;

  const parsedShippingFreight = parseFloat(rawShippingValue?.toString() || "0");

  const markdownDiscount = parseFloat(
    order?.discount || order?.discountAmount || "0",
  );

  const totalInvoiceCollectBalance = parseFloat(
    order?.totalAmount || order?.total_amount || "0",
  );

  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        <UnifiedMap
          role="DELIVER"
          warehouseCoords={warehouseLocation}
          destinationCoords={destinationCoords}
          driverCoords={myGPS}
        />

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backFloat, { top: insets.top + 10 }]}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.detailsSheet}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainInfo}>
          <View
            style={[
              styles.headerRow,
              isRTL && {
                flexDirection: "row-reverse",
              },
            ]}
          >
            <View
              style={{
                flex: 1,
                alignItems: isRTL ? "flex-end" : "flex-start",
              }}
            >
              <Text style={styles.sectionTitle}>RECIPIENT CUSTOMER</Text>

              <Text style={styles.customerName}>
                {order.customerName?.toUpperCase()}
              </Text>
            </View>

            <View style={styles.statusTag}>
              <Text style={styles.statusTagText}>
                {order.status?.replace("_", " ")?.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.contactCard}>
            <TouchableOpacity
              style={[
                styles.contactAction,
                isRTL && {
                  flexDirection: "row-reverse",
                },
              ]}
              onPress={() => Linking.openURL(`tel:${order.phoneNumber}`)}
            >
              <Ionicons
                name="call"
                size={18}
                color="#000"
                style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }}
              />

              <Text style={styles.contactValue}>{order.phoneNumber}</Text>
            </TouchableOpacity>

            <View style={styles.addressBox}>
              <View
                style={[
                  styles.addressHeader,
                  isRTL && {
                    flexDirection: "row-reverse",
                  },
                ]}
              >
                <Ionicons
                  name="location-sharp"
                  size={16}
                  color="#000000"
                  style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }}
                />

                <Text style={styles.addressTitleText}>DELIVERY ADDRESS</Text>
              </View>

              <Text
                style={[
                  styles.addressBodyParagraph,
                  isRTL && {
                    textAlign: "right",
                  },
                ]}
              >
                {addressName}
              </Text>
            </View>
          </View>

          <View style={styles.financialManifestCard}>
            <Text
              style={[
                styles.manifestSectionTitle,
                isRTL && {
                  textAlign: "right",
                },
              ]}
            >
              FINANCIAL RECAP STATEMENT
            </Text>

            <View
              style={[
                styles.invoiceRowLine,
                isRTL && {
                  flexDirection: "row-reverse",
                },
              ]}
            >
              <Text style={styles.invoiceLabel}>Items Subtotal</Text>

              <Text style={styles.invoiceValue}>
                AFN {toLocalNumbers(baseSubtotal)}
              </Text>
            </View>

            {markdownDiscount > 0 && (
              <View
                style={[
                  styles.invoiceRowLine,
                  isRTL && {
                    flexDirection: "row-reverse",
                  },
                ]}
              >
                <Text style={[styles.invoiceLabel, { color: "#FF3B30" }]}>
                  Promotional Discount
                </Text>

                <Text style={[styles.invoiceValue, { color: "#FF3B30" }]}>
                  - AFN {toLocalNumbers(markdownDiscount)}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.invoiceRowLine,
                isRTL && {
                  flexDirection: "row-reverse",
                },
              ]}
            >
              <Text style={styles.invoiceLabel}>
                Logistics Shipping Freight
              </Text>

              <Text
                style={[
                  styles.invoiceValue,
                  parsedShippingFreight === 0 && {
                    color: "#22C55E",
                    fontWeight: "900",
                  },
                ]}
              >
                {parsedShippingFreight === 0
                  ? "FREE SHIPPING"
                  : `AFN ${toLocalNumbers(parsedShippingFreight)}`}
              </Text>
            </View>

            <View style={styles.dividerHairlineLine} />

            <View
              style={[
                styles.invoiceRowLine,
                isRTL && {
                  flexDirection: "row-reverse",
                },
                { marginBottom: 0 },
              ]}
            >
              <Text style={styles.grandTotalLabel}>
                TOTAL PAYABLE CASH COLLECT
              </Text>

              <Text style={styles.grandTotalValue}>
                AFN {toLocalNumbers(totalInvoiceCollectBalance)}
              </Text>
            </View>
          </View>

          {order.status === "confirmed" && (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => updateStatus("picked_up")}
            >
              <Ionicons
                name="cube-sharp"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />

              <Text style={styles.primaryActionBtnText}>
                PICK UP CARGO FROM WAREHOUSE
              </Text>
            </TouchableOpacity>
          )}

          {order.status === "picked_up" && (
            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                {
                  backgroundColor: "#22C55E",
                },
              ]}
              onPress={() => updateStatus("delivered")}
            >
              <Ionicons
                name="checkmark-circle-sharp"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />

              <Text style={styles.primaryActionBtnText}>
                CONFIRM SECURE DELIVERY
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  loaderText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#666666",
    letterSpacing: 1.5,
    marginTop: 12,
    textAlign: "center",
  },

  mapWrapper: {
    width: "100%",
    height: 380,
    position: "relative",
    backgroundColor: "#F5F5F5",
  },

  backFloat: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.96)",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  detailsSheet: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },

  mainInfo: {
    padding: 22,
    paddingBottom: 40,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 10,
    fontWeight: "900",
    color: "#8A8A8A",
    letterSpacing: 1.4,
    marginBottom: 6,
  },

  customerName: {
    fontSize: 22,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: -0.4,
  },

  statusTag: {
    backgroundColor: "#000000",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  statusTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  contactCard: {
    borderWidth: 1,
    borderColor: "#EFEFEF",
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#FAFAFA",
    marginBottom: 24,
  },

  contactAction: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
    marginBottom: 14,
  },

  contactValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },

  addressBox: {
    width: "100%",
  },

  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  addressTitleText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#555555",
    letterSpacing: 0.8,
  },

  addressBodyParagraph: {
    fontSize: 13,
    color: "#333333",
    lineHeight: 20,
    fontWeight: "500",
  },

  financialManifestCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    padding: 18,
    borderRadius: 18,
    marginBottom: 24,
  },

  manifestSectionTitle: {
    fontSize: 11,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 1,
    marginBottom: 16,
  },

  invoiceRowLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  invoiceLabel: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "600",
  },

  invoiceValue: {
    fontSize: 13,
    color: "#000000",
    fontWeight: "800",
  },

  dividerHairlineLine: {
    height: 1,
    backgroundColor: "#EFEFEF",
    marginVertical: 12,
  },

  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 0.5,
  },

  grandTotalValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000",
  },

  primaryActionBtn: {
    backgroundColor: "#000000",
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
    marginTop: 10,
    width: "100%",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  primaryActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
