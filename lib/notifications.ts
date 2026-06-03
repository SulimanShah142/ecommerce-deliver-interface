import { OneSignal } from 'react-native-onesignal';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ONESIGNAL_APP_ID = "32271ebd-e2b6-4562-b765-dd50eb88b966";
const PUSH_SUBSCRIPTION_KEY = 'deliverer_push_subscription_id';

export const initOneSignal = async () => {
  try {
    OneSignal.initialize(ONESIGNAL_APP_ID);

    if (Platform.OS === 'android') {
      console.log("🛰️ Triggering Native OneSignal Android Permission Prompt...");
      const accepted = await OneSignal.Notifications.requestPermission(true);
      console.log("🔔 OneSignal Permission State Checked:", accepted);
    } else {
      await OneSignal.Notifications.requestPermission(true);
    }

    const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    console.log("🔑 OneSignal push subscription ID:", subscriptionId);

    if (subscriptionId) {
      await SecureStore.setItemAsync(PUSH_SUBSCRIPTION_KEY, subscriptionId);
    }

    return subscriptionId;
  } catch (error) {
    console.error("❌ OneSignal Native Boot Failure:", error);
    return null;
  }
};

export const registerOneSignalUser = async (delivererId: string) => {
  try {
    if (!delivererId) return;

    if (typeof OneSignal.setExternalUserId === 'function') {
      OneSignal.setExternalUserId(delivererId);
    } else if (typeof OneSignal.login === 'function') {
      OneSignal.login(delivererId);
    }

    const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    if (subscriptionId) {
      await SecureStore.setItemAsync(PUSH_SUBSCRIPTION_KEY, subscriptionId);
      console.log(`📲 OneSignal registered deliverer ${delivererId} with subscription ${subscriptionId}`);
    }
  } catch (error) {
    console.error("❌ OneSignal user registration failed:", error);
  }
};
