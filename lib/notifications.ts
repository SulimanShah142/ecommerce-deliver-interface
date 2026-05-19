import { OneSignal, LogLevel } from 'react-native-onesignal';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ONESIGNAL_APP_ID ="32271ebd-e2b6-4562-b765-dd50eb88b966"

export const initOneSignal = async () => {
  try {
    // 1. Initialize with your specific App ID
    OneSignal.initialize("32271ebd-e2b6-4562-b765-dd50eb88b966"); // Use Admin or Deliver App ID

    // 2. CRITICAL FIX FOR ANDROID 13+: Explicitly force OneSignal to handle the permission prompt
    if (Platform.OS === 'android') {
      console.log("🛰️ Triggering Native OneSignal Android Permission Prompt...");
      
      // This forces the OneSignal SDK to register the user's click directly
      const accepted = await OneSignal.Notifications.requestPermission(true);
      console.log("🔔 OneSignal Permission State Checked:", accepted);
    } else {
      // iOS handling
      OneSignal.Notifications.requestPermission(true);
    }

    // 3. Capture and log the structural Subscription ID
    const subId = await OneSignal.User.pushSubscription.getIdAsync();
    console.log("🔑 Active Linked Hardware ID:", subId);

  } catch (error) {
    console.error("❌ OneSignal Native Boot Failure:", error);
  }
};
