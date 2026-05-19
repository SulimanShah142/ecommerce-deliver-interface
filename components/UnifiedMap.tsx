import React, { useState, useRef, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Modal, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface UnifiedMapProps {
  role: 'USER' | 'DELIVER' | 'ADMIN';
  userCoords?: [number, number] | null;
  destinationCoords?: [number, number] | null;
  warehouseCoords?: [number, number] | null;
  onLocationSelect?: (coords: [number, number]) => void;
  driverCoords?: [number, number] | null;
}

const DEFAULT_KABUL: [number, number] = [34.5553, 69.2075];

export default function UnifiedMap({
  role,
  userCoords,
  destinationCoords,
  warehouseCoords,
  driverCoords,
  onLocationSelect,
}: UnifiedMapProps) {
  const [loading, setLoading] = useState(true);
  const [isFullMap, setIsFullMap] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const runJS = (code: string) => {
    webViewRef.current?.injectJavaScript(code);
  };

  // 1. FIX: Define handleMessage at the top level of the component
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (onLocationSelect && data.lat && data.lng) {
        onLocationSelect([data.lat, data.lng]);
      }
    } catch (e) {
      console.warn("Map message error:", e);
    }
  };

  const centerLat = destinationCoords?.[0] || userCoords?.[0] || DEFAULT_KABUL[0];
  const centerLng = destinationCoords?.[1] || userCoords?.[1] || DEFAULT_KABUL[1];

   const mapHtml = useMemo(() => {
    // 1. Prepare safe strings for JS injection
    const whLat = warehouseCoords?.[0] || 0;
    const whLng = warehouseCoords?.[1] || 0;
    const destLat = destinationCoords?.[0] || 0;
    const destLng = destinationCoords?.[1] || 0;

    const hasWarehouse = !!(warehouseCoords && warehouseCoords[0]);
    const hasDest = !!(destinationCoords && destinationCoords[0]);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=0.8, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { height: 100vh; width: 100vw; background: #e0e0e0; }
          .icon-label { font-size: 24px; text-align: center; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3)); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false 
          }).setView([${centerLat}, ${centerLng}], 13);
          
          L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20
          }).addTo(map);

          function createEmojiIcon(emoji) {
            return L.divIcon({
              html: '<div class="icon-label">' + emoji + '</div>',
              className: 'custom-div-icon',
              iconSize: [30, 30],
              iconAnchor: [15, 30]
            });
          }

          // 2. Warehouse Marker
          if (${hasWarehouse}) {
            L.marker([${whLat}, ${whLng}], {
              icon: createEmojiIcon('🏢')
            }).addTo(map).bindPopup("Store");
          }

          // 3. Destination Marker
          var destMarker = null;
          if (${hasDest}) {
            destMarker = L.marker([${destLat}, ${destLng}], {
              icon: createEmojiIcon('📍')
            }).addTo(map);
          }

          // 4. Interaction (USER Role)
          if ('${role}' === 'USER') {
            map.on('click', function(e) {
              var lat = e.latlng.lat;
              var lng = e.latlng.lng;
              if (destMarker) map.removeLayer(destMarker);
              destMarker = L.marker([lat, lng], { icon: createEmojiIcon('📍') }).addTo(map);
              window.ReactNativeWebView.postMessage(JSON.stringify({ lat, lng }));
            });
          }

          // 5. Routing Line Fix
          if (${hasWarehouse} && ${hasDest}) {
            // OSRM Format: lng,lat;lng,lat
            var url = 'https://router.project-osrm.org/route/v1/driving/' + 
                      '${whLng},${whLat};${destLng},${destLat}' + 
                      '?overview=full&geometries=geojson';

            fetch(url)
              .then(function(r) { return r.json(); })
              .then(function(data) {
                if (data.routes && data.routes.length > 0) {
                  L.geoJSON(data.routes[0].geometry, {
                    style: { color: '#0A1128', weight: 6, opacity: 0.8 }
                  }).addTo(map);
                  
                  var bounds = L.latLngBounds([
                    [${whLat}, ${whLng}],
                    [${destLat}, ${destLng}]
                  ]);
                  map.fitBounds(bounds, { padding: [40, 40] });
                }
              })
              .catch(function(err) { console.error('Route error:', err); });
          }

          setTimeout(function() { map.invalidateSize(); }, 500);
        </script>
      </body>
      </html>
    `;
  }, [role, warehouseCoords, destinationCoords, centerLat, centerLng]);

  const MapContent = () => (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage} // Works now!
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.map}
      />

      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => runJS("map.zoomIn();")}>
          <Ionicons name="add" size={24} color="#0A1128" />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity style={styles.zoomBtn} onPress={() => runJS("map.zoomOut();")}>
          <Ionicons name="remove" size={24} color="#0A1128" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.expandBtn} onPress={() => setIsFullMap(!isFullMap)}>
        <Ionicons name={isFullMap ? "contract" : "expand"} size={20} color="#000" />
      </TouchableOpacity>
      
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0A1128" />
        </View>
      )}
    </View>
  );

  return (
    <View style={isFullMap ? styles.fullscreenWrapper : styles.outerWrapper}>
      {!isFullMap ? (
        <MapContent />
      ) : (
        <Modal visible={isFullMap} animationType="slide">
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsFullMap(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <MapContent />
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: { height: 220, borderRadius: 15, overflow: 'hidden', backgroundColor: '#eee', borderWidth: 1, borderColor: '#ddd' },
  fullscreenWrapper: { flex: 1 },
  map: { flex: 1 },
  expandBtn: { position: 'absolute', bottom: 15, right: 15, backgroundColor: '#fff', padding: 10, borderRadius: 10, elevation: 5, zIndex: 10 },
  zoomControls: { position: 'absolute', left: 15, top: '35%', backgroundColor: '#fff', borderRadius: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, borderWidth: 1, borderColor: '#eee', zIndex: 10 },
  zoomBtn: { padding: 10, alignItems: 'center', justifyContent: 'center' },
  zoomDivider: { height: 1, backgroundColor: '#eee', marginHorizontal: 5 },
  modalHeader: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20, zIndex: 100 },
  closeBtn: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 25 },
  loader: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', zIndex: 200 }
});
