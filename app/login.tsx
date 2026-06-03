import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { OneSignal } from 'react-native-onesignal';

const API_URL = "https://brand-gallery-backend.brand-gallery.workers.dev";

export default function DelivererLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("Error", "Please fill all fields");

    setLoading(true);
    try {
      console.log("🔐 Dispatching secure lightweight fleet login request...");
      const res = await fetch(`${API_URL}/api/deliverer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password })
      });

      const data = await res.json();

      if (res.ok && data?.id) {
        // 🎯 THE CRITICAL PROTECTION FIX: Force absolute string coercion!
        // This ensures the ID stored matches exactly what your root layout's 
        // fetch sweep loops check for on automatic initialization mounts.
        const serializedDriverId = String(data.id).trim();
        const serializedDriverName = String(data.name || 'Driver').trim();

        // 1. Save standardized records down to local SecureStore disk tracks
        await SecureStore.setItemAsync('deliverer_id', serializedDriverId);
        await SecureStore.setItemAsync('deliverer_name', serializedDriverName);
        await SecureStore.setItemAsync('deliverer_email', email.toLowerCase().trim()); 
        
        // 2. Immediate OneSignal Profile Link Alignment Mapping
        OneSignal.login(serializedDriverId); 
        console.log(`✅ [LOGIN SUCCESS] Fleet token allocated for Deliverer #${serializedDriverId}`);
        
        // 3. Redirect to the root tabbed dashboard after login
        router.replace('/'); 
      } else {
        Alert.alert("Authentication Failed", data.error || "Invalid driver credentials provided.");
      }
    } catch (e: any) {
      console.error("❌ Fleet sign-in transaction dropout:", e.message || e);
      Alert.alert("Connection Delay", "Unable to establish communication with dispatch servers.");
    } finally {
      setLoading(false);
    }
  };

return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
  >
  <View style={styles.container}>
    <View style={styles.header}>
      <Text style={styles.brandTitle}>BG FLEET</Text>
      <Text style={styles.title}>OPERATIONAL LOGIN</Text>
      <Text style={styles.subtitle}>Enter your credentials to access the delivery system</Text>
    </View>

    <View style={styles.form}>
      <View style={styles.inputBox}>
        <Text style={styles.label}>OFFICIAL EMAIL</Text>
        <TextInput 
          placeholder="email@brandgallery.com" 
          placeholderTextColor="#BBB"
          style={styles.input} 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput 
          placeholder="••••••••" 
          placeholderTextColor="#BBB"
          style={styles.input} 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ACCESS SYSTEM</Text>}
      </TouchableOpacity>
    </View>

    <View style={styles.footer}>
      <Text style={styles.footerText}>SECURE GATEWAY v1.0.4</Text>
    </View>
  </View>
  </KeyboardAvoidingView>

);

}
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 30, 
    justifyContent: 'center' 
  },
  header: { 
    marginBottom: 50, 
    alignItems: 'center' 
  },
  brandTitle: { 
    fontSize: 32, 
    fontWeight: '900', 
    letterSpacing: 6, 
    color: '#000', 
    marginBottom: 10 
  },
  title: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#000', 
    letterSpacing: 2 
  },
  subtitle: { 
    fontSize: 12, 
    color: '#999', 
    textAlign: 'center', 
    marginTop: 10, 
    lineHeight: 18 
  },
  form: { 
    width: '100%' 
  },
  inputBox: { 
    marginBottom: 25, 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  label: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#000', 
    letterSpacing: 1.5, 
    marginBottom: 5 
  },
  input: { 
    paddingVertical: 12, 
    fontSize: 15, 
    color: '#000' 
  },
  btn: { 
    backgroundColor: '#000', 
    paddingVertical: 18, 
    alignItems: 'center', 
    marginTop: 20 
  },
  btnText: { 
    color: '#fff', 
    fontWeight: '900', 
    fontSize: 13, 
    letterSpacing: 2 
  },
  footer: { 
    position: 'absolute', 
    bottom: 40, 
    alignSelf: 'center' 
  },
  footerText: { 
    fontSize: 9, 
    color: '#CCC', 
    letterSpacing: 1 
  }
});
