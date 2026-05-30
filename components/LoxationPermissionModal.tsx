
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationPermissionModalProps {
  visible: boolean;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  onAllow: () => void;
  onCancel?: () => void;
}

export default function LocationPermissionModal({
  visible,
  loading = false,
  title = 'ENABLE LIVE LOCATION',
  subtitle = 'We use your live location to power real-time delivery tracking, route accuracy, order protection, and faster dispatch synchronization.',
  confirmText = 'ALLOW LOCATION',
  cancelText = 'NOT NOW',
  onAllow,
  onCancel,
}: LocationPermissionModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* HEADER ICON */}
          <View style={styles.iconWrap}>
            <Ionicons
              name="location-sharp"
              size={30}
              color="#FFFFFF"
            />
          </View>

          {/* TITLES */}
          <Text style={styles.title}>
            {title}
          </Text>

          <Text style={styles.subtitle}>
            {subtitle}
          </Text>

          {/* FEATURE ROWS */}
          <View style={styles.featuresWrap}>

            <View style={styles.featureRow}>
              <Ionicons
                name="navigate-circle-outline"
                size={18}
                color="#000000"
              />
              <Text style={styles.featureText}>
                Real-time order tracking
              </Text>
            </View>

            <View style={styles.featureRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color="#000000"
              />
              <Text style={styles.featureText}>
                Secure delivery verification
              </Text>
            </View>

            <View style={styles.featureRow}>
              <Ionicons
                name="flash-outline"
                size={18}
                color="#000000"
              />
              <Text style={styles.featureText}>
                Faster dispatch routing
              </Text>
            </View>

          </View>

          {/* ACTIONS */}
          <TouchableOpacity
            style={styles.allowBtn}
            activeOpacity={0.9}
            disabled={loading}
            onPress={onAllow}
          >
            {loading ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />
            ) : (
              <Text style={styles.allowBtnText}>
                {confirmText}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            activeOpacity={0.7}
            disabled={loading}
            onPress={onCancel}
          >
            <Text style={styles.cancelBtnText}>
              {cancelText}
            </Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
  },

  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.8,
    marginBottom: 12,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 22,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 26,
  },

  featuresWrap: {
    width: '100%',
    gap: 14,
    marginBottom: 30,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 12,
  },

  featureText: {
    fontSize: 13,
    color: '#111111',
    fontWeight: '700',
    flex: 1,
  },

  allowBtn: {
    width: '100%',
    height: 54,
    borderRadius: 18,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  allowBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  cancelBtn: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cancelBtnText: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

