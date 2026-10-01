import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(driverId: string) {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device.");
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    console.warn("Push notification permission was not granted.");
    return null;
  }

  const token = await Notifications.getDevicePushTokenAsync();

  await setDoc(
    doc(db, "drivers", driverId),
    {
      pushToken: token.data,
      pushTokenPlatform: Platform.OS,
      pushTokenUpdatedAt: new Date(),
    },
    { merge: true }
  );

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("delivery-offers", {
      name: "Ofertas de entrega",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }

  return token.data;
}

export function addNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void
) {
  const received = Notifications.addNotificationReceivedListener((notification) => {
    onReceived?.(notification);
  });

  const response = Notifications.addNotificationResponseReceivedListener((notificationResponse) => {
    onResponse?.(notificationResponse);
  });

  return () => {
    received.remove();
    response.remove();
  };
}
